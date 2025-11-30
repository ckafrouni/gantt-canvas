// Core type definitions for the Gantt chart

/** Branded types for type safety */
export type TaskId = string & { readonly __brand: "TaskId" };
export type ResourceId = string & { readonly __brand: "ResourceId" };
export type OrderId = string & { readonly __brand: "OrderId" };
export type DependencyId = string & { readonly __brand: "DependencyId" };
export type GroupId = string & { readonly __brand: "GroupId" };

/** Helper to create branded IDs */
export const createTaskId = (id: string): TaskId => id as TaskId;
export const createResourceId = (id: string): ResourceId => id as ResourceId;
export const createOrderId = (id: string): OrderId => id as OrderId;
export const createDependencyId = (id: string): DependencyId =>
	id as DependencyId;
export const createGroupId = (id: string): GroupId => id as GroupId;

/** Task phase representation (setup, execution, cleanup) */
export interface TaskPhase {
	type: "setup" | "execution" | "cleanup";
	duration: number; // in minutes
	color?: string; // optional override
}

/** Dependency types */
export type DependencyType =
	| "FS" // Finish-to-Start (most common)
	| "FF" // Finish-to-Finish
	| "SS" // Start-to-Start
	| "SF"; // Start-to-Finish

/** Task dependency with lag support */
export interface TaskDependency {
	id: DependencyId;
	predecessorId: TaskId;
	successorId: TaskId;
	type: DependencyType;
	lag: number; // in minutes, can be negative
}

/** Resource types */
export type ResourceType = "operator" | "machine" | "generic";

/** Resource definition */
export interface Resource {
	id: ResourceId;
	name: string;
	type: ResourceType;
	capacity: number; // max concurrent tasks
	groupId?: GroupId;
	color?: string;
	metadata?: Record<string, unknown>;
}

/** Resource group for row grouping */
export interface ResourceGroup {
	id: GroupId;
	name: string;
	type: ResourceType;
	color?: string;
}

/** Task status */
export type TaskStatus = "scheduled" | "in_progress" | "completed" | "blocked";

/** Main Task interface */
export interface Task {
	id: TaskId;

	// Temporal properties
	startTime: number; // Unix timestamp in milliseconds
	phases: TaskPhase[];

	// Computed (cached) - populated by hydrateTask
	_endTime: number;
	_totalDuration: number; // in minutes

	// Assignment
	resourceId: ResourceId;

	// Grouping
	orderId: OrderId;

	// Display
	name: string;
	description?: string;
	color?: string;
	priority: number; // 1-5

	// Status
	status: TaskStatus;
	progress: number; // 0-100

	// Constraints
	constraints?: {
		earliestStart?: number;
		latestEnd?: number;
		fixedTime?: boolean; // Cannot be moved by drag
	};

	// Metadata
	metadata?: Record<string, unknown>;
}

/** Order (for grouping tasks) */
export interface Order {
	id: OrderId;
	name: string;
	priority: number;
	color?: string;
	dueDate?: number;
}

/** Stored task without computed fields */
export type StoredTask = Omit<Task, "_endTime" | "_totalDuration">;

/** Zoom level for timeline */
export type ZoomLevel = "hour" | "day" | "week" | "month";

/** Zoom configuration */
export interface ZoomConfig {
	pixelsPerHour: number;
	gridIntervalHours: number;
	labelFormat: string; // date-fns format
	minTaskWidth: number;
}

/** Viewport state */
export interface ViewportState {
	// Time axis (horizontal)
	scrollX: number; // pixels scrolled
	timeOrigin: number; // start timestamp of timeline
	pixelsPerHour: number; // zoom level

	// Resource axis (vertical)
	scrollY: number; // pixels scrolled
	rowHeight: number; // base row height

	// Canvas dimensions
	width: number;
	height: number;

	// Derived zoom level
	zoomLevel: ZoomLevel;
}

/** Selection state */
export interface SelectionState {
	taskIds: Set<TaskId>;
	resourceIds: Set<ResourceId>;
	lastSelectedTaskId: TaskId | null;
}

/** Drag operation type */
export type DragType = "move" | "resize-start" | "resize-end" | "reassign";

/** Drag state during interaction */
export interface DragState {
	type: DragType;
	taskId: TaskId;
	originalTask: Task;

	// Preview state (not committed)
	previewStartTime: number;
	previewEndTime: number;
	previewResourceId: ResourceId;

	// Validation results
	collisions: TaskId[];
	dependencyViolations: Array<{
		dependencyId: DependencyId;
		message: string;
	}>;

	// Mouse tracking
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
}

/** Grouping mode */
export type GroupingMode = "order" | "resource_type" | "none";

/** Grouping state */
export interface GroupingState {
	mode: GroupingMode;
	expandedGroups: Set<string>;
}

/** Virtual row for rendering */
export interface VirtualRow {
	id: string;
	resourceId: ResourceId | null;
	virtualY: number; // position in virtual space
	height: number;
	isGroupHeader: boolean;
	groupId?: string;
	groupName?: string;
	isCollapsed?: boolean;
}

/** Hit zone for task interaction */
export type HitZone = "body" | "resize-start" | "resize-end" | null;

/** Task bounds for spatial indexing */
export interface TaskBounds {
	minX: number; // start timestamp
	minY: number; // row top (virtual Y)
	maxX: number; // end timestamp
	maxY: number; // row bottom
	taskId: TaskId;
}

/** Render layer types */
export type RenderLayer = "grid" | "tasks" | "dependencies" | "interaction";

/** Canvas references */
export interface CanvasRefs {
	grid: HTMLCanvasElement | null;
	tasks: HTMLCanvasElement | null;
	dependencies: HTMLCanvasElement | null;
	interaction: HTMLCanvasElement | null;
}

/** Gantt chart callbacks */
export interface GanttCallbacks {
	onTaskClick?: (taskId: TaskId, event: MouseEvent) => void;
	onTaskDoubleClick?: (taskId: TaskId, event: MouseEvent) => void;
	onTaskDragStart?: (taskId: TaskId) => void;
	onTaskDragEnd?: (
		taskId: TaskId,
		newStartTime: number,
		newResourceId: ResourceId,
	) => void;
	onTaskResize?: (taskId: TaskId, newDuration: number) => void;
	onSelectionChange?: (taskIds: TaskId[]) => void;
	onViewportChange?: (viewport: ViewportState) => void;
}
