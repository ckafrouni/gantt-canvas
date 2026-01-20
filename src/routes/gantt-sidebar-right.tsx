import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Calendar, Clock, Flag, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Gantt,
	generateLargeDataset,
	type Task,
	type TaskPhase,
	useGanttActions,
	useGanttSelectedTasks,
	useGanttZoom,
} from "../features/gantt/composable";

export const Route = createFileRoute("/gantt-sidebar-right")({
	component: GanttSidebarRight,
});

/**
 * Demo: Sidebar on right with floating toolbar
 *
 * This layout places:
 * - Resource list integrated into a detail panel on the right
 * - Floating toolbar overlay at the bottom center
 * - Task detail panel when a task is selected
 */
function GanttSidebarRight() {
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

	const timelineHeight = 50;
	const headerHeight = 60;

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
							Right Sidebar + Floating Toolbar
						</h1>
						<p className="text-sm text-muted-foreground">
							Detail panel on right, floating controls
						</p>
					</div>

					<TaskCountSelector value={taskCount} onChange={setTaskCount} />
				</div>

				{/* Main content */}
				<div
					ref={containerRef}
					className="flex-1 flex overflow-hidden relative"
				>
					<MainContent
						dimensions={dimensions}
						timelineHeight={timelineHeight}
					/>
				</div>
			</div>
		</Gantt.Provider>
	);
}

function MainContent({
	dimensions,
	timelineHeight,
}: {
	dimensions: { width: number; height: number };
	timelineHeight: number;
}) {
	const selectedTasks = useGanttSelectedTasks();
	const showDetailPanel = selectedTasks.length > 0;

	const detailPanelWidth = showDetailPanel ? 320 : 0;
	const canvasWidth = Math.max(0, dimensions.width - detailPanelWidth);
	const canvasHeight = Math.max(0, dimensions.height - timelineHeight);

	return (
		<>
			{/* Main gantt area (no sidebar - full width) */}
			<div className="flex flex-col flex-1">
				<Gantt.Timeline width={canvasWidth} height={timelineHeight} />
				<Gantt.Canvas width={canvasWidth} height={canvasHeight} />
			</div>

			{/* Detail panel on right (appears when task selected) */}
			<div
				className="bg-card border-l border-border transition-all duration-300 overflow-hidden"
				style={{ width: detailPanelWidth }}
			>
				{showDetailPanel && <TaskDetailPanel />}
			</div>

			{/* Floating toolbar */}
			<div className="absolute bottom-6 left-1/2 -translate-x-1/2">
				<Gantt.Toolbar
					variant="floating"
					items={["zoom", "today", "grouping", "undo"]}
				/>
			</div>

			{/* Zoom level indicator */}
			<ZoomIndicator />
		</>
	);
}

function TaskDetailPanel() {
	const selectedTasks = useGanttSelectedTasks();
	const { clearSelection } = useGanttActions();

	if (selectedTasks.length === 0) return null;

	const task = selectedTasks[0];
	const multipleSelected = selectedTasks.length > 1;

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-border">
				<h3 className="text-sm font-medium text-foreground">
					{multipleSelected
						? `${selectedTasks.length} Tasks Selected`
						: "Task Details"}
				</h3>
				<button
					type="button"
					onClick={clearSelection}
					className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
				>
					<X className="w-4 h-4" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{multipleSelected ? (
					<MultiTaskSummary tasks={selectedTasks} />
				) : (
					<SingleTaskDetails task={task} />
				)}
			</div>
		</div>
	);
}

function SingleTaskDetails({ task }: { task: Task }) {
	return (
		<>
			{/* Task name */}
			<div>
				<span className="text-xs text-muted-foreground uppercase tracking-wide block">
					Name
				</span>
				<p className="text-sm text-foreground mt-1">{task.name}</p>
			</div>

			{/* Status badge */}
			<div>
				<span className="text-xs text-muted-foreground uppercase tracking-wide block">
					Status
				</span>
				<div className="mt-1">
					<StatusBadge status={task.status} />
				</div>
			</div>

			{/* Time info */}
			<div className="grid grid-cols-2 gap-4">
				<div>
					<span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
						<Calendar className="w-3 h-3" /> Start
					</span>
					<p className="text-sm text-foreground mt-1">
						{format(new Date(task.startTime), "MMM d, HH:mm")}
					</p>
				</div>
				<div>
					<span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
						<Clock className="w-3 h-3" /> Duration
					</span>
					<p className="text-sm text-foreground mt-1">
						{task._totalDuration} min
					</p>
				</div>
			</div>

			{/* Progress */}
			<div>
				<span className="text-xs text-muted-foreground uppercase tracking-wide block">
					Progress
				</span>
				<div className="mt-2">
					<div className="h-2 bg-secondary rounded-full overflow-hidden">
						<div
							className="h-full bg-primary transition-all"
							style={{ width: `${task.progress}%` }}
						/>
					</div>
					<p className="text-xs text-muted-foreground mt-1">{task.progress}%</p>
				</div>
			</div>

			{/* Priority */}
			<div>
				<span className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
					<Flag className="w-3 h-3" /> Priority
				</span>
				<p className="text-sm text-foreground mt-1">
					{["Lowest", "Low", "Medium", "High", "Highest"][task.priority - 1]}
				</p>
			</div>

			{/* Phases */}
			<div>
				<span className="text-xs text-muted-foreground uppercase tracking-wide block">
					Phases
				</span>
				<div className="mt-2 space-y-1">
					{task.phases.map((phase: TaskPhase) => (
						<div
							key={phase.type}
							className="flex items-center justify-between text-sm"
						>
							<span className="text-foreground/80 capitalize">
								{phase.type}
							</span>
							<span className="text-muted-foreground">
								{phase.duration} min
							</span>
						</div>
					))}
				</div>
			</div>
		</>
	);
}

function MultiTaskSummary({ tasks }: { tasks: Task[] }) {
	const totalDuration = tasks.reduce((sum, t) => sum + t._totalDuration, 0);
	const avgProgress = Math.round(
		tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length,
	);

	return (
		<>
			<div className="bg-secondary rounded-lg p-4 space-y-3">
				<div className="flex justify-between">
					<span className="text-muted-foreground">Total Duration</span>
					<span className="text-foreground font-medium">
						{totalDuration} min
					</span>
				</div>
				<div className="flex justify-between">
					<span className="text-muted-foreground">Average Progress</span>
					<span className="text-foreground font-medium">{avgProgress}%</span>
				</div>
			</div>

			<div>
				<span className="text-xs text-muted-foreground uppercase tracking-wide block">
					Selected Tasks
				</span>
				<div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
					{tasks.map((task) => (
						<div
							key={task.id}
							className="flex items-center justify-between text-sm py-1"
						>
							<span className="text-foreground/80 truncate">{task.name}</span>
							<StatusBadge status={task.status} size="sm" />
						</div>
					))}
				</div>
			</div>
		</>
	);
}

function StatusBadge({
	status,
	size = "md",
}: {
	status: string;
	size?: "sm" | "md";
}) {
	const colors = {
		scheduled: "bg-secondary text-secondary-foreground",
		in_progress: "bg-primary/20 text-primary",
		completed: "bg-success/20 text-success",
		blocked: "bg-destructive/20 text-destructive",
	};

	const sizeClasses = {
		sm: "px-1.5 py-0.5 text-xs",
		md: "px-2 py-1 text-xs",
	};

	return (
		<span
			className={`rounded ${colors[status as keyof typeof colors] || colors.scheduled} ${sizeClasses[size]}`}
		>
			{status.replace("_", " ")}
		</span>
	);
}

function ZoomIndicator() {
	const zoomLevel = useGanttZoom();

	return (
		<div className="absolute top-4 right-4 px-3 py-1.5 bg-card/80 backdrop-blur-sm rounded text-xs text-muted-foreground border border-border">
			Zoom: {zoomLevel}
		</div>
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
