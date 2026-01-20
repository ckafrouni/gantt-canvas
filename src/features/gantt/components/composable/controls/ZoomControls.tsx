import { ZoomIn, ZoomOut } from "lucide-react";
import {
	useGanttActions,
	useGanttViewport,
	useGanttZoom,
} from "../../../context/gantt-context";
import type { ZoomLevel } from "../../../types";

export interface ZoomButtonsProps {
	/** Size variant */
	size?: "sm" | "md" | "lg";
	/** Additional class name */
	className?: string;
}

const sizeClasses = {
	sm: "p-1",
	md: "p-1.5",
	lg: "p-2",
};

const iconSizes = {
	sm: "w-3 h-3",
	md: "w-4 h-4",
	lg: "w-5 h-5",
};

/**
 * Zoom in/out buttons.
 */
export function ZoomButtons({ size = "md", className = "" }: ZoomButtonsProps) {
	const viewport = useGanttViewport();
	const { zoomViewport } = useGanttActions();

	const handleZoomIn = () => {
		zoomViewport(1.25, viewport.width / 2);
	};

	const handleZoomOut = () => {
		zoomViewport(0.8, viewport.width / 2);
	};

	return (
		<div className={`flex items-center gap-1 ${className}`}>
			<button
				type="button"
				onClick={handleZoomOut}
				className={`${sizeClasses[size]} rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors`}
				title="Zoom out"
			>
				<ZoomOut className={iconSizes[size]} />
			</button>
			<button
				type="button"
				onClick={handleZoomIn}
				className={`${sizeClasses[size]} rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors`}
				title="Zoom in"
			>
				<ZoomIn className={iconSizes[size]} />
			</button>
		</div>
	);
}

export interface ZoomSelectProps {
	/** Size variant */
	size?: "sm" | "md" | "lg";
	/** Additional class name */
	className?: string;
}

const selectSizes = {
	sm: "px-1.5 py-0.5 text-xs",
	md: "px-2 py-1 text-sm",
	lg: "px-3 py-1.5 text-base",
};

/**
 * Zoom level dropdown selector.
 */
export function ZoomSelect({ size = "md", className = "" }: ZoomSelectProps) {
	const zoomLevel = useGanttZoom();
	const { setZoomLevel } = useGanttActions();

	const zoomLevels: { value: ZoomLevel; label: string }[] = [
		{ value: "hour", label: "Hour" },
		{ value: "day", label: "Day" },
		{ value: "week", label: "Week" },
		{ value: "month", label: "Month" },
	];

	return (
		<select
			value={zoomLevel}
			onChange={(e) => setZoomLevel(e.target.value as ZoomLevel)}
			className={`${selectSizes[size]} bg-secondary border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring ${className}`}
		>
			{zoomLevels.map((level) => (
				<option key={level.value} value={level.value}>
					{level.label}
				</option>
			))}
		</select>
	);
}

export interface ZoomControlsProps {
	/** Size variant */
	size?: "sm" | "md" | "lg";
	/** Show the dropdown selector */
	showSelect?: boolean;
	/** Additional class name */
	className?: string;
}

/**
 * Combined zoom controls with buttons and optional dropdown.
 */
export function ZoomControls({
	size = "md",
	showSelect = true,
	className = "",
}: ZoomControlsProps) {
	const viewport = useGanttViewport();
	const { zoomViewport } = useGanttActions();

	const handleZoomIn = () => {
		zoomViewport(1.25, viewport.width / 2);
	};

	const handleZoomOut = () => {
		zoomViewport(0.8, viewport.width / 2);
	};

	return (
		<div className={`flex items-center gap-1 ${className}`}>
			<button
				type="button"
				onClick={handleZoomOut}
				className={`${sizeClasses[size]} rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors`}
				title="Zoom out"
			>
				<ZoomOut className={iconSizes[size]} />
			</button>

			{showSelect && <ZoomSelect size={size} />}

			<button
				type="button"
				onClick={handleZoomIn}
				className={`${sizeClasses[size]} rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors`}
				title="Zoom in"
			>
				<ZoomIn className={iconSizes[size]} />
			</button>
		</div>
	);
}
