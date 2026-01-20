import { enableMapSet } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
	DragState,
	DragType,
	GroupingState,
	SelectionState,
	Task,
	TaskId,
	ViewportState,
	ZoomLevel,
} from "../types";
import { useGanttDataStore } from "./data-store";

// Enable Immer's MapSet plugin for Set/Map support
enableMapSet();

/** UI store state */
export interface GanttUIState {
	viewport: ViewportState;
	selection: SelectionState;
	grouping: GroupingState;
	drag: DragState | null;
	hoveredTaskId: TaskId | null;

	// Sidebar width
	sidebarWidth: number;
}

/** UI store actions */
export interface GanttUIActions {
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
	setGroupingMode: (mode: GroupingState["mode"]) => void;
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

	// Reset
	reset: () => void;
}

export type GanttUIStore = GanttUIState & GanttUIActions;

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

/** Initial state */
const initialState: GanttUIState = {
	viewport: {
		scrollX: 0,
		scrollY: 0,
		timeOrigin: Date.now() - 24 * 60 * 60 * 1000, // Start 1 day ago
		pixelsPerHour: 10, // Day view by default
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
};

/** Create the UI store */
export const useGanttUIStore = create<GanttUIStore>()(
	immer((set, get) => ({
		...initialState,

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
				state.viewport.scrollX = Math.max(0, state.viewport.scrollX + deltaX);
				state.viewport.scrollY = Math.max(0, state.viewport.scrollY + deltaY);
			}),

		zoomViewport: (factor, centerX) =>
			set((state) => {
				const oldPixelsPerHour = state.viewport.pixelsPerHour;
				const newPixelsPerHour = Math.max(
					0.25,
					Math.min(120, oldPixelsPerHour * factor),
				);

				// Adjust scroll to keep the point under cursor stable
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
					state.selection.lastSelectedTaskId = taskIds[taskIds.length - 1];
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
				const dataStore = useGanttDataStore.getState();
				const taskIds = Object.keys(dataStore.tasks) as TaskId[];
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
				const dataStore = useGanttDataStore.getState();
				const groupIds = Object.keys(dataStore.groups);
				state.grouping.expandedGroups = new Set(groupIds);
			}),

		collapseAllGroups: () =>
			set((state) => {
				state.grouping.expandedGroups = new Set();
			}),

		// Drag actions
		startDrag: (taskId, type, startX, startY) =>
			set((state) => {
				const dataStore = useGanttDataStore.getState();
				const task = dataStore.tasks[taskId];
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

				const { viewport } = state;
				const deltaX = currentX - state.drag.startX;
				// deltaY will be used for resource reassignment in the future
				const _deltaY = currentY - state.drag.startY;

				// Calculate time delta
				const hoursPerPixel = 1 / viewport.pixelsPerHour;
				const deltaTimeMs = deltaX * hoursPerPixel * 60 * 60 * 1000;

				state.drag.currentX = currentX;
				state.drag.currentY = currentY;

				if (state.drag.type === "move" || state.drag.type === "reassign") {
					state.drag.previewStartTime =
						state.drag.originalTask.startTime + deltaTimeMs;
					state.drag.previewEndTime =
						state.drag.originalTask._endTime + deltaTimeMs;

					// Calculate resource change based on Y delta
					// TODO: Implement resource reassignment based on row index
					// if (state.drag.type === "reassign" || Math.abs(deltaY) > 20) {
					//   const rowDelta = Math.round(deltaY / viewport.rowHeight);
					// }
				} else if (state.drag.type === "resize-start") {
					// Resize from start
					const newStartTime = state.drag.originalTask.startTime + deltaTimeMs;
					state.drag.previewStartTime = Math.min(
						newStartTime,
						state.drag.originalTask._endTime - 15 * 60 * 1000, // Min 15 min
					);
				} else if (state.drag.type === "resize-end") {
					// Resize from end
					const newEndTime = state.drag.originalTask._endTime + deltaTimeMs;
					state.drag.previewEndTime = Math.max(
						newEndTime,
						state.drag.originalTask.startTime + 15 * 60 * 1000, // Min 15 min
					);
				}

				// TODO: Validate collisions and dependency violations
			}),

		commitDrag: () => {
			const state = get();
			if (!state.drag) return;

			const { taskId, previewStartTime, previewEndTime, previewResourceId } =
				state.drag;

			// Check for violations
			if (state.drag.dependencyViolations.length > 0) {
				console.warn(
					"Cannot commit: dependency violations",
					state.drag.dependencyViolations,
				);
				set((s) => {
					s.drag = null;
				});
				return;
			}

			const dataStore = useGanttDataStore.getState();
			const originalTask = dataStore.tasks[taskId];

			if (state.drag.type === "move" || state.drag.type === "reassign") {
				dataStore.updateTask(taskId, {
					startTime: previewStartTime,
					resourceId: previewResourceId,
				});
			} else if (
				state.drag.type === "resize-start" ||
				state.drag.type === "resize-end"
			) {
				// For resize, we need to adjust the phases
				const newDurationMs = previewEndTime - previewStartTime;
				const newDurationMinutes = newDurationMs / (60 * 1000);

				// Scale phases proportionally
				const scaleFactor = newDurationMinutes / originalTask._totalDuration;
				const newPhases = originalTask.phases.map((phase) => ({
					...phase,
					duration: Math.round(phase.duration * scaleFactor),
				}));

				dataStore.updateTask(taskId, {
					startTime: previewStartTime,
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

		// Reset
		reset: () => set(initialState),
	})),
);

// Selector hooks for performance
export const useViewport = () => useGanttUIStore((s) => s.viewport);
export const useSelection = () => useGanttUIStore((s) => s.selection);
export const useGrouping = () => useGanttUIStore((s) => s.grouping);
export const useDragState = () => useGanttUIStore((s) => s.drag);
export const useHoveredTaskId = () => useGanttUIStore((s) => s.hoveredTaskId);
