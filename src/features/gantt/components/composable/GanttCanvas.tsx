import { useRef, useEffect, useCallback } from "react";
import type { VirtualRow } from "../../types";
import {
  useGanttViewport,
  useGanttSelection,
  useGanttDrag,
  useGanttHoveredTaskId,
  useGanttTasks,
  useGanttDependencies,
  useGanttActions,
  useGanttMinResolution,
} from "../../context/gantt-context";
import { getIndexManager } from "../../indexes/index-manager";
import {
  getRenderScheduler,
  resetRenderScheduler,
} from "../../engine/render-scheduler";
import { ViewportManager } from "../../engine/viewport-manager";
import { getGridRenderer } from "../../renderers/grid-renderer";
import { getTaskRenderer } from "../../renderers/task-renderer";
import { getDependencyRenderer } from "../../renderers/dependency-renderer";
import { getInteractionRenderer } from "../../renderers/interaction-renderer";
import { useComposableGanttInteractions } from "../../hooks/useComposableGanttInteractions";
import { setupHighDPICanvas } from "../../utils/canvas-utils";
import {
  useComposableVirtualRows,
  useComposableVisibleRows,
} from "../../hooks/useComposableVirtualRows";

export interface GanttCanvasProps {
  /** Width of the canvas (required) */
  width: number;
  /** Height of the canvas (required) */
  height: number;
  /** Customize which layers to render */
  layers?: Array<"grid" | "tasks" | "dependencies" | "interaction">;
  /** Additional class name */
  className?: string;
  /** External virtual rows (optional - uses internal calculation if not provided) */
  virtualRows?: VirtualRow[];
  /** External visible rows (optional - uses internal calculation if not provided) */
  visibleRows?: VirtualRow[];
}

/**
 * Main canvas component for rendering the Gantt chart.
 * Uses 4 layered canvases for efficient partial redraws.
 */
export function GanttCanvas({
  width,
  height,
  layers = ["grid", "tasks", "dependencies", "interaction"],
  className = "",
  virtualRows: externalVirtualRows,
  visibleRows: externalVisibleRows,
}: GanttCanvasProps) {
  // Canvas refs for each layer
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const taskCanvasRef = useRef<HTMLCanvasElement>(null);
  const dependencyCanvasRef = useRef<HTMLCanvasElement>(null);
  const interactionCanvasRef = useRef<HTMLCanvasElement>(null);

  // Viewport manager ref
  const viewportManagerRef = useRef<ViewportManager | null>(null);

  // Get state from context
  const viewport = useGanttViewport();
  const selection = useGanttSelection();
  const drag = useGanttDrag();
  const hoveredTaskId = useGanttHoveredTaskId();
  const tasks = useGanttTasks();
  const dependencies = useGanttDependencies();
  const minResolution = useGanttMinResolution();
  const { setViewport } = useGanttActions();

  // Use external virtual rows if provided, otherwise compute internally
  const internalVirtualRows = useComposableVirtualRows();
  const virtualRows = externalVirtualRows ?? internalVirtualRows;

  const internalVisibleRows = useComposableVisibleRows(virtualRows);
  const visibleRows = externalVisibleRows ?? internalVisibleRows;

  // Initialize viewport manager with current viewport
  useEffect(() => {
    viewportManagerRef.current = new ViewportManager(viewport);
  }, [viewport]);

  // Update canvas rect for hit detection when canvas element changes
  const updateCanvasRect = useCallback(() => {
    if (viewportManagerRef.current && interactionCanvasRef.current) {
      viewportManagerRef.current.setCanvasRect(
        interactionCanvasRef.current.getBoundingClientRect(),
      );
    }
  }, []);

  // Update viewport dimensions from props
  useEffect(() => {
    if (width > 0 && height > 0) {
      setViewport({ width, height });
      updateCanvasRect();
    }
  }, [width, height, setViewport, updateCanvasRect]);

  // Setup canvases for high-DPI
  useEffect(() => {
    if (width <= 0 || height <= 0) return;

    if (layers.includes("grid") && gridCanvasRef.current) {
      const gridCtx = setupHighDPICanvas(gridCanvasRef.current, width, height);
      getGridRenderer().setContext(gridCtx, width, height);
    }

    if (layers.includes("tasks") && taskCanvasRef.current) {
      const taskCtx = setupHighDPICanvas(taskCanvasRef.current, width, height);
      getTaskRenderer().setContext(taskCtx, width, height);
    }

    if (layers.includes("dependencies") && dependencyCanvasRef.current) {
      const depCtx = setupHighDPICanvas(dependencyCanvasRef.current, width, height);
      getDependencyRenderer().setContext(depCtx, width, height);
    }

    if (layers.includes("interaction") && interactionCanvasRef.current) {
      const interactionCtx = setupHighDPICanvas(interactionCanvasRef.current, width, height);
      getInteractionRenderer().setContext(interactionCtx, width, height);
    }

    // Mark all layers dirty
    getRenderScheduler().markAllDirty();
  }, [width, height, layers]);

  // Build indexes when data changes
  useEffect(() => {
    const taskList = Object.values(tasks);
    const depList = Object.values(dependencies);
    getIndexManager().buildIndexes(taskList, depList, virtualRows);
    getRenderScheduler().markDirtyMany(["tasks", "dependencies"]);
  }, [tasks, dependencies, virtualRows]);

  // Register renderers and trigger renders when state changes
  useEffect(() => {
    const scheduler = getRenderScheduler();

    if (layers.includes("grid")) {
      scheduler.registerRenderer("grid", () => {
        getGridRenderer().render(viewport, visibleRows, null);
      });
    }

    if (layers.includes("tasks")) {
      scheduler.registerRenderer("tasks", () => {
        getTaskRenderer().render(
          viewport,
          tasks,
          visibleRows,
          selection.taskIds,
          hoveredTaskId,
        );
      });
    }

    if (layers.includes("dependencies")) {
      scheduler.registerRenderer("dependencies", () => {
        const depList = Object.values(dependencies);
        getDependencyRenderer().render(
          viewport,
          tasks,
          depList,
          visibleRows,
          selection.taskIds,
        );
      });
    }

    if (layers.includes("interaction")) {
      scheduler.registerRenderer("interaction", () => {
        getInteractionRenderer().render(viewport, drag, null, tasks, minResolution);
      });
    }

    // Mark all dirty on state change
    scheduler.markAllDirty();

    return () => {
      if (layers.includes("grid")) scheduler.unregisterRenderer("grid");
      if (layers.includes("tasks")) scheduler.unregisterRenderer("tasks");
      if (layers.includes("dependencies")) scheduler.unregisterRenderer("dependencies");
      if (layers.includes("interaction")) scheduler.unregisterRenderer("interaction");
    };
  }, [viewport, visibleRows, tasks, dependencies, selection, hoveredTaskId, drag, layers, minResolution]);

  // Initialize interactions
  useComposableGanttInteractions(interactionCanvasRef, viewportManagerRef.current);

  // Cleanup
  useEffect(() => {
    return () => {
      resetRenderScheduler();
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Grid layer */}
      {layers.includes("grid") && (
        <canvas
          ref={gridCanvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width, height }}
        />
      )}
      {/* Task layer */}
      {layers.includes("tasks") && (
        <canvas
          ref={taskCanvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width, height }}
        />
      )}
      {/* Dependency layer */}
      {layers.includes("dependencies") && (
        <canvas
          ref={dependencyCanvasRef}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ width, height }}
        />
      )}
      {/* Interaction layer (captures events) */}
      {layers.includes("interaction") && (
        <canvas
          ref={interactionCanvasRef}
          className="absolute top-0 left-0"
          style={{ width, height }}
        />
      )}
    </div>
  );
}
