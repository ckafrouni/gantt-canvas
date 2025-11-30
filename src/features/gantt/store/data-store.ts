import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { temporal } from "zundo";
import type {
	Task,
	TaskId,
	Resource,
	ResourceId,
	TaskDependency,
	DependencyId,
	Order,
	OrderId,
	ResourceGroup,
	GroupId,
	StoredTask,
} from "../types";
import { hydrateTask, calculateTotalDuration } from "../utils/task-utils";

/** Data store state */
export interface GanttDataState {
	// Core data
	tasks: Record<string, Task>;
	resources: Record<string, Resource>;
	dependencies: Record<string, TaskDependency>;
	orders: Record<string, Order>;
	groups: Record<string, ResourceGroup>;

	// Loading state
	isLoading: boolean;
	error: string | null;
}

/** Data store actions */
export interface GanttDataActions {
	// Task CRUD
	setTasks: (tasks: StoredTask[]) => void;
	addTask: (task: StoredTask) => void;
	updateTask: (taskId: TaskId, updates: Partial<StoredTask>) => void;
	deleteTask: (taskId: TaskId) => void;
	updateTasks: (
		updates: Array<{ taskId: TaskId; updates: Partial<StoredTask> }>,
	) => void;

	// Bulk task operations
	moveTasks: (
		taskIds: TaskId[],
		deltaTime: number,
		newResourceId?: ResourceId,
	) => void;

	// Resource CRUD
	setResources: (resources: Resource[]) => void;
	addResource: (resource: Resource) => void;
	updateResource: (
		resourceId: ResourceId,
		updates: Partial<Resource>,
	) => void;
	deleteResource: (resourceId: ResourceId) => void;

	// Dependency CRUD
	setDependencies: (dependencies: TaskDependency[]) => void;
	addDependency: (dependency: TaskDependency) => void;
	removeDependency: (dependencyId: DependencyId) => void;

	// Order CRUD
	setOrders: (orders: Order[]) => void;

	// Group CRUD
	setGroups: (groups: ResourceGroup[]) => void;

	// Loading state
	setLoading: (isLoading: boolean) => void;
	setError: (error: string | null) => void;

	// Bulk initialization
	initializeData: (data: {
		tasks: StoredTask[];
		resources: Resource[];
		dependencies?: TaskDependency[];
		orders?: Order[];
		groups?: ResourceGroup[];
	}) => void;
}

export type GanttDataStore = GanttDataState & GanttDataActions;

/** Initial state */
const initialState: GanttDataState = {
	tasks: {},
	resources: {},
	dependencies: {},
	orders: {},
	groups: {},
	isLoading: false,
	error: null,
};

/** Create the data store with undo/redo support */
export const useGanttDataStore = create<GanttDataStore>()(
	temporal(
		immer((set, _get) => ({
			...initialState,

			// Task CRUD
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
						// Recalculate computed fields if needed
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
					// Also remove related dependencies
					for (const depId of Object.keys(state.dependencies)) {
						const dep = state.dependencies[depId];
						if (dep.predecessorId === taskId || dep.successorId === taskId) {
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
							task._endTime = task.startTime + task._totalDuration * 60 * 1000;
							if (newResourceId !== undefined) {
								task.resourceId = newResourceId;
							}
						}
					}
				}),

			// Resource CRUD
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

			// Dependency CRUD
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

			// Order CRUD
			setOrders: (orders) =>
				set((state) => {
					state.orders = {};
					for (const order of orders) {
						state.orders[order.id] = order;
					}
				}),

			// Group CRUD
			setGroups: (groups) =>
				set((state) => {
					state.groups = {};
					for (const group of groups) {
						state.groups[group.id] = group;
					}
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

			// Bulk initialization
			initializeData: (data) =>
				set((state) => {
					// Tasks
					state.tasks = {};
					for (const task of data.tasks) {
						state.tasks[task.id] = hydrateTask(task);
					}

					// Resources
					state.resources = {};
					for (const resource of data.resources) {
						state.resources[resource.id] = resource;
					}

					// Dependencies
					state.dependencies = {};
					if (data.dependencies) {
						for (const dep of data.dependencies) {
							state.dependencies[dep.id] = dep;
						}
					}

					// Orders
					state.orders = {};
					if (data.orders) {
						for (const order of data.orders) {
							state.orders[order.id] = order;
						}
					}

					// Groups
					state.groups = {};
					if (data.groups) {
						for (const group of data.groups) {
							state.groups[group.id] = group;
						}
					}

					state.isLoading = false;
					state.error = null;
				}),
		})),
		{
			// Zundo options for undo/redo
			limit: 50,
			equality: (pastState, currentState) => {
				// Only track changes to tasks and dependencies
				return (
					pastState.tasks === currentState.tasks &&
					pastState.dependencies === currentState.dependencies
				);
			},
		},
	),
);

// Undo/Redo helpers
export const useGanttUndo = () => useGanttDataStore.temporal.getState().undo;
export const useGanttRedo = () => useGanttDataStore.temporal.getState().redo;
export const useGanttCanUndo = () =>
	useGanttDataStore.temporal.getState().pastStates.length > 0;
export const useGanttCanRedo = () =>
	useGanttDataStore.temporal.getState().futureStates.length > 0;
