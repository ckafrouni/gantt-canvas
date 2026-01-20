/**
 * Composable Gantt Chart API
 *
 * This module provides a compound component pattern for building
 * custom Gantt chart layouts with full control over positioning.
 *
 * @example Basic usage with custom layout
 * ```tsx
 * import { Gantt } from "@/features/gantt/composable";
 *
 * function MyGantt() {
 *   return (
 *     <Gantt.Provider tasks={tasks} resources={resources}>
 *       <div className="flex flex-col h-full">
 *         <Gantt.Toolbar />
 *         <div className="flex flex-1">
 *           <Gantt.Sidebar width={200} />
 *           <div className="flex flex-col flex-1">
 *             <Gantt.Timeline height={50} />
 *             <Gantt.Canvas width={800} height={600} />
 *           </div>
 *         </div>
 *       </div>
 *     </Gantt.Provider>
 *   );
 * }
 * ```
 */

export type {
	GanttCanvasProps,
	GanttSidebarProps,
	GanttTimelineProps,
	GanttToolbarProps,
} from "./components/composable";
// Components
// Individual controls
export {
	GanttCanvas,
	GanttSidebar,
	GanttTimeline,
	GanttToolbar,
	GroupingSelect,
	RedoButton,
	TodayButton,
	UndoButton,
	UndoRedo,
	ZoomButtons,
	ZoomControls,
	ZoomSelect,
} from "./components/composable";
export type { GanttActions, GanttProviderProps } from "./context/gantt-context";
// Provider
// Hooks
export {
	GanttProvider,
	useGanttActions,
	useGanttCanRedo,
	useGanttCanUndo,
	useGanttDependencies,
	useGanttDrag,
	useGanttGrouping,
	useGanttGroupingMode,
	useGanttGroups,
	useGanttHoveredTaskId,
	useGanttMinResolution,
	useGanttOrders,
	useGanttResources,
	useGanttSelectedTaskIds,
	useGanttSelectedTasks,
	useGanttSelection,
	useGanttSidebarWidth,
	useGanttStore,
	useGanttStoreApi,
	useGanttStoreShallow,
	useGanttTasks,
	useGanttViewport,
	useGanttZoom,
} from "./context/gantt-context";
export type {
	GanttStore,
	GanttStoreActions,
	GanttStoreApi,
	GanttStoreConfig,
	GanttStoreState,
} from "./context/gantt-store-factory";

// Store factory (for advanced use)
export {
	createGanttStore,
	DEFAULT_MIN_RESOLUTION,
	getSnapIntervalMs,
	ZOOM_CONFIGS,
} from "./context/gantt-store-factory";
// Virtual rows hooks
export {
	useComposableVirtualRows,
	useComposableVisibleRows,
} from "./hooks/useComposableVirtualRows";

// Types
export type {
	DependencyId,
	DependencyType,
	DragState,
	DragType,
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
// Demo data generator
export { generateDemoData, generateLargeDataset } from "./utils/demo-data";
// Utilities
export {
	calculateEndTime,
	calculateTotalDuration,
	formatDuration,
	getPhaseRanges,
	hydrateTask,
	snapToInterval,
} from "./utils/task-utils";

import {
	GanttCanvas,
	GanttSidebar,
	GanttTimeline,
	GanttToolbar,
	GroupingSelect,
	RedoButton,
	TodayButton,
	UndoButton,
	UndoRedo,
	ZoomButtons,
	ZoomControls,
	ZoomSelect,
} from "./components/composable";
/**
 * Gantt namespace for compound component pattern.
 * Provides all components under a single namespace.
 */
import { GanttProvider } from "./context/gantt-context";

export const Gantt = {
	/** Provider component - wrap your layout with this */
	Provider: GanttProvider,

	/** Main canvas for rendering tasks */
	Canvas: GanttCanvas,

	/** Timeline header showing time axis */
	Timeline: GanttTimeline,

	/** Sidebar showing resource list */
	Sidebar: GanttSidebar,

	/** Toolbar with zoom, grouping, undo/redo */
	Toolbar: GanttToolbar,

	/** Individual control components */
	Controls: {
		ZoomControls,
		ZoomButtons,
		ZoomSelect,
		UndoRedo,
		UndoButton,
		RedoButton,
		GroupingSelect,
		TodayButton,
	},
};
