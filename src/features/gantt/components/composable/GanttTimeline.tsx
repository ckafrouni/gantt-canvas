import { useMemo } from "react";
import { format, startOfDay, addDays } from "date-fns";
import { useGanttViewport } from "../../context/gantt-context";

export interface GanttTimelineProps {
  /** Width of the timeline (required for calculations) */
  width: number;
  /** Height of the timeline header */
  height?: number;
  /** Position relative to canvas */
  position?: "top" | "bottom";
  /** Show current time indicator */
  showCurrentTime?: boolean;
  /** Additional class name */
  className?: string;
}

interface TimeMarker {
  time: number;
  label: string;
  isMajor: boolean;
  x: number;
}

/**
 * Timeline header component showing time axis with markers.
 * Can be positioned above or below the canvas.
 */
export function GanttTimeline({
  width,
  height = 50,
  position = "top",
  showCurrentTime = true,
  className = "",
}: GanttTimelineProps) {
  const viewport = useGanttViewport();
  const { scrollX, pixelsPerHour, timeOrigin, zoomLevel } = viewport;

  // Calculate visible time range
  const visibleStartTime = timeOrigin + (scrollX / pixelsPerHour) * 3600000;
  const visibleEndTime = visibleStartTime + (width / pixelsPerHour) * 3600000;

  // Generate time markers
  const markers = useMemo(() => {
    const result: TimeMarker[] = [];

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
      const x = ((time - timeOrigin) / 3600000) * pixelsPerHour - scrollX;

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
  }, [
    visibleStartTime,
    visibleEndTime,
    scrollX,
    pixelsPerHour,
    timeOrigin,
    zoomLevel,
    width,
  ]);

  // Generate day headers for day/hour zoom
  const dayHeaders = useMemo(() => {
    if (zoomLevel !== "hour" && zoomLevel !== "day") return [];

    const result: { date: Date; x: number; width: number }[] = [];

    const startDay = startOfDay(new Date(visibleStartTime));
    const endDay = startOfDay(new Date(visibleEndTime + 24 * 3600000));

    let currentDay = startDay;
    while (currentDay < endDay) {
      const dayStart = currentDay.getTime();

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
  }, [
    visibleStartTime,
    visibleEndTime,
    scrollX,
    pixelsPerHour,
    timeOrigin,
    zoomLevel,
    width,
  ]);

  // Current time indicator position
  const currentTimeX = useMemo(() => {
    if (!showCurrentTime) return null;
    const now = Date.now();
    const x = ((now - timeOrigin) / 3600000) * pixelsPerHour - scrollX;
    if (x < 0 || x > width) return null;
    return x;
  }, [showCurrentTime, timeOrigin, pixelsPerHour, scrollX, width]);

  const borderClass = position === "top" ? "border-b" : "border-t";

  return (
    <div
      className={`relative bg-card ${borderClass} border-border overflow-hidden select-none ${className}`}
      style={{ width, height }}
    >
      {/* Day headers (top row for top position, bottom row for bottom position) */}
      {dayHeaders.length > 0 && (
        <div
          className={`absolute left-0 right-0 h-6 border-border ${
            position === "top" ? "top-0 border-b" : "bottom-0 border-t"
          }`}
        >
          {dayHeaders.map((header) => (
            <div
              key={header.date.getTime()}
              className="absolute h-full flex items-center justify-center text-xs font-medium text-foreground/80 border-r border-border"
              style={{
                left: header.x,
                width: header.width,
                top: 0,
              }}
            >
              {format(header.date, "EEEE, MMMM d")}
            </div>
          ))}
        </div>
      )}

      {/* Time markers */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: position === "top" && dayHeaders.length > 0 ? 24 : 0,
          bottom: position === "bottom" && dayHeaders.length > 0 ? 24 : 0,
        }}
      >
        {markers.map((marker) => (
          <div
            key={marker.time}
            className={`absolute h-full flex flex-col items-center ${
              position === "bottom" ? "flex-col-reverse" : ""
            }`}
            style={{ left: marker.x }}
          >
            {/* Tick mark */}
            <div
              className={`w-px ${marker.isMajor ? "h-3 bg-muted-foreground" : "h-2 bg-border"}`}
            />
            {/* Label */}
            <span
              className={`text-xs whitespace-nowrap ${
                marker.isMajor
                  ? "text-foreground/80 font-medium"
                  : "text-muted-foreground"
              }`}
              style={{
                transform: "translateX(-50%)",
                marginTop: position === "top" ? 2 : 0,
                marginBottom: position === "bottom" ? 2 : 0,
              }}
            >
              {marker.label}
            </span>
          </div>
        ))}
      </div>

      {/* Current time indicator */}
      {currentTimeX !== null && (
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-destructive z-10"
          style={{ left: currentTimeX }}
        >
          <div
            className={`absolute w-2 h-2 bg-destructive rounded-full ${
              position === "top" ? "-bottom-1" : "-top-1"
            }`}
            style={{ left: -3 }}
          />
        </div>
      )}
    </div>
  );
}
