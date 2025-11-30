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

// Provider
export { GanttProvider } from "./context/gantt-context";
export type { GanttProviderProps } from "./context/gantt-context";

// Components
export {
  GanttCanvas,
  GanttTimeline,
  GanttSidebar,
  GanttToolbar,
} from "./components/composable";

export type {
  GanttCanvasProps,
  GanttTimelineProps,
  GanttSidebarProps,
  GanttToolbarProps,
} from "./components/composable";

// Individual controls
export {
  ZoomControls,
  ZoomButtons,
  ZoomSelect,
  UndoRedo,
  UndoButton,
  RedoButton,
  GroupingSelect,
  TodayButton,
} from "./components/composable";

// Hooks
export {
  useGanttStoreApi,
  useGanttStore,
  useGanttStoreShallow,
  useGanttTasks,
  useGanttResources,
  useGanttDependencies,
  useGanttOrders,
  useGanttGroups,
  useGanttViewport,
  useGanttZoom,
  useGanttSelection,
  useGanttSelectedTaskIds,
  useGanttSelectedTasks,
  useGanttGrouping,
  useGanttGroupingMode,
  useGanttDrag,
  useGanttHoveredTaskId,
  useGanttSidebarWidth,
  useGanttCanUndo,
  useGanttCanRedo,
  useGanttActions,
} from "./context/gantt-context";

export type { GanttActions } from "./context/gantt-context";

// Virtual rows hooks
export {
  useComposableVirtualRows,
  useComposableVisibleRows,
} from "./hooks/useComposableVirtualRows";

// Store factory (for advanced use)
export { createGanttStore, ZOOM_CONFIGS } from "./context/gantt-store-factory";
export type {
  GanttStore,
  GanttStoreState,
  GanttStoreActions,
  GanttStoreApi,
  GanttStoreConfig,
} from "./context/gantt-store-factory";

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
} from "./types";

// ID creators
export {
  createTaskId,
  createResourceId,
  createOrderId,
  createDependencyId,
  createGroupId,
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

// Demo data generator
export { generateDemoData, generateLargeDataset } from "./utils/demo-data";

/**
 * Gantt namespace for compound component pattern.
 * Provides all components under a single namespace.
 */
import { GanttProvider } from "./context/gantt-context";
import {
  GanttCanvas,
  GanttTimeline,
  GanttSidebar,
  GanttToolbar,
  ZoomControls,
  ZoomButtons,
  ZoomSelect,
  UndoRedo,
  UndoButton,
  RedoButton,
  GroupingSelect,
  TodayButton,
} from "./components/composable";

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
