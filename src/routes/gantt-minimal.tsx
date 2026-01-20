import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef, useEffect } from "react";
import { format } from "date-fns";
import {
  Gantt,
  generateLargeDataset,
  useGanttViewport,
  useGanttZoom,
  useGanttActions,
  useGanttSelectedTaskIds,
  useGanttCanUndo,
  useGanttCanRedo,
} from "../features/gantt/composable";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/gantt-minimal")({
  component: GanttMinimal,
});

/**
 * Demo: Minimal canvas-only with custom controls
 *
 * This demonstrates building a completely custom UI using only
 * the canvas and individual control primitives. No built-in
 * toolbar or sidebar - everything is custom.
 */
function GanttMinimal() {
  const [taskCount, setTaskCount] = useState(500);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Generate demo data
  const demoData = useMemo(() => {
    return generateLargeDataset(taskCount);
  }, [taskCount]);

  // Handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <Gantt.Provider
      tasks={demoData.tasks}
      resources={demoData.resources}
      dependencies={demoData.dependencies}
      orders={demoData.orders}
      groups={demoData.groups}
      initialZoom="day"
    >
      <div className="flex flex-col h-screen bg-background">
        {/* Minimal header with custom controls */}
        <MinimalHeader taskCount={taskCount} onTaskCountChange={setTaskCount} />

        {/* Full-width canvas with overlays */}
        <div ref={containerRef} className="flex-1 relative">
          {/* Canvas fills entire area */}
          <Gantt.Canvas
            width={dimensions.width}
            height={dimensions.height}
            className="absolute inset-0"
          />

          {/* Overlaid controls */}
          <CornerControls />
          <TimeNavigator />
          <SelectionIndicator />
        </div>
      </div>
    </Gantt.Provider>
  );
}

function MinimalHeader({
  taskCount,
  onTaskCountChange,
}: {
  taskCount: number;
  onTaskCountChange: (count: number) => void;
}) {
  const viewport = useGanttViewport();
  const zoomLevel = useGanttZoom();

  // Calculate visible time range
  const visibleStartTime =
    viewport.timeOrigin + (viewport.scrollX / viewport.pixelsPerHour) * 3600000;
  const visibleEndTime =
    visibleStartTime + (viewport.width / viewport.pixelsPerHour) * 3600000;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-card/80 backdrop-blur-sm border-b border-border">
      {/* Left: Title and time range */}
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold text-foreground">
          Minimal Layout
        </h1>
        <div className="text-sm text-muted-foreground">
          {format(new Date(visibleStartTime), "MMM d")} -{" "}
          {format(new Date(visibleEndTime), "MMM d, yyyy")}
        </div>
        <div className="px-2 py-0.5 rounded bg-secondary text-xs text-secondary-foreground">
          {zoomLevel}
        </div>
      </div>

      {/* Right: Task count */}
      <div className="flex items-center gap-3">
        {[100, 500, 1000].map((count) => (
          <button
            type="button"
            key={count}
            onClick={() => onTaskCountChange(count)}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              taskCount === count
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {count}
          </button>
        ))}
      </div>
    </div>
  );
}

function CornerControls() {
  const { zoomViewport, undo, redo } = useGanttActions();
  const viewport = useGanttViewport();
  const canUndo = useGanttCanUndo();
  const canRedo = useGanttCanRedo();

  const handleZoomIn = () => zoomViewport(1.3, viewport.width / 2);
  const handleZoomOut = () => zoomViewport(0.7, viewport.width / 2);

  return (
    <div className="absolute top-4 left-4 flex flex-col gap-2">
      {/* Zoom controls */}
      <div className="flex flex-col bg-card/90 backdrop-blur-sm rounded-lg border border-border overflow-hidden">
        <IconButton onClick={handleZoomIn} title="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </IconButton>
        <div className="h-px bg-border" />
        <IconButton onClick={handleZoomOut} title="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </IconButton>
      </div>

      {/* Undo/Redo */}
      <div className="flex flex-col bg-card/90 backdrop-blur-sm rounded-lg border border-border overflow-hidden">
        <IconButton onClick={undo} disabled={!canUndo} title="Undo">
          <RotateCcw className="w-4 h-4" />
        </IconButton>
        <div className="h-px bg-border" />
        <IconButton onClick={redo} disabled={!canRedo} title="Redo">
          <RotateCw className="w-4 h-4" />
        </IconButton>
      </div>
    </div>
  );
}

function TimeNavigator() {
  const { scrollToTime, panViewport } = useGanttActions();
  const viewport = useGanttViewport();

  const handleToday = () => scrollToTime(Date.now());
  const handlePanLeft = () => panViewport(-viewport.width / 2, 0);
  const handlePanRight = () => panViewport(viewport.width / 2, 0);

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
      <div className="flex items-center gap-1 bg-card/90 backdrop-blur-sm rounded-full border border-border px-2 py-1">
        <IconButton onClick={handlePanLeft} title="Pan left" size="sm">
          <ChevronLeft className="w-4 h-4" />
        </IconButton>

        <button
          type="button"
          onClick={handleToday}
          className="flex items-center gap-1.5 px-3 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
        >
          <Calendar className="w-3.5 h-3.5" />
          Today
        </button>

        <IconButton onClick={handlePanRight} title="Pan right" size="sm">
          <ChevronRight className="w-4 h-4" />
        </IconButton>
      </div>
    </div>
  );
}

function SelectionIndicator() {
  const selectedTaskIds = useGanttSelectedTaskIds();
  const { clearSelection } = useGanttActions();

  if (selectedTaskIds.length === 0) return null;

  return (
    <div className="absolute top-4 right-4 flex items-center gap-2 bg-primary/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm text-primary-foreground">
      <span className="font-medium">{selectedTaskIds.length}</span>
      <span>selected</span>
      <button
        type="button"
        onClick={clearSelection}
        className="ml-2 px-2 py-0.5 bg-primary-foreground/20 hover:bg-primary-foreground/30 rounded text-xs transition-colors"
      >
        Clear
      </button>
    </div>
  );
}

function IconButton({
  children,
  onClick,
  disabled = false,
  title,
  size = "md",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  size?: "sm" | "md";
}) {
  const sizeClasses = {
    sm: "p-1.5",
    md: "p-2",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${sizeClasses[size]} text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-muted-foreground`}
    >
      {children}
    </button>
  );
}
