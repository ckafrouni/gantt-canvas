import { useCallback, useEffect, useRef } from "react";
import {
	getRenderScheduler,
	resetRenderScheduler,
} from "../engine/render-scheduler";
import { ViewportManager } from "../engine/viewport-manager";
import { useGanttInteractions } from "../hooks/useGanttInteractions";
import { getIndexManager } from "../indexes/index-manager";
import { getDependencyRenderer } from "../renderers/dependency-renderer";
import { getGridRenderer } from "../renderers/grid-renderer";
import { getInteractionRenderer } from "../renderers/interaction-renderer";
import { getTaskRenderer } from "../renderers/task-renderer";
import { useGanttDataStore } from "../store/data-store";
import { useGanttUIStore } from "../store/ui-store";
import type { VirtualRow } from "../types";
import { setupHighDPICanvas } from "../utils/canvas-utils";

interface GanttCanvasProps {
	virtualRows: VirtualRow[];
	visibleRows: VirtualRow[];
	width: number;
	height: number;
}

export function GanttCanvas({
	virtualRows,
	visibleRows,
	width,
	height,
}: GanttCanvasProps) {
	// Canvas refs for each layer
	const gridCanvasRef = useRef<HTMLCanvasElement>(null);
	const taskCanvasRef = useRef<HTMLCanvasElement>(null);
	const dependencyCanvasRef = useRef<HTMLCanvasElement>(null);
	const interactionCanvasRef = useRef<HTMLCanvasElement>(null);

	// Viewport manager ref
	const viewportManagerRef = useRef<ViewportManager | null>(null);

	// Store state
	const viewport = useGanttUIStore((s) => s.viewport);
	const selection = useGanttUIStore((s) => s.selection);
	const drag = useGanttUIStore((s) => s.drag);
	const hoveredTaskId = useGanttUIStore((s) => s.hoveredTaskId);
	const setViewport = useGanttUIStore((s) => s.setViewport);

	const tasks = useGanttDataStore((s) => s.tasks);
	const dependencies = useGanttDataStore((s) => s.dependencies);

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
		if (
			!gridCanvasRef.current ||
			!taskCanvasRef.current ||
			!dependencyCanvasRef.current ||
			!interactionCanvasRef.current
		) {
			return;
		}

		if (width <= 0 || height <= 0) return;

		const gridCtx = setupHighDPICanvas(gridCanvasRef.current, width, height);
		const taskCtx = setupHighDPICanvas(taskCanvasRef.current, width, height);
		const depCtx = setupHighDPICanvas(
			dependencyCanvasRef.current,
			width,
			height,
		);
		const interactionCtx = setupHighDPICanvas(
			interactionCanvasRef.current,
			width,
			height,
		);

		// Set contexts on renderers
		getGridRenderer().setContext(gridCtx, width, height);
		getTaskRenderer().setContext(taskCtx, width, height);
		getDependencyRenderer().setContext(depCtx, width, height);
		getInteractionRenderer().setContext(interactionCtx, width, height);

		// Mark all layers dirty
		getRenderScheduler().markAllDirty();
	}, [width, height]);

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

		scheduler.registerRenderer("grid", () => {
			getGridRenderer().render(viewport, visibleRows, null);
		});

		scheduler.registerRenderer("tasks", () => {
			getTaskRenderer().render(
				viewport,
				tasks,
				visibleRows,
				selection.taskIds,
				hoveredTaskId,
			);
		});

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

		scheduler.registerRenderer("interaction", () => {
			// Default minResolution of 30 minutes for non-composable version
			getInteractionRenderer().render(viewport, drag, null, tasks, 30);
		});

		// Mark all dirty on state change
		scheduler.markAllDirty();

		return () => {
			scheduler.unregisterRenderer("grid");
			scheduler.unregisterRenderer("tasks");
			scheduler.unregisterRenderer("dependencies");
			scheduler.unregisterRenderer("interaction");
		};
	}, [
		viewport,
		visibleRows,
		tasks,
		dependencies,
		selection,
		hoveredTaskId,
		drag,
	]);

	// Initialize interactions
	useGanttInteractions(interactionCanvasRef, viewportManagerRef.current);

	// Cleanup
	useEffect(() => {
		return () => {
			resetRenderScheduler();
		};
	}, []);

	return (
		<div className="relative w-full h-full overflow-hidden">
			{/* Grid layer */}
			<canvas
				ref={gridCanvasRef}
				className="absolute top-0 left-0 pointer-events-none"
				style={{ width, height }}
			/>
			{/* Task layer */}
			<canvas
				ref={taskCanvasRef}
				className="absolute top-0 left-0 pointer-events-none"
				style={{ width, height }}
			/>
			{/* Dependency layer */}
			<canvas
				ref={dependencyCanvasRef}
				className="absolute top-0 left-0 pointer-events-none"
				style={{ width, height }}
			/>
			{/* Interaction layer (captures events) */}
			<canvas
				ref={interactionCanvasRef}
				className="absolute top-0 left-0"
				style={{ width, height }}
			/>
		</div>
	);
}
