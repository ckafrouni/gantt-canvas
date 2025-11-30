import type {
  Task,
  TaskId,
  TaskDependency,
  DependencyId,
  ResourceId,
  OrderId,
  VirtualRow,
} from "../types";
import { SpatialIndex } from "./spatial-index";

/**
 * Centralized index manager for fast queries across the Gantt chart
 * Maintains multiple indexes for different query patterns
 */
export class IndexManager {
  // Spatial index for hit detection (R-tree)
  private spatialIndex: SpatialIndex;

  // Resource to tasks mapping (O(1) lookup)
  private resourceTasksIndex: Map<ResourceId, Set<TaskId>>;

  // Order to tasks mapping
  private orderTasksIndex: Map<OrderId, Set<TaskId>>;

  // Dependency graph (adjacency lists)
  private predecessorIndex: Map<TaskId, Set<TaskId>>;
  private successorIndex: Map<TaskId, Set<TaskId>>;

  // Dependency details
  private dependencyMap: Map<DependencyId, TaskDependency>;
  private taskDependenciesIndex: Map<TaskId, Set<DependencyId>>;

  // Virtual rows cache
  private virtualRows: VirtualRow[];
  private rowByResourceId: Map<ResourceId, VirtualRow>;

  constructor() {
    this.spatialIndex = new SpatialIndex();
    this.resourceTasksIndex = new Map();
    this.orderTasksIndex = new Map();
    this.predecessorIndex = new Map();
    this.successorIndex = new Map();
    this.dependencyMap = new Map();
    this.taskDependenciesIndex = new Map();
    this.virtualRows = [];
    this.rowByResourceId = new Map();
  }

  /**
   * Build all indexes from tasks and dependencies
   */
  buildIndexes(
    tasks: Task[],
    dependencies: TaskDependency[],
    virtualRows: VirtualRow[],
  ): void {
    // Store virtual rows
    this.virtualRows = virtualRows;
    this.rowByResourceId.clear();
    for (const row of virtualRows) {
      if (row.resourceId) {
        this.rowByResourceId.set(row.resourceId, row);
      }
    }

    // Clear existing indexes
    this.resourceTasksIndex.clear();
    this.orderTasksIndex.clear();
    this.predecessorIndex.clear();
    this.successorIndex.clear();
    this.dependencyMap.clear();
    this.taskDependenciesIndex.clear();

    // Build resource and order indexes
    for (const task of tasks) {
      // Resource index
      if (!this.resourceTasksIndex.has(task.resourceId)) {
        this.resourceTasksIndex.set(task.resourceId, new Set());
      }
      this.resourceTasksIndex.get(task.resourceId)?.add(task.id);

      // Order index
      if (!this.orderTasksIndex.has(task.orderId)) {
        this.orderTasksIndex.set(task.orderId, new Set());
      }
      this.orderTasksIndex.get(task.orderId)?.add(task.id);
    }

    // Build dependency graph
    for (const dep of dependencies) {
      this.dependencyMap.set(dep.id, dep);

      // Predecessor index (successorId -> predecessorIds)
      if (!this.predecessorIndex.has(dep.successorId)) {
        this.predecessorIndex.set(dep.successorId, new Set());
      }
      this.predecessorIndex.get(dep.successorId)?.add(dep.predecessorId);

      // Successor index (predecessorId -> successorIds)
      if (!this.successorIndex.has(dep.predecessorId)) {
        this.successorIndex.set(dep.predecessorId, new Set());
      }
      this.successorIndex.get(dep.predecessorId)?.add(dep.successorId);

      // Task dependencies index
      for (const taskId of [dep.predecessorId, dep.successorId]) {
        if (!this.taskDependenciesIndex.has(taskId)) {
          this.taskDependenciesIndex.set(taskId, new Set());
        }
        this.taskDependenciesIndex.get(taskId)?.add(dep.id);
      }
    }

    // Build spatial index
    this.spatialIndex.rebuild(tasks, virtualRows);
  }

  /**
   * Update spatial index when rows change (collapse/expand)
   */
  updateVirtualRows(tasks: Task[], virtualRows: VirtualRow[]): void {
    this.virtualRows = virtualRows;
    this.rowByResourceId.clear();
    for (const row of virtualRows) {
      if (row.resourceId) {
        this.rowByResourceId.set(row.resourceId, row);
      }
    }
    this.spatialIndex.rebuild(tasks, virtualRows);
  }

  // ============ SPATIAL QUERIES ============

  /**
   * Query for tasks at a point (hit detection)
   */
  queryPoint(timestamp: number, virtualY: number): TaskId[] {
    return this.spatialIndex.queryPoint(timestamp, virtualY);
  }

  /**
   * Query for tasks in a rectangle (selection box)
   */
  queryRect(minX: number, minY: number, maxX: number, maxY: number): TaskId[] {
    return this.spatialIndex.queryRect(minX, minY, maxX, maxY);
  }

  /**
   * Query for tasks in a time range
   */
  queryTimeRange(startTime: number, endTime: number): TaskId[] {
    return this.spatialIndex.queryTimeRange(startTime, endTime);
  }

  // ============ RESOURCE QUERIES ============

  /**
   * Get all tasks assigned to a resource
   */
  getTasksByResource(resourceId: ResourceId): TaskId[] {
    return Array.from(this.resourceTasksIndex.get(resourceId) ?? []);
  }

  /**
   * Get virtual row for a resource
   */
  getRowForResource(resourceId: ResourceId): VirtualRow | undefined {
    return this.rowByResourceId.get(resourceId);
  }

  /**
   * Get resource at a Y position
   */
  getResourceAtY(virtualY: number): ResourceId | null {
    for (const row of this.virtualRows) {
      if (
        !row.isGroupHeader &&
        row.resourceId &&
        virtualY >= row.virtualY &&
        virtualY < row.virtualY + row.height
      ) {
        return row.resourceId;
      }
    }
    return null;
  }

  // ============ ORDER QUERIES ============

  /**
   * Get all tasks in an order
   */
  getTasksByOrder(orderId: OrderId): TaskId[] {
    return Array.from(this.orderTasksIndex.get(orderId) ?? []);
  }

  // ============ DEPENDENCY QUERIES ============

  /**
   * Get direct predecessors of a task
   */
  getPredecessors(taskId: TaskId): TaskId[] {
    return Array.from(this.predecessorIndex.get(taskId) ?? []);
  }

  /**
   * Get direct successors of a task
   */
  getSuccessors(taskId: TaskId): TaskId[] {
    return Array.from(this.successorIndex.get(taskId) ?? []);
  }

  /**
   * Get all dependencies involving a task
   */
  getTaskDependencies(taskId: TaskId): TaskDependency[] {
    const depIds = this.taskDependenciesIndex.get(taskId);
    if (!depIds) return [];
    return Array.from(depIds)
      .map((id) => this.dependencyMap.get(id))
      .filter((d): d is TaskDependency => d !== undefined);
  }

  /**
   * Get dependency by ID
   */
  getDependency(dependencyId: DependencyId): TaskDependency | undefined {
    return this.dependencyMap.get(dependencyId);
  }

  /**
   * Get all dependencies
   */
  getAllDependencies(): TaskDependency[] {
    return Array.from(this.dependencyMap.values());
  }

  /**
   * Get all tasks in the dependency chain (transitive)
   */
  getDependencyChain(
    taskId: TaskId,
    direction: "predecessors" | "successors" | "both",
  ): TaskId[] {
    const visited = new Set<TaskId>();
    const queue: TaskId[] = [taskId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined || visited.has(current)) continue;
      visited.add(current);

      if (direction === "predecessors" || direction === "both") {
        for (const pred of this.getPredecessors(current)) {
          if (!visited.has(pred)) queue.push(pred);
        }
      }

      if (direction === "successors" || direction === "both") {
        for (const succ of this.getSuccessors(current)) {
          if (!visited.has(succ)) queue.push(succ);
        }
      }
    }

    visited.delete(taskId);
    return Array.from(visited);
  }

  // ============ VIRTUAL ROWS ============

  /**
   * Get all virtual rows
   */
  getVirtualRows(): VirtualRow[] {
    return this.virtualRows;
  }

  /**
   * Get visible rows for a Y range
   */
  getVisibleRows(
    scrollY: number,
    viewportHeight: number,
  ): {
    rows: VirtualRow[];
    startIndex: number;
    endIndex: number;
  } {
    if (this.virtualRows.length === 0) {
      return { rows: [], startIndex: 0, endIndex: 0 };
    }

    // Binary search for first visible row
    let startIndex = 0;
    let endIndex = this.virtualRows.length;

    // Find first visible row
    for (let i = 0; i < this.virtualRows.length; i++) {
      const row = this.virtualRows[i];
      if (row.virtualY + row.height > scrollY) {
        startIndex = i;
        break;
      }
    }

    // Find last visible row
    for (let i = startIndex; i < this.virtualRows.length; i++) {
      const row = this.virtualRows[i];
      if (row.virtualY > scrollY + viewportHeight) {
        endIndex = i;
        break;
      }
    }

    // Add buffer rows
    const BUFFER = 3;
    startIndex = Math.max(0, startIndex - BUFFER);
    endIndex = Math.min(this.virtualRows.length, endIndex + BUFFER);

    return {
      rows: this.virtualRows.slice(startIndex, endIndex),
      startIndex,
      endIndex,
    };
  }

  /**
   * Get total virtual height
   */
  getTotalHeight(): number {
    if (this.virtualRows.length === 0) return 0;
    const lastRow = this.virtualRows[this.virtualRows.length - 1];
    return lastRow.virtualY + lastRow.height;
  }
}

// Singleton instance
let indexManagerInstance: IndexManager | null = null;

export function getIndexManager(): IndexManager {
  if (!indexManagerInstance) {
    indexManagerInstance = new IndexManager();
  }
  return indexManagerInstance;
}

export function resetIndexManager(): void {
  indexManagerInstance = null;
}
