import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { GanttChart } from "../features/gantt";
import { generateLargeDataset } from "../features/gantt/utils/demo-data";

export const Route = createFileRoute("/gantt")({
  component: GanttDemo,
});

function GanttDemo() {
  const [taskCount, setTaskCount] = useState(500);
  const [isLoading, setIsLoading] = useState(false);

  // Generate demo data
  const demoData = useMemo(() => {
    console.time("Generate data");
    const data = generateLargeDataset(taskCount);
    console.timeEnd("Generate data");
    return data;
  }, [taskCount]);

  const handleTaskCountChange = (count: number) => {
    setIsLoading(true);
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      setTaskCount(count);
      setIsLoading(false);
    }, 10);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold text-white">Gantt Chart Demo</h1>
          <p className="text-sm text-slate-400 mt-1">
            High-performance production scheduling visualization
          </p>
        </div>

        {/* Task count selector */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">Task count:</span>
          <div className="flex gap-2">
            {[100, 500, 1000, 2500, 5000, 10000].map((count) => (
              <button
                type="button"
                key={count}
                onClick={() => handleTaskCountChange(count)}
                disabled={isLoading}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  taskCount === count
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {count >= 1000 ? `${count / 1000}k` : count}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 px-6 py-2 bg-slate-800/50 border-b border-slate-800 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Tasks:</span>
          <span className="text-slate-300 font-medium">
            {demoData.tasks.length.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Resources:</span>
          <span className="text-slate-300 font-medium">
            {demoData.resources.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Dependencies:</span>
          <span className="text-slate-300 font-medium">
            {demoData.dependencies.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500">Orders:</span>
          <span className="text-slate-300 font-medium">
            {demoData.orders.length}
          </span>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-400">Loading...</div>
          </div>
        ) : (
          <GanttChart
            tasks={demoData.tasks}
            resources={demoData.resources}
            dependencies={demoData.dependencies}
            orders={demoData.orders}
            groups={demoData.groups}
            showToolbar={true}
            className="h-full"
          />
        )}
      </div>

      {/* Instructions */}
      <div className="px-6 py-3 bg-slate-900 border-t border-slate-800">
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <span>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">
              Click
            </kbd>{" "}
            to select task
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">
              Drag
            </kbd>{" "}
            to move/reschedule
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">
              Drag edges
            </kbd>{" "}
            to resize
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">
              Scroll
            </kbd>{" "}
            to pan
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">
              Ctrl+Scroll
            </kbd>{" "}
            to zoom
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">
              Ctrl+Z
            </kbd>{" "}
            to undo
          </span>
          <span>
            <kbd className="px-1 py-0.5 bg-slate-700 rounded text-slate-400">
              Esc
            </kbd>{" "}
            to cancel/deselect
          </span>
        </div>
      </div>
    </div>
  );
}
