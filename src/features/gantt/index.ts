// Main export file for the Gantt chart feature

export { GanttCanvas } from "./components/GanttCanvas";
// Components
export { GanttChart } from "./components/GanttChart";
export { GanttSidebar } from "./components/GanttSidebar";
export { GanttToolbar } from "./components/GanttToolbar";
export { TimelineHeader } from "./components/TimelineHeader";
export { useGanttInteractions } from "./hooks/useGanttInteractions";
// Hooks
export { useVirtualRows, useVisibleRows } from "./hooks/useVirtualRows";
// Stores
export {
	useGanttDataStore,
	useGanttRedo,
	useGanttUndo,
} from "./store/data-store";
export { useGanttUIStore, ZOOM_CONFIGS } from "./store/ui-store";

// Types
export type {
	DependencyId,
	DependencyType,
	DragState,
	DragType,
	GanttCallbacks,
	GroupId,
	GroupingMode,
	GroupingState,
	Order,
	OrderId,
	Resource,
	ResourceGroup,
	ResourceId,
	ResourceType,
	SelectionState,
	StoredTask,
	Task,
	TaskDependency,
	TaskId,
	TaskPhase,
	ViewportState,
	VirtualRow,
	ZoomLevel,
} from "./types";
// ID creators
export {
	createDependencyId,
	createGroupId,
	createOrderId,
	createResourceId,
	createTaskId,
} from "./types";
// Utilities
export {
	calculateEndTime,
	calculateTotalDuration,
	formatDuration,
	getPhaseRanges,
	hydrateTask,
	snapToInterval,
} from "./utils/task-utils";
