import type { ViewportState } from "../types";

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Manages coordinate transformations between:
 * - Data coordinates (timestamp, virtualY)
 * - Viewport coordinates (relative to canvas top-left)
 * - Screen coordinates (relative to page)
 */
export class ViewportManager {
  private viewport: ViewportState;
  private canvasRect: DOMRect | null = null;
  private dpr: number = 1;

  constructor(viewport: ViewportState) {
    this.viewport = viewport;
    this.dpr = typeof window !== "undefined" ? window.devicePixelRatio : 1;
  }

  /**
   * Update viewport state
   */
  setViewport(viewport: ViewportState): void {
    this.viewport = viewport;
  }

  /**
   * Update canvas bounding rect (for screen coordinate conversion)
   */
  setCanvasRect(rect: DOMRect): void {
    this.canvasRect = rect;
  }

  /**
   * Get current viewport
   */
  getViewport(): ViewportState {
    return this.viewport;
  }

  // ============ DATA -> VIEWPORT TRANSFORMS ============

  /**
   * Convert timestamp to viewport X coordinate
   */
  timeToX(timestamp: number): number {
    const hoursFromOrigin =
      (timestamp - this.viewport.timeOrigin) / MS_PER_HOUR;
    return (
      hoursFromOrigin * this.viewport.pixelsPerHour - this.viewport.scrollX
    );
  }

  /**
   * Convert virtual Y to viewport Y coordinate
   */
  virtualYToY(virtualY: number): number {
    return virtualY - this.viewport.scrollY;
  }

  /**
   * Convert data coordinates to viewport coordinates
   */
  dataToViewport(
    timestamp: number,
    virtualY: number,
  ): { x: number; y: number } {
    return {
      x: this.timeToX(timestamp),
      y: this.virtualYToY(virtualY),
    };
  }

  /**
   * Convert duration in ms to pixel width
   */
  durationToWidth(durationMs: number): number {
    const hours = durationMs / MS_PER_HOUR;
    return hours * this.viewport.pixelsPerHour;
  }

  // ============ VIEWPORT -> DATA TRANSFORMS ============

  /**
   * Convert viewport X to timestamp
   */
  xToTime(x: number): number {
    const hoursFromOrigin =
      (x + this.viewport.scrollX) / this.viewport.pixelsPerHour;
    return this.viewport.timeOrigin + hoursFromOrigin * MS_PER_HOUR;
  }

  /**
   * Convert viewport Y to virtual Y
   */
  yToVirtualY(y: number): number {
    return y + this.viewport.scrollY;
  }

  /**
   * Convert viewport coordinates to data coordinates
   */
  viewportToData(
    x: number,
    y: number,
  ): { timestamp: number; virtualY: number } {
    return {
      timestamp: this.xToTime(x),
      virtualY: this.yToVirtualY(y),
    };
  }

  /**
   * Convert pixel width to duration in ms
   */
  widthToDuration(width: number): number {
    const hours = width / this.viewport.pixelsPerHour;
    return hours * MS_PER_HOUR;
  }

  // ============ SCREEN -> VIEWPORT TRANSFORMS ============

  /**
   * Convert screen coordinates (mouse event) to viewport coordinates
   */
  screenToViewport(
    screenX: number,
    screenY: number,
  ): { x: number; y: number } | null {
    if (!this.canvasRect) return null;
    return {
      x: screenX - this.canvasRect.left,
      y: screenY - this.canvasRect.top,
    };
  }

  /**
   * Convert screen coordinates directly to data coordinates
   */
  screenToData(
    screenX: number,
    screenY: number,
  ): { timestamp: number; virtualY: number } | null {
    const viewport = this.screenToViewport(screenX, screenY);
    if (!viewport) return null;
    return this.viewportToData(viewport.x, viewport.y);
  }

  // ============ VISIBILITY CHECKS ============

  /**
   * Get visible time range
   */
  getVisibleTimeRange(): { start: number; end: number } {
    const start = this.xToTime(0);
    const end = this.xToTime(this.viewport.width);
    return { start, end };
  }

  /**
   * Get visible Y range
   */
  getVisibleYRange(): { start: number; end: number } {
    return {
      start: this.viewport.scrollY,
      end: this.viewport.scrollY + this.viewport.height,
    };
  }

  /**
   * Check if a time range is visible
   */
  isTimeRangeVisible(startTime: number, endTime: number): boolean {
    const { start, end } = this.getVisibleTimeRange();
    return startTime < end && endTime > start;
  }

  /**
   * Check if a Y range is visible
   */
  isYRangeVisible(minY: number, maxY: number): boolean {
    const { start, end } = this.getVisibleYRange();
    return minY < end && maxY > start;
  }

  /**
   * Check if a task bounds is visible
   */
  isVisible(
    startTime: number,
    endTime: number,
    minY: number,
    maxY: number,
  ): boolean {
    return (
      this.isTimeRangeVisible(startTime, endTime) &&
      this.isYRangeVisible(minY, maxY)
    );
  }

  // ============ ZOOM HELPERS ============

  /**
   * Calculate zoom factor to fit a time range
   */
  calculateZoomToFit(startTime: number, endTime: number, padding = 50): number {
    const durationHours = (endTime - startTime) / MS_PER_HOUR;
    const availableWidth = this.viewport.width - padding * 2;
    return availableWidth / durationHours;
  }

  /** Zoom-based snap intervals in minutes */
  private static readonly ZOOM_SNAP_INTERVALS: Record<string, number> = {
    hour: 15,
    day: 60,
    week: 360, // 6 hours
    month: 1440, // 24 hours
  };

  /**
   * Get snap interval based on zoom level and minimum resolution (in ms).
   * The snap interval scales with zoom but never goes below minResolution.
   * @param minResolution - Minimum resolution in minutes (default: 30)
   */
  getSnapInterval(minResolution = 30): number {
    const zoomSnapMinutes =
      ViewportManager.ZOOM_SNAP_INTERVALS[this.viewport.zoomLevel] ?? 60;
    const effectiveSnapMinutes = Math.max(zoomSnapMinutes, minResolution);
    return effectiveSnapMinutes * 60 * 1000;
  }

  /**
   * Snap a timestamp to the nearest grid line
   * @param minResolution - Minimum resolution in minutes (default: 30)
   */
  snapToGrid(timestamp: number, minResolution = 30): number {
    const interval = this.getSnapInterval(minResolution);
    return Math.round(timestamp / interval) * interval;
  }

  // ============ CANVAS SCALING ============

  /**
   * Get device pixel ratio
   */
  getDpr(): number {
    return this.dpr;
  }

  /**
   * Scale a value for high-DPI displays
   */
  scale(value: number): number {
    return value * this.dpr;
  }

  /**
   * Unscale a value from high-DPI
   */
  unscale(value: number): number {
    return value / this.dpr;
  }
}

// Factory function
export function createViewportManager(
  viewport: ViewportState,
): ViewportManager {
  return new ViewportManager(viewport);
}
