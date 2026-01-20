import { Calendar, Layers, Redo, Undo, ZoomIn, ZoomOut } from "lucide-react";
import { useGanttDataStore } from "../store/data-store";
import { useGanttUIStore } from "../store/ui-store";
import type { GroupingMode, ZoomLevel } from "../types";

interface GanttToolbarProps {
	onScrollToToday?: () => void;
}

export function GanttToolbar({ onScrollToToday }: GanttToolbarProps) {
	const zoomLevel = useGanttUIStore((s) => s.viewport.zoomLevel);
	const setZoomLevel = useGanttUIStore((s) => s.setZoomLevel);
	const zoomViewport = useGanttUIStore((s) => s.zoomViewport);
	const groupingMode = useGanttUIStore((s) => s.grouping.mode);
	const setGroupingMode = useGanttUIStore((s) => s.setGroupingMode);
	const viewport = useGanttUIStore((s) => s.viewport);
	const scrollToTime = useGanttUIStore((s) => s.scrollToTime);

	const handleZoomIn = () => {
		zoomViewport(1.25, viewport.width / 2);
	};

	const handleZoomOut = () => {
		zoomViewport(0.8, viewport.width / 2);
	};

	const handleUndo = () => {
		useGanttDataStore.temporal.getState().undo();
	};

	const handleRedo = () => {
		useGanttDataStore.temporal.getState().redo();
	};

	const handleScrollToToday = () => {
		scrollToTime(Date.now());
		onScrollToToday?.();
	};

	const zoomLevels: { value: ZoomLevel; label: string }[] = [
		{ value: "hour", label: "Hour" },
		{ value: "day", label: "Day" },
		{ value: "week", label: "Week" },
		{ value: "month", label: "Month" },
	];

	const groupingModes: { value: GroupingMode; label: string }[] = [
		{ value: "none", label: "No Grouping" },
		{ value: "resource_type", label: "By Type" },
		{ value: "order", label: "By Order" },
	];

	return (
		<div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
			{/* Zoom controls */}
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={handleZoomOut}
					className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
					title="Zoom out"
				>
					<ZoomOut className="w-4 h-4" />
				</button>

				<select
					value={zoomLevel}
					onChange={(e) => setZoomLevel(e.target.value as ZoomLevel)}
					className="px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
				>
					{zoomLevels.map((level) => (
						<option key={level.value} value={level.value}>
							{level.label}
						</option>
					))}
				</select>

				<button
					type="button"
					onClick={handleZoomIn}
					className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
					title="Zoom in"
				>
					<ZoomIn className="w-4 h-4" />
				</button>
			</div>

			{/* Divider */}
			<div className="w-px h-6 bg-slate-600" />

			{/* Today button */}
			<button
				type="button"
				onClick={handleScrollToToday}
				className="flex items-center gap-1.5 px-2 py-1 text-sm rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
				title="Scroll to today"
			>
				<Calendar className="w-4 h-4" />
				<span>Today</span>
			</button>

			{/* Divider */}
			<div className="w-px h-6 bg-slate-600" />

			{/* Grouping */}
			<div className="flex items-center gap-1.5">
				<Layers className="w-4 h-4 text-slate-500" />
				<select
					value={groupingMode}
					onChange={(e) => setGroupingMode(e.target.value as GroupingMode)}
					className="px-2 py-1 text-sm bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
				>
					{groupingModes.map((mode) => (
						<option key={mode.value} value={mode.value}>
							{mode.label}
						</option>
					))}
				</select>
			</div>

			{/* Spacer */}
			<div className="flex-1" />

			{/* Undo/Redo */}
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={handleUndo}
					className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
					title="Undo (Ctrl+Z)"
				>
					<Undo className="w-4 h-4" />
				</button>
				<button
					type="button"
					onClick={handleRedo}
					className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
					title="Redo (Ctrl+Shift+Z)"
				>
					<Redo className="w-4 h-4" />
				</button>
			</div>
		</div>
	);
}
