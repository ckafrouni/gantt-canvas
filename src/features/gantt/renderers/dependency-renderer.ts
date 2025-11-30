import type { Task, TaskDependency, ViewportState, VirtualRow, TaskId } from "../types";
import { clearCanvas, drawOrthogonalArrow } from "../utils/canvas-utils";
import { getIndexManager } from "../indexes/index-manager";

/** Dependency rendering constants */
const ARROW_COLOR = "#94a3b8"; // slate-400
const ARROW_COLOR_SELECTED = "#fbbf24"; // amber-400
const ARROW_COLOR_HIGHLIGHTED = "#60a5fa"; // blue-400
const ARROW_LINE_WIDTH = 1.5;
const ARROW_SIZE = 6;

/**
 * Renders dependency arrows between tasks
 */
export class DependencyRenderer {
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
	 * Render all visible dependencies
	 */
	render(
		viewport: ViewportState,
		tasks: Record<string, Task>,
		dependencies: TaskDependency[],
		visibleRows: VirtualRow[],
		selectedTaskIds: Set<TaskId>,
		highlightedDependencyIds: Set<string> = new Set(),
	): void {
		if (!this.ctx) return;

		const ctx = this.ctx;
		clearCanvas(ctx, this.width, this.height);

		const indexManager = getIndexManager();

		// Create set of visible resource IDs
		const visibleResourceIds = new Set<string>();
		for (const row of visibleRows) {
			if (row.resourceId) {
				visibleResourceIds.add(row.resourceId);
			}
		}

		// Get visible time range (with buffer for arrows)
		const bufferHours = 2;
		const visibleStartTime =
			viewport.timeOrigin +
			(viewport.scrollX / viewport.pixelsPerHour - bufferHours) * 3600000;
		const visibleEndTime =
			visibleStartTime +
			(this.width / viewport.pixelsPerHour + bufferHours * 2) * 3600000;

		// Filter dependencies where at least one task is visible
		const visibleDependencies = dependencies.filter((dep) => {
			const predecessor = tasks[dep.predecessorId];
			const successor = tasks[dep.successorId];

			if (!predecessor || !successor) return false;

			// Check if either task is in visible time range
			const predVisible =
				predecessor._endTime >= visibleStartTime &&
				predecessor.startTime <= visibleEndTime;
			const succVisible =
				successor._endTime >= visibleStartTime &&
				successor.startTime <= visibleEndTime;

			if (!predVisible && !succVisible) return false;

			// Check if either task's resource is visible
			const predResourceVisible = visibleResourceIds.has(predecessor.resourceId);
			const succResourceVisible = visibleResourceIds.has(successor.resourceId);

			return predResourceVisible || succResourceVisible;
		});

		// Sort dependencies: render non-selected first, then selected
		const sortedDependencies = [...visibleDependencies].sort((a, b) => {
			const aSelected =
				selectedTaskIds.has(a.predecessorId) ||
				selectedTaskIds.has(a.successorId);
			const bSelected =
				selectedTaskIds.has(b.predecessorId) ||
				selectedTaskIds.has(b.successorId);
			return aSelected === bSelected ? 0 : aSelected ? 1 : -1;
		});

		// Render each dependency
		for (const dep of sortedDependencies) {
			const predecessor = tasks[dep.predecessorId];
			const successor = tasks[dep.successorId];

			const isSelected =
				selectedTaskIds.has(dep.predecessorId) ||
				selectedTaskIds.has(dep.successorId);
			const isHighlighted = highlightedDependencyIds.has(dep.id);

			this.renderDependency(
				ctx,
				dep,
				predecessor,
				successor,
				viewport,
				indexManager,
				isSelected,
				isHighlighted,
			);
		}
	}

	/**
	 * Render a single dependency arrow
	 */
	private renderDependency(
		ctx: CanvasRenderingContext2D,
		dep: TaskDependency,
		predecessor: Task,
		successor: Task,
		viewport: ViewportState,
		indexManager: ReturnType<typeof getIndexManager>,
		isSelected: boolean,
		isHighlighted: boolean,
	): void {
		// Get rows for both tasks
		const predRow = indexManager.getRowForResource(predecessor.resourceId);
		const succRow = indexManager.getRowForResource(successor.resourceId);

		if (!predRow || !succRow) return;

		// Calculate positions based on dependency type
		const { fromX, fromY, toX, toY } = this.calculateArrowPositions(
			dep,
			predecessor,
			successor,
			predRow,
			succRow,
			viewport,
		);

		// Determine color
		let color = ARROW_COLOR;
		if (isHighlighted) {
			color = ARROW_COLOR_HIGHLIGHTED;
		} else if (isSelected) {
			color = ARROW_COLOR_SELECTED;
		}

		// Draw the arrow
		drawOrthogonalArrow(
			ctx,
			fromX,
			fromY,
			toX,
			toY,
			color,
			isSelected || isHighlighted ? 2 : ARROW_LINE_WIDTH,
			ARROW_SIZE,
		);
	}

	/**
	 * Calculate arrow start and end positions based on dependency type
	 */
	private calculateArrowPositions(
		dep: TaskDependency,
		predecessor: Task,
		successor: Task,
		predRow: VirtualRow,
		succRow: VirtualRow,
		viewport: ViewportState,
	): { fromX: number; fromY: number; toX: number; toY: number } {
		const predY = predRow.virtualY - viewport.scrollY + predRow.height / 2;
		const succY = succRow.virtualY - viewport.scrollY + succRow.height / 2;

		let fromX: number;
		let toX: number;

		switch (dep.type) {
			case "FS": // Finish-to-Start (most common)
				fromX = this.timeToX(predecessor._endTime, viewport);
				toX = this.timeToX(successor.startTime, viewport);
				break;
			case "FF": // Finish-to-Finish
				fromX = this.timeToX(predecessor._endTime, viewport);
				toX = this.timeToX(successor._endTime, viewport);
				break;
			case "SS": // Start-to-Start
				fromX = this.timeToX(predecessor.startTime, viewport);
				toX = this.timeToX(successor.startTime, viewport);
				break;
			case "SF": // Start-to-Finish
				fromX = this.timeToX(predecessor.startTime, viewport);
				toX = this.timeToX(successor._endTime, viewport);
				break;
			default:
				fromX = this.timeToX(predecessor._endTime, viewport);
				toX = this.timeToX(successor.startTime, viewport);
		}

		return { fromX, fromY: predY, toX, toY: succY };
	}

	/**
	 * Convert timestamp to X coordinate
	 */
	private timeToX(timestamp: number, viewport: ViewportState): number {
		const hoursFromOrigin = (timestamp - viewport.timeOrigin) / 3600000;
		return hoursFromOrigin * viewport.pixelsPerHour - viewport.scrollX;
	}
}

// Singleton
let dependencyRendererInstance: DependencyRenderer | null = null;

export function getDependencyRenderer(): DependencyRenderer {
	if (!dependencyRendererInstance) {
		dependencyRendererInstance = new DependencyRenderer();
	}
	return dependencyRendererInstance;
}
