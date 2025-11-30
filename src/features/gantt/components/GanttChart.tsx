import { useRef, useEffect, useState } from "react";
import { GanttCanvas } from "./GanttCanvas";
import { GanttSidebar } from "./GanttSidebar";
import { TimelineHeader } from "./TimelineHeader";
import { GanttToolbar } from "./GanttToolbar";
import { useVirtualRows, useVisibleRows } from "../hooks/useVirtualRows";
import { useGanttUIStore } from "../store/ui-store";
import { useGanttDataStore } from "../store/data-store";
import type {
  StoredTask,
  Resource,
  TaskDependency,
  Order,
  ResourceGroup,
} from "../types";

interface GanttChartProps {
  /** Initial tasks to display */
  tasks?: StoredTask[];
  /** Resources (machines, operators) */
  resources?: Resource[];
  /** Task dependencies */
  dependencies?: TaskDependency[];
  /** Orders for grouping */
  orders?: Order[];
  /** Resource groups */
  groups?: ResourceGroup[];
  /** Show toolbar */
  showToolbar?: boolean;
  /** Custom class name */
  className?: string;
}

export function GanttChart({
  tasks,
  resources,
  dependencies,
  orders,
  groups,
  showToolbar = true,
  className = "",
}: GanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const sidebarWidth = useGanttUIStore((s) => s.sidebarWidth);
  const initializeData = useGanttDataStore((s) => s.initializeData);

  // Initialize data when props change
  useEffect(() => {
    if (tasks && resources) {
      initializeData({
        tasks,
        resources,
        dependencies,
        orders,
        groups,
      });
    }
  }, [tasks, resources, dependencies, orders, groups, initializeData]);

  // Calculate virtual rows
  const virtualRows = useVirtualRows();
  const visibleRows = useVisibleRows(virtualRows);

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

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Calculate canvas dimensions
  const toolbarHeight = showToolbar ? 44 : 0;
  const timelineHeight = 50;
  const canvasWidth = Math.max(0, dimensions.width - sidebarWidth);
  const canvasHeight = Math.max(
    0,
    dimensions.height - toolbarHeight - timelineHeight,
  );

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-900 overflow-hidden ${className}`}
      style={{ width: "100%", height: "100%" }}
    >
      {/* Toolbar */}
      {showToolbar && <GanttToolbar />}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="flex flex-col" style={{ width: sidebarWidth }}>
          {/* Sidebar header */}
          <div
            className="flex items-center px-3 bg-slate-900 border-b border-slate-700 text-sm font-medium text-slate-400"
            style={{ height: timelineHeight }}
          >
            Resources
          </div>
          {/* Sidebar content */}
          <GanttSidebar
            virtualRows={virtualRows}
            width={sidebarWidth}
            height={canvasHeight}
          />
        </div>

        {/* Main area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Timeline header */}
          <TimelineHeader width={canvasWidth} height={timelineHeight} />

          {/* Canvas */}
          <div className="flex-1 overflow-hidden">
            <GanttCanvas
              virtualRows={virtualRows}
              visibleRows={visibleRows}
              width={canvasWidth}
              height={canvasHeight}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
