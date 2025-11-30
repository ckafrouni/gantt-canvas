import RBush from "rbush";
import type { TaskId, TaskBounds, Task, VirtualRow } from "../types";

/** RBush item type */
interface RBushItem {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
	taskId: TaskId;
}

/**
 * Spatial index for fast task hit detection using R-tree
 * Provides O(log n) query time for 10k+ tasks
 */
export class SpatialIndex {
	private tree: RBush<RBushItem>;
	private taskBoundsMap: Map<TaskId, TaskBounds>;

	constructor() {
		// 16 entries per node is optimal for ~10k items
		this.tree = new RBush(16);
		this.taskBoundsMap = new Map();
	}

	/**
	 * Rebuild the entire index from tasks and rows
	 * Call this when tasks change or rows are re-calculated
	 */
	rebuild(tasks: Task[], virtualRows: VirtualRow[]): void {
		this.tree.clear();
		this.taskBoundsMap.clear();

		// Create resource ID to row mapping
		const rowByResource = new Map<string, VirtualRow>();
		for (const row of virtualRows) {
			if (row.resourceId) {
				rowByResource.set(row.resourceId, row);
			}
		}

		// Build bounds for each task
		const items: RBushItem[] = [];

		for (const task of tasks) {
			const row = rowByResource.get(task.resourceId);
			if (!row) continue;

			const bounds: TaskBounds = {
				minX: task.startTime,
				minY: row.virtualY,
				maxX: task._endTime,
				maxY: row.virtualY + row.height,
				taskId: task.id,
			};

			this.taskBoundsMap.set(task.id, bounds);

			items.push({
				minX: bounds.minX,
				minY: bounds.minY,
				maxX: bounds.maxX,
				maxY: bounds.maxY,
				taskId: task.id,
			});
		}

		// Bulk load is O(n) - much faster than individual inserts
		this.tree.load(items);
	}

	/**
	 * Query for tasks at a specific point (hit detection)
	 */
	queryPoint(timestamp: number, virtualY: number): TaskId[] {
		const results = this.tree.search({
			minX: timestamp,
			minY: virtualY,
			maxX: timestamp,
			maxY: virtualY,
		});
		return results.map((r) => r.taskId);
	}

	/**
	 * Query for tasks in a rectangular area (selection box)
	 */
	queryRect(
		minX: number,
		minY: number,
		maxX: number,
		maxY: number,
	): TaskId[] {
		const results = this.tree.search({ minX, minY, maxX, maxY });
		return results.map((r) => r.taskId);
	}

	/**
	 * Query for tasks in a time range (viewport culling)
	 */
	queryTimeRange(startTime: number, endTime: number): TaskId[] {
		// Use a very large Y range to get all tasks in time range
		const results = this.tree.search({
			minX: startTime,
			minY: -Infinity,
			maxX: endTime,
			maxY: Infinity,
		});
		return results.map((r) => r.taskId);
	}

	/**
	 * Get bounds for a specific task
	 */
	getTaskBounds(taskId: TaskId): TaskBounds | undefined {
		return this.taskBoundsMap.get(taskId);
	}

	/**
	 * Check if the index has any items
	 */
	isEmpty(): boolean {
		return this.taskBoundsMap.size === 0;
	}

	/**
	 * Get the number of indexed tasks
	 */
	size(): number {
		return this.taskBoundsMap.size;
	}

	/**
	 * Clear the index
	 */
	clear(): void {
		this.tree.clear();
		this.taskBoundsMap.clear();
	}
}

// Singleton instance for the gantt chart
let spatialIndexInstance: SpatialIndex | null = null;

export function getSpatialIndex(): SpatialIndex {
	if (!spatialIndexInstance) {
		spatialIndexInstance = new SpatialIndex();
	}
	return spatialIndexInstance;
}

export function resetSpatialIndex(): void {
	spatialIndexInstance = null;
}
