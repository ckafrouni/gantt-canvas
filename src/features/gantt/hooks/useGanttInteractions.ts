import { useCallback, useRef, useEffect } from "react";
import type { TaskId, HitZone, DragType } from "../types";
import { useGanttUIStore } from "../store/ui-store";
import { useGanttDataStore } from "../store/data-store";
import { getIndexManager } from "../indexes/index-manager";
import type { ViewportManager } from "../engine/viewport-manager";

const DRAG_THRESHOLD = 5; // Pixels before drag starts
const RESIZE_HANDLE_WIDTH = 8; // Pixels

interface InteractionState {
  isMouseDown: boolean;
  mouseDownX: number;
  mouseDownY: number;
  mouseDownTime: number;
  hitTaskId: TaskId | null;
  hitZone: HitZone;
  isDragging: boolean;
}

/**
 * Hook for handling all Gantt chart interactions
 */
export function useGanttInteractions(
  canvasRef: React.RefObject<HTMLCanvasElement>,
  viewportManager: ViewportManager | null,
) {
  const interactionState = useRef<InteractionState>({
    isMouseDown: false,
    mouseDownX: 0,
    mouseDownY: 0,
    mouseDownTime: 0,
    hitTaskId: null,
    hitZone: null,
    isDragging: false,
  });

  const selection = useGanttUIStore((s) => s.selection);
  const drag = useGanttUIStore((s) => s.drag);

  const selectTask = useGanttUIStore((s) => s.selectTask);
  const clearSelection = useGanttUIStore((s) => s.clearSelection);
  const setHoveredTask = useGanttUIStore((s) => s.setHoveredTask);
  const startDrag = useGanttUIStore((s) => s.startDrag);
  const updateDrag = useGanttUIStore((s) => s.updateDrag);
  const commitDrag = useGanttUIStore((s) => s.commitDrag);
  const cancelDrag = useGanttUIStore((s) => s.cancelDrag);
  const panViewport = useGanttUIStore((s) => s.panViewport);
  const zoomViewport = useGanttUIStore((s) => s.zoomViewport);

  const tasks = useGanttDataStore((s) => s.tasks);

  /**
   * Detect which task and zone is under the cursor
   */
  const hitTest = useCallback(
    (
      clientX: number,
      clientY: number,
    ): { taskId: TaskId | null; zone: HitZone } => {
      if (!canvasRef.current || !viewportManager) {
        return { taskId: null, zone: null };
      }

      const rect = canvasRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Convert to data coordinates
      const dataCoords = viewportManager.viewportToData(x, y);
      const indexManager = getIndexManager();

      // Query spatial index
      const hitTaskIds = indexManager.queryPoint(
        dataCoords.timestamp,
        dataCoords.virtualY,
      );

      if (hitTaskIds.length === 0) {
        return { taskId: null, zone: null };
      }

      const taskId = hitTaskIds[0];
      const task = tasks[taskId];

      if (!task) {
        return { taskId: null, zone: null };
      }

      // Determine hit zone (resize handles or body)
      const taskX = viewportManager.timeToX(task.startTime);
      const taskWidth = viewportManager.durationToWidth(
        task._endTime - task.startTime,
      );

      if (x < taskX + RESIZE_HANDLE_WIDTH) {
        return { taskId, zone: "resize-start" };
      } else if (x > taskX + taskWidth - RESIZE_HANDLE_WIDTH) {
        return { taskId, zone: "resize-end" };
      } else {
        return { taskId, zone: "body" };
      }
    },
    [canvasRef, viewportManager, tasks],
  );

  /**
   * Update cursor based on hit zone
   */
  const updateCursor = useCallback(
    (zone: HitZone, isDragging: boolean) => {
      if (!canvasRef.current) return;

      if (isDragging) {
        canvasRef.current.style.cursor = "grabbing";
      } else if (zone === "resize-start" || zone === "resize-end") {
        canvasRef.current.style.cursor = "ew-resize";
      } else if (zone === "body") {
        canvasRef.current.style.cursor = "grab";
      } else {
        canvasRef.current.style.cursor = "default";
      }
    },
    [canvasRef],
  );

  /**
   * Handle mouse down
   */
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click

      const { taskId, zone } = hitTest(e.clientX, e.clientY);

      interactionState.current = {
        isMouseDown: true,
        mouseDownX: e.clientX,
        mouseDownY: e.clientY,
        mouseDownTime: Date.now(),
        hitTaskId: taskId,
        hitZone: zone,
        isDragging: false,
      };

      // Prevent text selection during drag
      e.preventDefault();
    },
    [hitTest],
  );

  /**
   * Handle mouse move
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const state = interactionState.current;

      if (state.isMouseDown) {
        const deltaX = e.clientX - state.mouseDownX;
        const deltaY = e.clientY - state.mouseDownY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Check if we should start dragging
        if (!state.isDragging && distance > DRAG_THRESHOLD) {
          state.isDragging = true;

          if (state.hitTaskId && state.hitZone) {
            // Start task drag
            let dragType: DragType;
            if (state.hitZone === "resize-start") {
              dragType = "resize-start";
            } else if (state.hitZone === "resize-end") {
              dragType = "resize-end";
            } else {
              dragType = "move";
            }

            startDrag(
              state.hitTaskId,
              dragType,
              state.mouseDownX,
              state.mouseDownY,
            );
          }
        }

        // Update drag state
        if (state.isDragging && drag) {
          updateDrag(e.clientX, e.clientY);
        } else if (state.isDragging && !state.hitTaskId) {
          // Pan the viewport
          panViewport(-deltaX, -deltaY);
          state.mouseDownX = e.clientX;
          state.mouseDownY = e.clientY;
        }

        updateCursor(state.hitZone, true);
      } else {
        // Just hovering - update hover state
        const { taskId, zone } = hitTest(e.clientX, e.clientY);
        setHoveredTask(taskId);
        updateCursor(zone, false);
      }
    },
    [
      hitTest,
      drag,
      startDrag,
      updateDrag,
      panViewport,
      setHoveredTask,
      updateCursor,
    ],
  );

  /**
   * Handle mouse up
   */
  const handleMouseUp = useCallback(
    (e: MouseEvent) => {
      const state = interactionState.current;

      if (state.isDragging) {
        if (drag) {
          commitDrag();
        }
      } else if (state.hitTaskId) {
        // Click on task - select it
        const isMultiSelect = e.ctrlKey || e.metaKey;
        const isRangeSelect = e.shiftKey;

        if (isMultiSelect) {
          selectTask(state.hitTaskId, "toggle");
        } else if (isRangeSelect) {
          // TODO: Implement range selection
          selectTask(state.hitTaskId, "add");
        } else {
          selectTask(state.hitTaskId, "replace");
        }
      } else {
        // Click on empty space - clear selection
        clearSelection();
      }

      // Reset state
      interactionState.current = {
        isMouseDown: false,
        mouseDownX: 0,
        mouseDownY: 0,
        mouseDownTime: 0,
        hitTaskId: null,
        hitZone: null,
        isDragging: false,
      };

      // Reset cursor
      const { zone } = hitTest(e.clientX, e.clientY);
      updateCursor(zone, false);
    },
    [drag, commitDrag, selectTask, clearSelection, hitTest, updateCursor],
  );

  /**
   * Handle mouse wheel (zoom)
   */
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();

      if (!canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;

      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        zoomViewport(zoomFactor, x);
      } else {
        // Pan
        panViewport(e.deltaX, e.deltaY);
      }
    },
    [canvasRef, zoomViewport, panViewport],
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Escape - cancel drag or clear selection
      if (e.key === "Escape") {
        if (drag) {
          cancelDrag();
        } else {
          clearSelection();
        }
      }

      // Delete - delete selected tasks
      if (e.key === "Delete" || e.key === "Backspace") {
        const deleteTask = useGanttDataStore.getState().deleteTask;
        for (const taskId of selection.taskIds) {
          deleteTask(taskId);
        }
        clearSelection();
      }

      // Ctrl+A - select all
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        useGanttUIStore.getState().selectAllTasks();
      }

      // Ctrl+Z - undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useGanttDataStore.temporal.getState().undo();
      }

      // Ctrl+Shift+Z or Ctrl+Y - redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        useGanttDataStore.temporal.getState().redo();
      }
    },
    [drag, selection, cancelDrag, clearSelection],
  );

  // Attach event listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("wheel", handleWheel);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    canvasRef,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    handleKeyDown,
  ]);

  return {
    hitTest,
  };
}
