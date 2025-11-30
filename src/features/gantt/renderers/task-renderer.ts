import type { Task, ViewportState, VirtualRow, TaskId } from "../types";
import {
	clearCanvas,
	fillRoundRect,
	strokeRoundRect,
	drawTruncatedText,
	hexToRgba,
} from "../utils/canvas-utils";
import { getPhaseRanges, PHASE_COLORS } from "../utils/task-utils";
import { getIndexManager } from "../indexes/index-manager";

/** Task rendering constants */
const TASK_HEIGHT_RATIO = 0.7; // Task height as ratio of row height
const TASK_PADDING = 4;
const TASK_BORDER_RADIUS = 4;
const TASK_FONT = "12px Inter, system-ui, sans-serif";
const TASK_FONT_BOLD = "600 12px Inter, system-ui, sans-serif";
const MIN_TASK_WIDTH_FOR_TEXT = 40;
const MIN_TASK_WIDTH_FOR_PHASES = 60;

/** Colors */
const COLORS = {
	taskDefault: "#3b82f6", // blue-500
	taskText: "#ffffff",
	taskTextDark: "#1e293b",
	selectedBorder: "#fbbf24", // amber-400
	hoveredBorder: "#60a5fa", // blue-400
	progressBackground: "rgba(255, 255, 255, 0.3)",
	progressForeground: "rgba(255, 255, 255, 0.5)",
};

/**
 * Renders tasks on the canvas
 */
export class TaskRenderer {
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
	 * Render all visible tasks
	 */
	render(
		viewport: ViewportState,
		tasks: Record<string, Task>,
		visibleRows: VirtualRow[],
		selectedTaskIds: Set<TaskId>,
		hoveredTaskId: TaskId | null,
	): void {
		if (!this.ctx) return;

		const ctx = this.ctx;
		clearCanvas(ctx, this.width, this.height);

		const indexManager = getIndexManager();

		// Get visible time range
		const visibleStartTime =
			viewport.timeOrigin + (viewport.scrollX / viewport.pixelsPerHour) * 3600000;
		const visibleEndTime =
			visibleStartTime + (this.width / viewport.pixelsPerHour) * 3600000;

		// Create set of visible resource IDs
		const visibleResourceIds = new Set<string>();
		for (const row of visibleRows) {
			if (row.resourceId) {
				visibleResourceIds.add(row.resourceId);
			}
		}

		// Query tasks in visible time range
		const visibleTaskIds = indexManager.queryTimeRange(
			visibleStartTime,
			visibleEndTime,
		);

		// Filter and render tasks
		for (const taskId of visibleTaskIds) {
			const task = tasks[taskId];
			if (!task) continue;

			// Check if task's resource is visible
			if (!visibleResourceIds.has(task.resourceId)) continue;

			// Get row for this task
			const row = indexManager.getRowForResource(task.resourceId);
			if (!row) continue;

			// Calculate task position
			const taskY = row.virtualY - viewport.scrollY;

			// Skip if row is not visible
			if (taskY + row.height < 0 || taskY > this.height) continue;

			// Render the task
			this.renderTask(
				ctx,
				task,
				viewport,
				row,
				selectedTaskIds.has(task.id),
				hoveredTaskId === task.id,
			);
		}
	}

	/**
	 * Render a single task
	 */
	private renderTask(
		ctx: CanvasRenderingContext2D,
		task: Task,
		viewport: ViewportState,
		row: VirtualRow,
		isSelected: boolean,
		isHovered: boolean,
	): void {
		// Calculate position
		const x = this.timeToX(task.startTime, viewport);
		const width = this.durationToWidth(task._endTime - task.startTime, viewport);
		const y = row.virtualY - viewport.scrollY;

		// Calculate task rectangle
		const taskHeight = row.height * TASK_HEIGHT_RATIO;
		const taskY = y + (row.height - taskHeight) / 2;

		// Skip if too narrow
		if (width < 2) return;

		// Determine if we should show phases
		const showPhases = width >= MIN_TASK_WIDTH_FOR_PHASES && task.phases.length > 1;

		if (showPhases) {
			this.renderTaskWithPhases(ctx, task, x, taskY, width, taskHeight, viewport);
		} else {
			this.renderSimpleTask(ctx, task, x, taskY, width, taskHeight);
		}

		// Render selection/hover border
		if (isSelected) {
			strokeRoundRect(
				ctx,
				x,
				taskY,
				width,
				taskHeight,
				TASK_BORDER_RADIUS,
				COLORS.selectedBorder,
				2,
			);
		} else if (isHovered) {
			strokeRoundRect(
				ctx,
				x,
				taskY,
				width,
				taskHeight,
				TASK_BORDER_RADIUS,
				COLORS.hoveredBorder,
				2,
			);
		}

		// Render progress indicator
		if (task.progress > 0 && task.progress < 100) {
			this.renderProgress(ctx, x, taskY, width, taskHeight, task.progress);
		}

		// Render task name
		if (width >= MIN_TASK_WIDTH_FOR_TEXT) {
			this.renderTaskLabel(ctx, task.name, x, taskY, width, taskHeight);
		}

		// Render resize handles if hovered
		if (isHovered) {
			this.renderResizeHandles(ctx, x, taskY, width, taskHeight);
		}
	}

	/**
	 * Render a simple task (single color)
	 */
	private renderSimpleTask(
		ctx: CanvasRenderingContext2D,
		task: Task,
		x: number,
		y: number,
		width: number,
		height: number,
	): void {
		const color = task.color ?? COLORS.taskDefault;
		fillRoundRect(ctx, x, y, width, height, TASK_BORDER_RADIUS, color);
	}

	/**
	 * Render a task with phase segments
	 */
	private renderTaskWithPhases(
		ctx: CanvasRenderingContext2D,
		task: Task,
		startX: number,
		y: number,
		totalWidth: number,
		height: number,
		viewport: ViewportState,
	): void {
		const phases = getPhaseRanges(task);
		const taskDuration = task._endTime - task.startTime;

		let currentX = startX;

		for (let i = 0; i < phases.length; i++) {
			const phase = phases[i];
			const phaseDuration = phase.end - phase.start;
			const phaseWidth = (phaseDuration / taskDuration) * totalWidth;

			const color = phase.color ?? PHASE_COLORS[phase.type];

			// Determine corner radius based on position
			const isFirst = i === 0;
			const isLast = i === phases.length - 1;

			if (isFirst && isLast) {
				fillRoundRect(ctx, currentX, y, phaseWidth, height, TASK_BORDER_RADIUS, color);
			} else if (isFirst) {
				// Round left corners only
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.moveTo(currentX + TASK_BORDER_RADIUS, y);
				ctx.lineTo(currentX + phaseWidth, y);
				ctx.lineTo(currentX + phaseWidth, y + height);
				ctx.lineTo(currentX + TASK_BORDER_RADIUS, y + height);
				ctx.arcTo(currentX, y + height, currentX, y, TASK_BORDER_RADIUS);
				ctx.lineTo(currentX, y + TASK_BORDER_RADIUS);
				ctx.arcTo(currentX, y, currentX + TASK_BORDER_RADIUS, y, TASK_BORDER_RADIUS);
				ctx.fill();
			} else if (isLast) {
				// Round right corners only
				ctx.fillStyle = color;
				ctx.beginPath();
				ctx.moveTo(currentX, y);
				ctx.lineTo(currentX + phaseWidth - TASK_BORDER_RADIUS, y);
				ctx.arcTo(currentX + phaseWidth, y, currentX + phaseWidth, y + TASK_BORDER_RADIUS, TASK_BORDER_RADIUS);
				ctx.lineTo(currentX + phaseWidth, y + height - TASK_BORDER_RADIUS);
				ctx.arcTo(currentX + phaseWidth, y + height, currentX + phaseWidth - TASK_BORDER_RADIUS, y + height, TASK_BORDER_RADIUS);
				ctx.lineTo(currentX, y + height);
				ctx.closePath();
				ctx.fill();
			} else {
				// No rounded corners
				ctx.fillStyle = color;
				ctx.fillRect(currentX, y, phaseWidth, height);
			}

			currentX += phaseWidth;
		}
	}

	/**
	 * Render progress indicator
	 */
	private renderProgress(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
		progress: number,
	): void {
		const progressHeight = 3;
		const progressY = y + height - progressHeight - 2;
		const progressWidth = (width - 4) * (progress / 100);

		// Background
		ctx.fillStyle = COLORS.progressBackground;
		fillRoundRect(ctx, x + 2, progressY, width - 4, progressHeight, 1, COLORS.progressBackground);

		// Progress bar
		ctx.fillStyle = COLORS.progressForeground;
		fillRoundRect(ctx, x + 2, progressY, progressWidth, progressHeight, 1, COLORS.progressForeground);
	}

	/**
	 * Render task label
	 */
	private renderTaskLabel(
		ctx: CanvasRenderingContext2D,
		name: string,
		x: number,
		y: number,
		width: number,
		height: number,
	): void {
		const padding = 6;
		const maxWidth = width - padding * 2;

		if (maxWidth <= 0) return;

		drawTruncatedText(
			ctx,
			name,
			x + padding,
			y + height / 2,
			maxWidth,
			COLORS.taskText,
			TASK_FONT,
		);
	}

	/**
	 * Render resize handles
	 */
	private renderResizeHandles(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		width: number,
		height: number,
	): void {
		const handleWidth = 4;
		const handleHeight = height * 0.6;
		const handleY = y + (height - handleHeight) / 2;

		ctx.fillStyle = "rgba(255, 255, 255, 0.5)";

		// Left handle
		fillRoundRect(ctx, x + 2, handleY, handleWidth, handleHeight, 2, "rgba(255, 255, 255, 0.5)");

		// Right handle
		fillRoundRect(ctx, x + width - handleWidth - 2, handleY, handleWidth, handleHeight, 2, "rgba(255, 255, 255, 0.5)");
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
let taskRendererInstance: TaskRenderer | null = null;

export function getTaskRenderer(): TaskRenderer {
	if (!taskRendererInstance) {
		taskRendererInstance = new TaskRenderer();
	}
	return taskRendererInstance;
}
