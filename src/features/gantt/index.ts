// Main export file for the Gantt chart feature

// Components
export { GanttChart } from "./components/GanttChart";
export { GanttCanvas } from "./components/GanttCanvas";
export { GanttSidebar } from "./components/GanttSidebar";
export { TimelineHeader } from "./components/TimelineHeader";
export { GanttToolbar } from "./components/GanttToolbar";

// Stores
export { useGanttDataStore, useGanttUndo, useGanttRedo } from "./store/data-store";
export { useGanttUIStore, ZOOM_CONFIGS } from "./store/ui-store";

// Hooks
export { useVirtualRows, useVisibleRows } from "./hooks/useVirtualRows";
export { useGanttInteractions } from "./hooks/useGanttInteractions";

// Types
export type {
	Task,
	TaskId,
	StoredTask,
	Resource,
	ResourceId,
	ResourceType,
	TaskDependency,
	DependencyId,
	DependencyType,
	Order,
	OrderId,
	ResourceGroup,
	GroupId,
	ViewportState,
	ZoomLevel,
	DragState,
	DragType,
	SelectionState,
	GroupingState,
	GroupingMode,
	VirtualRow,
	TaskPhase,
	GanttCallbacks,
} from "./types";

// Utilities
export {
	hydrateTask,
	calculateEndTime,
	calculateTotalDuration,
	getPhaseRanges,
	formatDuration,
	snapToInterval,
} from "./utils/task-utils";

// ID creators
export {
	createTaskId,
	createResourceId,
	createOrderId,
	createDependencyId,
	createGroupId,
} from "./types";
