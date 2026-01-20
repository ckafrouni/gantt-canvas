import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Gantt,
	generateLargeDataset,
	useGanttSelectedTasks,
} from "../features/gantt/composable";

export const Route = createFileRoute("/gantt-bottom-toolbar")({
	component: GanttBottomToolbar,
});

/**
 * Demo: Toolbar at bottom layout
 *
 * This layout places the toolbar at the bottom of the screen,
 * similar to video editing software like Premiere or DaVinci Resolve.
 */
function GanttBottomToolbar() {
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

	const sidebarWidth = 200;
	const timelineHeight = 50;
	const toolbarHeight = 48;
	const headerHeight = 60;

	const canvasWidth = Math.max(0, dimensions.width - sidebarWidth);
	const canvasHeight = Math.max(
		0,
		dimensions.height - timelineHeight - toolbarHeight - headerHeight,
	);

	return (
		<Gantt.Provider
			tasks={demoData.tasks}
			resources={demoData.resources}
			dependencies={demoData.dependencies}
			orders={demoData.orders}
			groups={demoData.groups}
		>
			<div className="flex flex-col h-screen bg-background">
				{/* Header */}
				<div
					className="flex items-center justify-between px-6 bg-card border-b border-border"
					style={{ height: headerHeight }}
				>
					<div>
						<h1 className="text-xl font-semibold text-foreground">
							Bottom Toolbar Layout
						</h1>
						<p className="text-sm text-muted-foreground">
							Toolbar at bottom, like video editing software
						</p>
					</div>

					{/* Task count selector */}
					<TaskCountSelector value={taskCount} onChange={setTaskCount} />
				</div>

				{/* Main content area */}
				<div ref={containerRef} className="flex-1 flex overflow-hidden">
					{/* Sidebar on left */}
					<div className="flex flex-col" style={{ width: sidebarWidth }}>
						<div
							className="flex items-center px-3 bg-card border-b border-border text-sm font-medium text-muted-foreground"
							style={{ height: timelineHeight }}
						>
							Resources
						</div>
						<Gantt.Sidebar width={sidebarWidth} height={canvasHeight} />
					</div>

					{/* Main area with timeline and canvas */}
					<div className="flex flex-col flex-1">
						<Gantt.Timeline width={canvasWidth} height={timelineHeight} />
						<Gantt.Canvas width={canvasWidth} height={canvasHeight} />
					</div>
				</div>

				{/* Toolbar at bottom */}
				<Gantt.Toolbar position="bottom" className="px-6" />

				{/* Selection info bar */}
				<SelectionInfoBar />
			</div>
		</Gantt.Provider>
	);
}

function TaskCountSelector({
	value,
	onChange,
}: {
	value: number;
	onChange: (count: number) => void;
}) {
	return (
		<div className="flex items-center gap-4">
			<span className="text-sm text-muted-foreground">Tasks:</span>
			<div className="flex gap-2">
				{[100, 500, 1000, 2500].map((count) => (
					<button
						type="button"
						key={count}
						onClick={() => onChange(count)}
						className={`px-3 py-1.5 text-sm rounded transition-colors ${
							value === count
								? "bg-primary text-primary-foreground"
								: "bg-secondary text-secondary-foreground hover:bg-accent"
						}`}
					>
						{count >= 1000 ? `${count / 1000}k` : count}
					</button>
				))}
			</div>
		</div>
	);
}

function SelectionInfoBar() {
	const selectedTasks = useGanttSelectedTasks();

	if (selectedTasks.length === 0) {
		return (
			<div className="px-6 py-2 bg-card border-t border-border text-sm text-muted-foreground">
				Click a task to select it, or drag to move/resize
			</div>
		);
	}

	return (
		<div className="px-6 py-2 bg-card border-t border-border">
			<div className="flex items-center gap-6 text-sm">
				<span className="text-primary font-medium">
					{selectedTasks.length} task{selectedTasks.length > 1 ? "s" : ""}{" "}
					selected
				</span>
				{selectedTasks.length === 1 && (
					<>
						<span className="text-muted-foreground">
							Name:{" "}
							<span className="text-foreground">{selectedTasks[0].name}</span>
						</span>
						<span className="text-muted-foreground">
							Status:{" "}
							<span className="text-foreground">{selectedTasks[0].status}</span>
						</span>
						<span className="text-muted-foreground">
							Progress:{" "}
							<span className="text-foreground">
								{selectedTasks[0].progress}%
							</span>
						</span>
					</>
				)}
			</div>
		</div>
	);
}
