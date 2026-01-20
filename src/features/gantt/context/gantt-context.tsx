import {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useMemo,
	useRef,
} from "react";
import { useStore } from "zustand";
import { shallow } from "zustand/shallow";
import { useStoreWithEqualityFn } from "zustand/traditional";
import type {
	DragState,
	GroupingMode,
	GroupingState,
	Order,
	Resource,
	ResourceGroup,
	SelectionState,
	StoredTask,
	Task,
	TaskDependency,
	TaskId,
	ViewportState,
	ZoomLevel,
} from "../types";
import {
	createGanttStore,
	type GanttStore,
	type GanttStoreApi,
	type GanttStoreConfig,
} from "./gantt-store-factory";

/** Context for the Gantt store */
const GanttStoreContext = createContext<GanttStoreApi | null>(null);

/** Props for GanttProvider */
export interface GanttProviderProps extends GanttStoreConfig {
	children: ReactNode;
	/** Initial tasks */
	tasks?: StoredTask[];
	/** Resources */
	resources?: Resource[];
	/** Dependencies */
	dependencies?: TaskDependency[];
	/** Orders */
	orders?: Order[];
	/** Resource groups */
	groups?: ResourceGroup[];
	/** Callback when a task is updated */
	onTaskChange?: (taskId: TaskId, task: Task) => void;
	/** Callback when selection changes */
	onSelectionChange?: (taskIds: TaskId[]) => void;
	/** Callback when viewport changes */
	onViewportChange?: (viewport: ViewportState) => void;
}

/**
 * Provider component that creates an isolated Gantt store instance.
 * Wrap your Gantt components with this to enable context-based state sharing.
 */
export function GanttProvider({
	children,
	tasks,
	resources,
	dependencies,
	orders,
	groups,
	onTaskChange,
	onSelectionChange,
	onViewportChange,
	...config
}: GanttProviderProps) {
	// Create store once
	const storeRef = useRef<GanttStoreApi | null>(null);
	if (!storeRef.current) {
		storeRef.current = createGanttStore(config);
	}

	// Initialize data when props change
	useEffect(() => {
		if (tasks && resources && storeRef.current) {
			storeRef.current.getState().initializeData({
				tasks,
				resources,
				dependencies,
				orders,
				groups,
			});
		}
	}, [tasks, resources, dependencies, orders, groups]);

	// Subscribe to task changes for callback
	useEffect(() => {
		if (!onTaskChange || !storeRef.current) return;

		const unsubscribe = storeRef.current.subscribe(
			(state) => state.tasks,
			(tasks, prevTasks) => {
				// Find changed tasks
				for (const taskId of Object.keys(tasks)) {
					if (tasks[taskId] !== prevTasks[taskId]) {
						onTaskChange(taskId as TaskId, tasks[taskId]);
					}
				}
			},
		);

		return unsubscribe;
	}, [onTaskChange]);

	// Subscribe to selection changes for callback
	useEffect(() => {
		if (!onSelectionChange || !storeRef.current) return;

		const unsubscribe = storeRef.current.subscribe(
			(state) => state.selection.taskIds,
			(taskIds) => {
				onSelectionChange(Array.from(taskIds));
			},
		);

		return unsubscribe;
	}, [onSelectionChange]);

	// Subscribe to viewport changes for callback
	useEffect(() => {
		if (!onViewportChange || !storeRef.current) return;

		const unsubscribe = storeRef.current.subscribe(
			(state) => state.viewport,
			(viewport) => {
				onViewportChange(viewport);
			},
		);

		return unsubscribe;
	}, [onViewportChange]);

	return (
		<GanttStoreContext.Provider value={storeRef.current}>
			{children}
		</GanttStoreContext.Provider>
	);
}

/**
 * Get the raw Gantt store API.
 * Use this for advanced cases where you need direct store access.
 */
export function useGanttStoreApi(): GanttStoreApi {
	const store = useContext(GanttStoreContext);
	if (!store) {
		throw new Error("useGanttStoreApi must be used within a GanttProvider");
	}
	return store;
}

/**
 * Select state from the Gantt store with a selector function.
 * Components will only re-render when the selected value changes.
 */
export function useGanttStore<T>(selector: (state: GanttStore) => T): T {
	const store = useGanttStoreApi();
	return useStore(store, selector);
}

/**
 * Select state from the Gantt store with shallow equality check.
 * Useful when selecting objects or arrays.
 */
export function useGanttStoreShallow<T>(selector: (state: GanttStore) => T): T {
	const store = useGanttStoreApi();
	return useStoreWithEqualityFn(store, selector, shallow);
}

// ============================================
// Convenience Hooks
// ============================================

/** Get all tasks as a record */
export function useGanttTasks(): Record<string, Task> {
	return useGanttStore((s) => s.tasks);
}

/** Get all resources as a record */
export function useGanttResources(): Record<string, Resource> {
	return useGanttStore((s) => s.resources);
}

/** Get all dependencies as a record */
export function useGanttDependencies(): Record<string, TaskDependency> {
	return useGanttStore((s) => s.dependencies);
}

/** Get all orders as a record */
export function useGanttOrders(): Record<string, Order> {
	return useGanttStore((s) => s.orders);
}

/** Get all groups as a record */
export function useGanttGroups(): Record<string, ResourceGroup> {
	return useGanttStore((s) => s.groups);
}

/** Get viewport state */
export function useGanttViewport(): ViewportState {
	return useGanttStoreShallow((s) => s.viewport);
}

/** Get current zoom level */
export function useGanttZoom(): ZoomLevel {
	return useGanttStore((s) => s.viewport.zoomLevel);
}

/** Get selection state */
export function useGanttSelection(): SelectionState {
	return useGanttStoreShallow((s) => s.selection);
}

/** Get selected task IDs as array */
export function useGanttSelectedTaskIds(): TaskId[] {
	// Use shallow comparison for the Set, then memoize the array conversion
	const taskIds = useGanttStore((s) => s.selection.taskIds);
	return useMemo(() => Array.from(taskIds), [taskIds]);
}

/** Get selected tasks with their data */
export function useGanttSelectedTasks(): Task[] {
	// Select primitives/stable references separately, memoize the derived array
	const tasks = useGanttStore((s) => s.tasks);
	const selectedIds = useGanttStore((s) => s.selection.taskIds);

	return useMemo(() => {
		const result: Task[] = [];
		for (const taskId of selectedIds) {
			const task = tasks[taskId];
			if (task) result.push(task);
		}
		return result;
	}, [tasks, selectedIds]);
}

/** Get grouping state */
export function useGanttGrouping(): GroupingState {
	return useGanttStoreShallow((s) => s.grouping);
}

/** Get current grouping mode */
export function useGanttGroupingMode(): GroupingMode {
	return useGanttStore((s) => s.grouping.mode);
}

/** Get drag state */
export function useGanttDrag(): DragState | null {
	return useGanttStore((s) => s.drag);
}

/** Get hovered task ID */
export function useGanttHoveredTaskId(): TaskId | null {
	return useGanttStore((s) => s.hoveredTaskId);
}

/** Get sidebar width */
export function useGanttSidebarWidth(): number {
	return useGanttStore((s) => s.sidebarWidth);
}

/** Get minimum resolution in minutes */
export function useGanttMinResolution(): number {
	return useGanttStore((s) => s.minResolution);
}

/** Check if can undo */
export function useGanttCanUndo(): boolean {
	const store = useGanttStoreApi();
	return useStore(store.temporal, (s) => s.pastStates.length > 0);
}

/** Check if can redo */
export function useGanttCanRedo(): boolean {
	const store = useGanttStoreApi();
	return useStore(store.temporal, (s) => s.futureStates.length > 0);
}

// ============================================
// Actions Hook
// ============================================

export interface GanttActions {
	// Task actions
	addTask: GanttStore["addTask"];
	updateTask: GanttStore["updateTask"];
	deleteTask: GanttStore["deleteTask"];
	moveTasks: GanttStore["moveTasks"];

	// Selection actions
	selectTask: GanttStore["selectTask"];
	selectTasks: GanttStore["selectTasks"];
	clearSelection: GanttStore["clearSelection"];
	selectAllTasks: GanttStore["selectAllTasks"];

	// Viewport actions
	setViewport: GanttStore["setViewport"];
	panViewport: GanttStore["panViewport"];
	zoomViewport: GanttStore["zoomViewport"];
	setZoomLevel: GanttStore["setZoomLevel"];
	scrollToTime: GanttStore["scrollToTime"];
	scrollToRow: GanttStore["scrollToRow"];

	// Grouping actions
	setGroupingMode: GanttStore["setGroupingMode"];
	toggleGroup: GanttStore["toggleGroup"];
	expandAllGroups: GanttStore["expandAllGroups"];
	collapseAllGroups: GanttStore["collapseAllGroups"];

	// Drag actions
	startDrag: GanttStore["startDrag"];
	updateDrag: GanttStore["updateDrag"];
	commitDrag: GanttStore["commitDrag"];
	cancelDrag: GanttStore["cancelDrag"];

	// Other actions
	setHoveredTask: GanttStore["setHoveredTask"];
	setSidebarWidth: GanttStore["setSidebarWidth"];

	// Undo/Redo
	undo: () => void;
	redo: () => void;
}

/**
 * Get all Gantt actions as stable references.
 * These functions never change identity, safe to use in useEffect dependencies.
 */
export function useGanttActions(): GanttActions {
	const store = useGanttStoreApi();

	return useMemo(
		() => ({
			// Task actions
			addTask: (task) => store.getState().addTask(task),
			updateTask: (taskId, updates) =>
				store.getState().updateTask(taskId, updates),
			deleteTask: (taskId) => store.getState().deleteTask(taskId),
			moveTasks: (taskIds, deltaTime, newResourceId) =>
				store.getState().moveTasks(taskIds, deltaTime, newResourceId),

			// Selection actions
			selectTask: (taskId, mode) => store.getState().selectTask(taskId, mode),
			selectTasks: (taskIds, mode) =>
				store.getState().selectTasks(taskIds, mode),
			clearSelection: () => store.getState().clearSelection(),
			selectAllTasks: () => store.getState().selectAllTasks(),

			// Viewport actions
			setViewport: (viewport) => store.getState().setViewport(viewport),
			panViewport: (deltaX, deltaY) =>
				store.getState().panViewport(deltaX, deltaY),
			zoomViewport: (factor, centerX) =>
				store.getState().zoomViewport(factor, centerX),
			setZoomLevel: (level) => store.getState().setZoomLevel(level),
			scrollToTime: (timestamp) => store.getState().scrollToTime(timestamp),
			scrollToRow: (rowIndex) => store.getState().scrollToRow(rowIndex),

			// Grouping actions
			setGroupingMode: (mode) => store.getState().setGroupingMode(mode),
			toggleGroup: (groupId) => store.getState().toggleGroup(groupId),
			expandAllGroups: () => store.getState().expandAllGroups(),
			collapseAllGroups: () => store.getState().collapseAllGroups(),

			// Drag actions
			startDrag: (taskId, type, startX, startY) =>
				store.getState().startDrag(taskId, type, startX, startY),
			updateDrag: (currentX, currentY) =>
				store.getState().updateDrag(currentX, currentY),
			commitDrag: () => store.getState().commitDrag(),
			cancelDrag: () => store.getState().cancelDrag(),

			// Other actions
			setHoveredTask: (taskId) => store.getState().setHoveredTask(taskId),
			setSidebarWidth: (width) => store.getState().setSidebarWidth(width),

			// Undo/Redo
			undo: () => store.temporal.getState().undo(),
			redo: () => store.temporal.getState().redo(),
		}),
		[store],
	);
}
