import { useMemo } from "react";
import {
	format,
	startOfDay,
	startOfHour,
	addHours,
	addDays,
	differenceInHours,
} from "date-fns";
import type { ZoomLevel } from "../types";
import { useGanttUIStore, ZOOM_CONFIGS } from "../store/ui-store";

interface TimelineHeaderProps {
	width: number;
	height?: number;
}

interface TimeMarker {
	time: number;
	label: string;
	isMajor: boolean;
	x: number;
}

export function TimelineHeader({ width, height = 50 }: TimelineHeaderProps) {
	const viewport = useGanttUIStore((s) => s.viewport);
	const { scrollX, pixelsPerHour, timeOrigin, zoomLevel } = viewport;

	// Calculate visible time range
	const visibleStartTime = timeOrigin + (scrollX / pixelsPerHour) * 3600000;
	const visibleEndTime = visibleStartTime + (width / pixelsPerHour) * 3600000;

	// Generate time markers
	const markers = useMemo(() => {
		const result: TimeMarker[] = [];
		const config = ZOOM_CONFIGS[zoomLevel];

		// Determine interval based on zoom level
		let intervalHours: number;
		let majorIntervalHours: number;
		let labelFormat: string;

		switch (zoomLevel) {
			case "hour":
				intervalHours = 1;
				majorIntervalHours = 6;
				labelFormat = "HH:mm";
				break;
			case "day":
				intervalHours = 6;
				majorIntervalHours = 24;
				labelFormat = "HH:mm";
				break;
			case "week":
				intervalHours = 24;
				majorIntervalHours = 24 * 7;
				labelFormat = "EEE d";
				break;
			case "month":
				intervalHours = 24 * 7;
				majorIntervalHours = 24 * 30;
				labelFormat = "MMM d";
				break;
			default:
				intervalHours = 24;
				majorIntervalHours = 24 * 7;
				labelFormat = "MMM d";
		}

		// Find the first marker time
		const intervalMs = intervalHours * 3600000;
		const startTime = Math.floor(visibleStartTime / intervalMs) * intervalMs;

		// Generate markers
		for (let time = startTime; time <= visibleEndTime; time += intervalMs) {
			const x =
				((time - timeOrigin) / 3600000) * pixelsPerHour - scrollX;

			if (x < -100 || x > width + 100) continue;

			const date = new Date(time);
			const isMajor =
				time % (majorIntervalHours * 3600000) === 0 ||
				(zoomLevel === "day" && date.getHours() === 0);

			let label: string;
			if (zoomLevel === "hour" || zoomLevel === "day") {
				if (date.getHours() === 0) {
					label = format(date, "MMM d");
				} else {
					label = format(date, labelFormat);
				}
			} else {
				label = format(date, labelFormat);
			}

			result.push({
				time,
				label,
				isMajor,
				x,
			});
		}

		return result;
	}, [visibleStartTime, visibleEndTime, scrollX, pixelsPerHour, timeOrigin, zoomLevel, width]);

	// Generate day headers for day/hour zoom
	const dayHeaders = useMemo(() => {
		if (zoomLevel !== "hour" && zoomLevel !== "day") return [];

		const result: { date: Date; x: number; width: number }[] = [];

		const startDay = startOfDay(new Date(visibleStartTime));
		const endDay = startOfDay(new Date(visibleEndTime + 24 * 3600000));

		let currentDay = startDay;
		while (currentDay < endDay) {
			const dayStart = currentDay.getTime();
			const dayEnd = dayStart + 24 * 3600000;

			const x = ((dayStart - timeOrigin) / 3600000) * pixelsPerHour - scrollX;
			const dayWidth = 24 * pixelsPerHour;

			if (x + dayWidth > 0 && x < width) {
				result.push({
					date: currentDay,
					x: Math.max(0, x),
					width: Math.min(dayWidth, width - x, x < 0 ? dayWidth + x : dayWidth),
				});
			}

			currentDay = addDays(currentDay, 1);
		}

		return result;
	}, [visibleStartTime, visibleEndTime, scrollX, pixelsPerHour, timeOrigin, zoomLevel, width]);

	return (
		<div
			className="relative bg-slate-900 border-b border-slate-700 overflow-hidden select-none"
			style={{ width, height }}
		>
			{/* Day headers (top row) */}
			{dayHeaders.length > 0 && (
				<div className="absolute top-0 left-0 right-0 h-6 border-b border-slate-700">
					{dayHeaders.map((header, i) => (
						<div
							key={i}
							className="absolute top-0 h-full flex items-center justify-center text-xs font-medium text-slate-300 border-r border-slate-700"
							style={{
								left: header.x,
								width: header.width,
							}}
						>
							{format(header.date, "EEEE, MMMM d")}
						</div>
					))}
				</div>
			)}

			{/* Time markers (bottom row) */}
			<div
				className="absolute left-0 right-0 bottom-0"
				style={{ top: dayHeaders.length > 0 ? 24 : 0 }}
			>
				{markers.map((marker, i) => (
					<div
						key={i}
						className="absolute top-0 h-full flex flex-col items-center"
						style={{ left: marker.x }}
					>
						{/* Tick mark */}
						<div
							className={`w-px ${marker.isMajor ? "h-3 bg-slate-500" : "h-2 bg-slate-600"}`}
						/>
						{/* Label */}
						<span
							className={`text-xs whitespace-nowrap ${
								marker.isMajor ? "text-slate-300 font-medium" : "text-slate-500"
							}`}
							style={{
								transform: "translateX(-50%)",
								marginTop: 2,
							}}
						>
							{marker.label}
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
