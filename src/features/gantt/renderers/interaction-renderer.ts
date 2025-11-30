import type { Task, ViewportState, VirtualRow, DragState } from "../types";
import {
	clearCanvas,
	fillRoundRect,
	strokeRoundRect,
	drawDashedLine,
	hexToRgba,
} from "../utils/canvas-utils";
import { getIndexManager } from "../indexes/index-manager";

/** Interaction rendering constants */
const COLORS = {
	dragPreview: "rgba(59, 130, 246, 0.5)", // blue-500 with opacity
	dragPreviewBorder: "#3b82f6",
	dropZoneValid: "rgba(34, 197, 94, 0.2)", // green-500 with opacity
	dropZoneInvalid: "rgba(239, 68, 68, 0.2)", // red-500 with opacity
	selectionBox: "rgba(59, 130, 246, 0.2)",
	selectionBoxBorder: "#3b82f6",
	snapLine: "#fbbf24", // amber-400
	conflictHighlight: "rgba(239, 68, 68, 0.3)",
};

const TASK_HEIGHT_RATIO = 0.7;
const TASK_BORDER_RADIUS = 4;

/**
 * Renders interaction elements (drag preview, selection box, etc.)
 */
export class InteractionRenderer {
	private ctx: CanvasRenderingContext2D | null = null;
	private width = 0;
	private height = 0;

	/**
	 * Set the canvas context
	 */
	setContext(ctx: CanvasRenderingContext2D, width: number, height: number): void {
		this.ctx = ctx;
		this.width = width;
		this.height = height;
	}

	/**
	 * Render interaction elements
	 */
	render(
		viewport: ViewportState,
		dragState: DragState | null,
		selectionBox: { startX: number; startY: number; endX: number; endY: number } | null,
		tasks: Record<string, Task>,
	): void {
		if (!this.ctx) return;

		const ctx = this.ctx;
		clearCanvas(ctx, this.width, this.height);

		// Render selection box
		if (selectionBox) {
			this.renderSelectionBox(ctx, selectionBox);
		}

		// Render drag preview
		if (dragState) {
			this.renderDragPreview(ctx, dragState, viewport, tasks);
		}
	}

	/**
	 * Render selection box (rubber band selection)
	 */
	private renderSelectionBox(
		ctx: CanvasRenderingContext2D,
		box: { startX: number; startY: number; endX: number; endY: number },
	): void {
		const x = Math.min(box.startX, box.endX);
		const y = Math.min(box.startY, box.endY);
		const width = Math.abs(box.endX - box.startX);
		const height = Math.abs(box.endY - box.startY);

		// Fill
		ctx.fillStyle = COLORS.selectionBox;
		ctx.fillRect(x, y, width, height);

		// Border
		ctx.strokeStyle = COLORS.selectionBoxBorder;
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);
		ctx.strokeRect(x, y, width, height);
		ctx.setLineDash([]);
	}

	/**
	 * Render drag preview
	 */
	private renderDragPreview(
		ctx: CanvasRenderingContext2D,
		dragState: DragState,
		viewport: ViewportState,
		tasks: Record<string, Task>,
	): void {
		const indexManager = getIndexManager();

		// Get the original task
		const task = dragState.originalTask;

		// Calculate preview position
		const previewX = this.timeToX(dragState.previewStartTime, viewport);
		const previewWidth = this.durationToWidth(
			dragState.previewEndTime - dragState.previewStartTime,
			viewport,
		);

		// Get row for preview
		const row = indexManager.getRowForResource(dragState.previewResourceId);
		if (!row) return;

		const previewY = row.virtualY - viewport.scrollY;
		const taskHeight = row.height * TASK_HEIGHT_RATIO;
		const taskY = previewY + (row.height - taskHeight) / 2;

		// Render drop zone highlight on the row
		if (dragState.type === "reassign" || dragState.type === "move") {
			const hasCollisions = dragState.collisions.length > 0;
			ctx.fillStyle = hasCollisions ? COLORS.dropZoneInvalid : COLORS.dropZoneValid;
			ctx.fillRect(0, previewY, this.width, row.height);
		}

		// Render collision highlights
		for (const collisionId of dragState.collisions) {
			const collidingTask = tasks[collisionId];
			if (!collidingTask) continue;

			const colRow = indexManager.getRowForResource(collidingTask.resourceId);
			if (!colRow) continue;

			const colX = this.timeToX(collidingTask.startTime, viewport);
			const colWidth = this.durationToWidth(
				collidingTask._endTime - collidingTask.startTime,
				viewport,
			);
			const colY = colRow.virtualY - viewport.scrollY;
			const colTaskY = colY + (colRow.height - taskHeight) / 2;

			ctx.fillStyle = COLORS.conflictHighlight;
			fillRoundRect(ctx, colX, colTaskY, colWidth, taskHeight, TASK_BORDER_RADIUS, COLORS.conflictHighlight);
		}

		// Render snap lines
		if (dragState.type === "move" || dragState.type === "resize-start" || dragState.type === "resize-end") {
			this.renderSnapLines(ctx, dragState, viewport);
		}

		// Render the task preview (ghost)
		const color = task.color ?? "#3b82f6";
		ctx.globalAlpha = 0.7;
		fillRoundRect(ctx, previewX, taskY, previewWidth, taskHeight, TASK_BORDER_RADIUS, color);
		ctx.globalAlpha = 1;

		// Preview border
		strokeRoundRect(
			ctx,
			previewX,
			taskY,
			previewWidth,
			taskHeight,
			TASK_BORDER_RADIUS,
			COLORS.dragPreviewBorder,
			2,
		);

		// Render original position outline (if moved)
		if (
			dragState.previewStartTime !== task.startTime ||
			dragState.previewResourceId !== task.resourceId
		) {
			const originalRow = indexManager.getRowForResource(task.resourceId);
			if (originalRow) {
				const originalX = this.timeToX(task.startTime, viewport);
				const originalWidth = this.durationToWidth(
					task._endTime - task.startTime,
					viewport,
				);
				const originalY = originalRow.virtualY - viewport.scrollY;
				const originalTaskY = originalY + (originalRow.height - taskHeight) / 2;

				ctx.setLineDash([4, 4]);
				strokeRoundRect(
					ctx,
					originalX,
					originalTaskY,
					originalWidth,
					taskHeight,
					TASK_BORDER_RADIUS,
					"#64748b",
					1,
				);
				ctx.setLineDash([]);
			}
		}

		// Render time tooltip
		this.renderTimeTooltip(ctx, dragState, previewX, taskY, previewWidth);
	}

	/**
	 * Render snap lines
	 */
	private renderSnapLines(
		ctx: CanvasRenderingContext2D,
		dragState: DragState,
		viewport: ViewportState,
	): void {
		// Get snap interval
		const snapInterval = this.getSnapInterval(viewport.zoomLevel);
		const snappedStart = Math.round(dragState.previewStartTime / snapInterval) * snapInterval;
		const snappedEnd = Math.round(dragState.previewEndTime / snapInterval) * snapInterval;

		// Draw snap line at start
		if (dragState.type === "move" || dragState.type === "resize-start") {
			const snapX = this.timeToX(snappedStart, viewport);
			drawDashedLine(ctx, snapX, 0, snapX, this.height, COLORS.snapLine, 1, [4, 4]);
		}

		// Draw snap line at end
		if (dragState.type === "move" || dragState.type === "resize-end") {
			const snapX = this.timeToX(snappedEnd, viewport);
			drawDashedLine(ctx, snapX, 0, snapX, this.height, COLORS.snapLine, 1, [4, 4]);
		}
	}

	/**
	 * Render time tooltip during drag
	 */
	private renderTimeTooltip(
		ctx: CanvasRenderingContext2D,
		dragState: DragState,
		taskX: number,
		taskY: number,
		taskWidth: number,
	): void {
		const startDate = new Date(dragState.previewStartTime);
		const endDate = new Date(dragState.previewEndTime);

		const formatTime = (d: Date) =>
			`${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

		const text =
			dragState.type === "resize-end"
				? formatTime(endDate)
				: formatTime(startDate);

		// Tooltip position
		const tooltipX = dragState.type === "resize-end" ? taskX + taskWidth : taskX;
		const tooltipY = taskY - 24;

		// Measure text
		ctx.font = "11px Inter, system-ui, sans-serif";
		const metrics = ctx.measureText(text);
		const padding = 6;
		const tooltipWidth = metrics.width + padding * 2;
		const tooltipHeight = 20;

		// Adjust position to stay in bounds
		let finalX = tooltipX - tooltipWidth / 2;
		finalX = Math.max(4, Math.min(this.width - tooltipWidth - 4, finalX));

		// Draw tooltip background
		ctx.fillStyle = "#1e293b";
		fillRoundRect(ctx, finalX, tooltipY, tooltipWidth, tooltipHeight, 4, "#1e293b");

		// Draw tooltip text
		ctx.fillStyle = "#f8fafc";
		ctx.textBaseline = "middle";
		ctx.fillText(text, finalX + padding, tooltipY + tooltipHeight / 2);
	}

	/**
	 * Get snap interval in ms based on zoom level
	 */
	private getSnapInterval(zoomLevel: string): number {
		switch (zoomLevel) {
			case "hour":
				return 15 * 60 * 1000; // 15 minutes
			case "day":
				return 60 * 60 * 1000; // 1 hour
			case "week":
				return 6 * 60 * 60 * 1000; // 6 hours
			case "month":
				return 24 * 60 * 60 * 1000; // 1 day
			default:
				return 60 * 60 * 1000;
		}
	}

	/**
	 * Convert timestamp to X coordinate
	 */
	private timeToX(timestamp: number, viewport: ViewportState): number {
		const hoursFromOrigin = (timestamp - viewport.timeOrigin) / 3600000;
		return hoursFromOrigin * viewport.pixelsPerHour - viewport.scrollX;
	}

	/**
	 * Convert duration to width
	 */
	private durationToWidth(durationMs: number, viewport: ViewportState): number {
		const hours = durationMs / 3600000;
		return hours * viewport.pixelsPerHour;
	}
}

// Singleton
let interactionRendererInstance: InteractionRenderer | null = null;

export function getInteractionRenderer(): InteractionRenderer {
	if (!interactionRendererInstance) {
		interactionRendererInstance = new InteractionRenderer();
	}
	return interactionRendererInstance;
}
