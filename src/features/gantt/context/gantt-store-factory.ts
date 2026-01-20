import { enableMapSet } from "immer";
import { temporal } from "zundo";
import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
	DependencyId,
	DragState,
	DragType,
	GroupingMode,
	GroupingState,
	Order,
	Resource,
	ResourceGroup,
	ResourceId,
	SelectionState,
	StoredTask,
	Task,
	TaskDependency,
	TaskId,
	ViewportState,
	ZoomLevel,
} from "../types";
import { calculateTotalDuration, hydrateTask } from "../utils/task-utils";

// Enable Immer's MapSet plugin for Set/Map support
enableMapSet();

/** Zoom level configurations */
export const ZOOM_CONFIGS: Record<
	ZoomLevel,
	{
		pixelsPerHour: number;
		gridIntervalHours: number;
		labelFormat: string;
		minTaskWidth: number;
	}
> = {
	hour: {
		pixelsPerHour: 60,
		gridIntervalHours: 1,
		labelFormat: "HH:mm",
		minTaskWidth: 40,
	},
	day: {
		pixelsPerHour: 10,
		gridIntervalHours: 6,
		labelFormat: "MMM d",
		minTaskWidth: 30,
	},
	week: {
		pixelsPerHour: 2,
		gridIntervalHours: 24,
		labelFormat: "MMM d",
		minTaskWidth: 20,
	},
	month: {
		pixelsPerHour: 0.5,
		gridIntervalHours: 168,
		labelFormat: "MMM yyyy",
		minTaskWidth: 10,
	},
};

/** Get zoom level from pixels per hour */
function getZoomLevel(pixelsPerHour: number): ZoomLevel {
	if (pixelsPerHour >= 30) return "hour";
	if (pixelsPerHour >= 5) return "day";
	if (pixelsPerHour >= 1) return "week";
	return "month";
}

/** Zoom-based snap intervals in minutes */
const ZOOM_SNAP_INTERVALS: Record<ZoomLevel, number> = {
	hour: 15,
	day: 60,
	week: 360, // 6 hours
	month: 1440, // 24 hours
};

/**
 * Get snap interval in milliseconds based on zoom level and minimum resolution.
 * The snap interval scales with zoom but never goes below minResolution.
 */
export function getSnapIntervalMs(
	zoomLevel: ZoomLevel,
	minResolution: number,
): number {
	const zoomSnapMinutes = ZOOM_SNAP_INTERVALS[zoomLevel];
	const effectiveSnapMinutes = Math.max(zoomSnapMinutes, minResolution);
	return effectiveSnapMinutes * 60 * 1000;
}

/** Combined store state */
export interface GanttStoreState {
	// Data
	tasks: Record<string, Task>;
	resources: Record<string, Resource>;
	dependencies: Record<string, TaskDependency>;
	orders: Record<string, Order>;
	groups: Record<string, ResourceGroup>;

	// UI State
	viewport: ViewportState;
	selection: SelectionState;
	grouping: GroupingState;
	drag: DragState | null;
	hoveredTaskId: TaskId | null;
	sidebarWidth: number;

	// Config
	minResolution: number; // Minimum snap resolution in minutes (default: 30)

	// Loading state
	isLoading: boolean;
	error: string | null;
}

/** Combined store actions */
export interface GanttStoreActions {
	// Data actions
	setTasks: (tasks: StoredTask[]) => void;
	addTask: (task: StoredTask) => void;
	updateTask: (taskId: TaskId, updates: Partial<StoredTask>) => void;
	deleteTask: (taskId: TaskId) => void;
	updateTasks: (
		updates: Array<{ taskId: TaskId; updates: Partial<StoredTask> }>,
	) => void;
	moveTasks: (
		taskIds: TaskId[],
		deltaTime: number,
		newResourceId?: ResourceId,
	) => void;

	setResources: (resources: Resource[]) => void;
	addResource: (resource: Resource) => void;
	updateResource: (resourceId: ResourceId, updates: Partial<Resource>) => void;
	deleteResource: (resourceId: ResourceId) => void;

	setDependencies: (dependencies: TaskDependency[]) => void;
	addDependency: (dependency: TaskDependency) => void;
	removeDependency: (dependencyId: DependencyId) => void;

	setOrders: (orders: Order[]) => void;
	setGroups: (groups: ResourceGroup[]) => void;

	initializeData: (data: {
		tasks: StoredTask[];
		resources: Resource[];
		dependencies?: TaskDependency[];
		orders?: Order[];
		groups?: ResourceGroup[];
	}) => void;

	// Viewport actions
	setViewport: (viewport: Partial<ViewportState>) => void;
	panViewport: (deltaX: number, deltaY: number) => void;
	zoomViewport: (factor: number, centerX: number) => void;
	setZoomLevel: (level: ZoomLevel) => void;
	scrollToTime: (timestamp: number) => void;
	scrollToRow: (rowIndex: number) => void;

	// Selection actions
	selectTask: (taskId: TaskId, mode: "replace" | "add" | "toggle") => void;
	selectTasks: (taskIds: TaskId[], mode: "replace" | "add") => void;
	clearSelection: () => void;
	selectAllTasks: () => void;

	// Grouping actions
	setGroupingMode: (mode: GroupingMode) => void;
	toggleGroup: (groupId: string) => void;
	expandAllGroups: () => void;
	collapseAllGroups: () => void;

	// Drag actions
	startDrag: (
		taskId: TaskId,
		type: DragType,
		startX: number,
		startY: number,
	) => void;
	updateDrag: (currentX: number, currentY: number) => void;
	commitDrag: () => void;
	cancelDrag: () => void;

	// Hover actions
	setHoveredTask: (taskId: TaskId | null) => void;

	// Sidebar
	setSidebarWidth: (width: number) => void;

	// Loading state
	setLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;

	// Reset
	reset: () => void;
}

export type GanttStore = GanttStoreState & GanttStoreActions;

/** Default minimum resolution in minutes */
export const DEFAULT_MIN_RESOLUTION = 30;

/** Initial state factory */
function createInitialState(): GanttStoreState {
	return {
		tasks: {},
		resources: {},
		dependencies: {},
		orders: {},
		groups: {},
		viewport: {
			scrollX: 0,
			scrollY: 0,
			timeOrigin: Date.now() - 24 * 60 * 60 * 1000,
			pixelsPerHour: 10,
			rowHeight: 40,
			width: 0,
			height: 0,
			zoomLevel: "day",
		},
		selection: {
			taskIds: new Set(),
			resourceIds: new Set(),
			lastSelectedTaskId: null,
		},
		grouping: {
			mode: "none",
			expandedGroups: new Set(),
		},
		drag: null,
		hoveredTaskId: null,
		sidebarWidth: 200,
		minResolution: DEFAULT_MIN_RESOLUTION,
		isLoading: false,
		error: null,
	};
}

/** Configuration for store creation */
export interface GanttStoreConfig {
	initialZoom?: ZoomLevel;
	initialTime?: number;
	initialGrouping?: GroupingMode;
	sidebarWidth?: number;
	rowHeight?: number;
	/** Minimum snap resolution in minutes (default: 30) */
	minResolution?: number;
}

/** Create an isolated Gantt store instance */
export function createGanttStore(config: GanttStoreConfig = {}) {
	const initialState = createInitialState();

	// Apply config overrides
	if (config.initialZoom) {
		initialState.viewport.zoomLevel = config.initialZoom;
		initialState.viewport.pixelsPerHour =
			ZOOM_CONFIGS[config.initialZoom].pixelsPerHour;
	}
	if (config.initialTime) {
		initialState.viewport.timeOrigin = config.initialTime - 24 * 60 * 60 * 1000;
	}
	if (config.initialGrouping) {
		initialState.grouping.mode = config.initialGrouping;
	}
	if (config.sidebarWidth) {
		initialState.sidebarWidth = config.sidebarWidth;
	}
	if (config.rowHeight) {
		initialState.viewport.rowHeight = config.rowHeight;
	}
	if (config.minResolution !== undefined) {
		initialState.minResolution = config.minResolution;
	}

	return create<GanttStore>()(
		subscribeWithSelector(
			temporal(
				immer((set, get) => ({
					...initialState,

					// Data actions
					setTasks: (tasks) =>
						set((state) => {
							state.tasks = {};
							for (const task of tasks) {
								state.tasks[task.id] = hydrateTask(task);
							}
						}),

					addTask: (task) =>
						set((state) => {
							state.tasks[task.id] = hydrateTask(task);
						}),

					updateTask: (taskId, updates) =>
						set((state) => {
							const task = state.tasks[taskId];
							if (task) {
								Object.assign(task, updates);
								if (
									updates.startTime !== undefined ||
									updates.phases !== undefined
								) {
									task._totalDuration = calculateTotalDuration(task.phases);
									task._endTime =
										task.startTime + task._totalDuration * 60 * 1000;
								}
							}
						}),

					deleteTask: (taskId) =>
						set((state) => {
							delete state.tasks[taskId];
							for (const depId of Object.keys(state.dependencies)) {
								const dep = state.dependencies[depId];
								if (
									dep.predecessorId === taskId ||
									dep.successorId === taskId
								) {
									delete state.dependencies[depId];
								}
							}
						}),

					updateTasks: (updates) =>
						set((state) => {
							for (const { taskId, updates: taskUpdates } of updates) {
								const task = state.tasks[taskId];
								if (task) {
									Object.assign(task, taskUpdates);
									if (
										taskUpdates.startTime !== undefined ||
										taskUpdates.phases !== undefined
									) {
										task._totalDuration = calculateTotalDuration(task.phases);
										task._endTime =
											task.startTime + task._totalDuration * 60 * 1000;
									}
								}
							}
						}),

					moveTasks: (taskIds, deltaTime, newResourceId) =>
						set((state) => {
							for (const taskId of taskIds) {
								const task = state.tasks[taskId];
								if (task && !task.constraints?.fixedTime) {
									task.startTime += deltaTime;
									task._endTime =
										task.startTime + task._totalDuration * 60 * 1000;
									if (newResourceId !== undefined) {
										task.resourceId = newResourceId;
									}
								}
							}
						}),

					setResources: (resources) =>
						set((state) => {
							state.resources = {};
							for (const resource of resources) {
								state.resources[resource.id] = resource;
							}
						}),

					addResource: (resource) =>
						set((state) => {
							state.resources[resource.id] = resource;
						}),

					updateResource: (resourceId, updates) =>
						set((state) => {
							const resource = state.resources[resourceId];
							if (resource) {
								Object.assign(resource, updates);
							}
						}),

					deleteResource: (resourceId) =>
						set((state) => {
							delete state.resources[resourceId];
						}),

					setDependencies: (dependencies) =>
						set((state) => {
							state.dependencies = {};
							for (const dep of dependencies) {
								state.dependencies[dep.id] = dep;
							}
						}),

					addDependency: (dependency) =>
						set((state) => {
							state.dependencies[dependency.id] = dependency;
						}),

					removeDependency: (dependencyId) =>
						set((state) => {
							delete state.dependencies[dependencyId];
						}),

					setOrders: (orders) =>
						set((state) => {
							state.orders = {};
							for (const order of orders) {
								state.orders[order.id] = order;
							}
						}),

					setGroups: (groups) =>
						set((state) => {
							state.groups = {};
							for (const group of groups) {
								state.groups[group.id] = group;
							}
						}),

					initializeData: (data) =>
						set((state) => {
							state.tasks = {};
							for (const task of data.tasks) {
								state.tasks[task.id] = hydrateTask(task);
							}

							state.resources = {};
							for (const resource of data.resources) {
								state.resources[resource.id] = resource;
							}

							state.dependencies = {};
							if (data.dependencies) {
								for (const dep of data.dependencies) {
									state.dependencies[dep.id] = dep;
								}
							}

							state.orders = {};
							if (data.orders) {
								for (const order of data.orders) {
									state.orders[order.id] = order;
								}
							}

							state.groups = {};
							if (data.groups) {
								for (const group of data.groups) {
									state.groups[group.id] = group;
								}
							}

							state.isLoading = false;
							state.error = null;
						}),

					// Viewport actions
					setViewport: (viewport) =>
						set((state) => {
							Object.assign(state.viewport, viewport);
							if (viewport.pixelsPerHour !== undefined) {
								state.viewport.zoomLevel = getZoomLevel(viewport.pixelsPerHour);
							}
						}),

					panViewport: (deltaX, deltaY) =>
						set((state) => {
							state.viewport.scrollX = Math.max(
								0,
								state.viewport.scrollX + deltaX,
							);
							state.viewport.scrollY = Math.max(
								0,
								state.viewport.scrollY + deltaY,
							);
						}),

					zoomViewport: (factor, centerX) =>
						set((state) => {
							const oldPixelsPerHour = state.viewport.pixelsPerHour;
							const newPixelsPerHour = Math.max(
								0.25,
								Math.min(120, oldPixelsPerHour * factor),
							);

							const scrollXOffset = centerX + state.viewport.scrollX;
							const timeOffset = scrollXOffset / oldPixelsPerHour;
							const newScrollX = timeOffset * newPixelsPerHour - centerX;

							state.viewport.pixelsPerHour = newPixelsPerHour;
							state.viewport.scrollX = Math.max(0, newScrollX);
							state.viewport.zoomLevel = getZoomLevel(newPixelsPerHour);
						}),

					setZoomLevel: (level) =>
						set((state) => {
							const config = ZOOM_CONFIGS[level];
							state.viewport.pixelsPerHour = config.pixelsPerHour;
							state.viewport.zoomLevel = level;
						}),

					scrollToTime: (timestamp) =>
						set((state) => {
							const hoursFromOrigin =
								(timestamp - state.viewport.timeOrigin) / (60 * 60 * 1000);
							state.viewport.scrollX =
								hoursFromOrigin * state.viewport.pixelsPerHour -
								state.viewport.width / 2;
						}),

					scrollToRow: (rowIndex) =>
						set((state) => {
							state.viewport.scrollY = rowIndex * state.viewport.rowHeight;
						}),

					// Selection actions
					selectTask: (taskId, mode) =>
						set((state) => {
							if (mode === "replace") {
								state.selection.taskIds = new Set([taskId]);
							} else if (mode === "add") {
								state.selection.taskIds.add(taskId);
							} else if (mode === "toggle") {
								if (state.selection.taskIds.has(taskId)) {
									state.selection.taskIds.delete(taskId);
								} else {
									state.selection.taskIds.add(taskId);
								}
							}
							state.selection.lastSelectedTaskId = taskId;
						}),

					selectTasks: (taskIds, mode) =>
						set((state) => {
							if (mode === "replace") {
								state.selection.taskIds = new Set(taskIds);
							} else {
								for (const id of taskIds) {
									state.selection.taskIds.add(id);
								}
							}
							if (taskIds.length > 0) {
								state.selection.lastSelectedTaskId =
									taskIds[taskIds.length - 1];
							}
						}),

					clearSelection: () =>
						set((state) => {
							state.selection.taskIds = new Set();
							state.selection.resourceIds = new Set();
							state.selection.lastSelectedTaskId = null;
						}),

					selectAllTasks: () =>
						set((state) => {
							const taskIds = Object.keys(state.tasks) as TaskId[];
							state.selection.taskIds = new Set(taskIds);
						}),

					// Grouping actions
					setGroupingMode: (mode) =>
						set((state) => {
							state.grouping.mode = mode;
							state.grouping.expandedGroups = new Set();
						}),

					toggleGroup: (groupId) =>
						set((state) => {
							if (state.grouping.expandedGroups.has(groupId)) {
								state.grouping.expandedGroups.delete(groupId);
							} else {
								state.grouping.expandedGroups.add(groupId);
							}
						}),

					expandAllGroups: () =>
						set((state) => {
							const groupIds = Object.keys(state.groups);
							state.grouping.expandedGroups = new Set(groupIds);
						}),

					collapseAllGroups: () =>
						set((state) => {
							state.grouping.expandedGroups = new Set();
						}),

					// Drag actions
					startDrag: (taskId, type, startX, startY) =>
						set((state) => {
							const task = state.tasks[taskId];
							if (!task || task.constraints?.fixedTime) return;

							state.drag = {
								type,
								taskId,
								originalTask: { ...task } as Task,
								previewStartTime: task.startTime,
								previewEndTime: task._endTime,
								previewResourceId: task.resourceId,
								collisions: [],
								dependencyViolations: [],
								startX,
								startY,
								currentX: startX,
								currentY: startY,
							};
						}),

					updateDrag: (currentX, currentY) =>
						set((state) => {
							if (!state.drag) return;

							const { viewport, minResolution } = state;
							const deltaX = currentX - state.drag.startX;

							const hoursPerPixel = 1 / viewport.pixelsPerHour;
							const deltaTimeMs = deltaX * hoursPerPixel * 60 * 60 * 1000;

							// Minimum task duration based on minResolution
							const minDurationMs = minResolution * 60 * 1000;

							state.drag.currentX = currentX;
							state.drag.currentY = currentY;

							if (
								state.drag.type === "move" ||
								state.drag.type === "reassign"
							) {
								state.drag.previewStartTime =
									state.drag.originalTask.startTime + deltaTimeMs;
								state.drag.previewEndTime =
									state.drag.originalTask._endTime + deltaTimeMs;
							} else if (state.drag.type === "resize-start") {
								const newStartTime =
									state.drag.originalTask.startTime + deltaTimeMs;
								state.drag.previewStartTime = Math.min(
									newStartTime,
									state.drag.originalTask._endTime - minDurationMs,
								);
							} else if (state.drag.type === "resize-end") {
								const newEndTime =
									state.drag.originalTask._endTime + deltaTimeMs;
								state.drag.previewEndTime = Math.max(
									newEndTime,
									state.drag.originalTask.startTime + minDurationMs,
								);
							}
						}),

					commitDrag: () => {
						const state = get();
						if (!state.drag) return;

						const {
							taskId,
							previewStartTime,
							previewEndTime,
							previewResourceId,
						} = state.drag;

						if (state.drag.dependencyViolations.length > 0) {
							set((s) => {
								s.drag = null;
							});
							return;
						}

						const originalTask = state.tasks[taskId];

						// Snap times to minResolution
						const snapInterval = getSnapIntervalMs(
							state.viewport.zoomLevel,
							state.minResolution,
						);
						const snappedStartTime =
							Math.round(previewStartTime / snapInterval) * snapInterval;
						const snappedEndTime =
							Math.round(previewEndTime / snapInterval) * snapInterval;

						if (state.drag.type === "move" || state.drag.type === "reassign") {
							get().updateTask(taskId, {
								startTime: snappedStartTime,
								resourceId: previewResourceId,
							});
						} else if (
							state.drag.type === "resize-start" ||
							state.drag.type === "resize-end"
						) {
							const newDurationMs = snappedEndTime - snappedStartTime;
							const newDurationMinutes = newDurationMs / (60 * 1000);

							const scaleFactor =
								newDurationMinutes / originalTask._totalDuration;
							const newPhases = originalTask.phases.map((phase) => ({
								...phase,
								duration: Math.round(phase.duration * scaleFactor),
							}));

							get().updateTask(taskId, {
								startTime: snappedStartTime,
								phases: newPhases,
							});
						}

						set((s) => {
							s.drag = null;
						});
					},

					cancelDrag: () =>
						set((state) => {
							state.drag = null;
						}),

					// Hover actions
					setHoveredTask: (taskId) =>
						set((state) => {
							state.hoveredTaskId = taskId;
						}),

					// Sidebar
					setSidebarWidth: (width) =>
						set((state) => {
							state.sidebarWidth = Math.max(100, Math.min(400, width));
						}),

					// Loading state
					setLoading: (isLoading) =>
						set((state) => {
							state.isLoading = isLoading;
						}),

					setError: (error) =>
						set((state) => {
							state.error = error;
						}),

					// Reset
					reset: () => set(createInitialState()),
				})),
				{
					limit: 50,
					equality: (pastState, currentState) => {
						return (
							pastState.tasks === currentState.tasks &&
							pastState.dependencies === currentState.dependencies
						);
					},
				},
			),
		),
	);
}

export type GanttStoreApi = ReturnType<typeof createGanttStore>;
