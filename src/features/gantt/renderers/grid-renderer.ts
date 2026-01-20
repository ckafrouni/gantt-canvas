import { startOfDay } from "date-fns";
import type { ViewportState, VirtualRow, ZoomLevel } from "../types";
import { clearCanvas } from "../utils/canvas-utils";
import { getGridColors } from "../utils/theme-colors";

/** Grid interval in hours based on zoom level */
const GRID_INTERVALS: Record<ZoomLevel, { minor: number; major: number }> = {
  hour: { minor: 1, major: 6 },
  day: { minor: 6, major: 24 },
  week: { minor: 24, major: 168 },
  month: { minor: 168, major: 720 },
};

/**
 * Renders the grid layer (background, row stripes, time grid lines)
 */
export class GridRenderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private width = 0;
  private height = 0;

  /**
   * Set the canvas context
   */
  setContext(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  /**
   * Render the grid
   */
  render(
    viewport: ViewportState,
    visibleRows: VirtualRow[],
    hoveredRowId: string | null = null,
  ): void {
    if (!this.ctx) return;

    const ctx = this.ctx;
    const COLORS = getGridColors();

    // Clear canvas
    clearCanvas(ctx, this.width, this.height);

    // Fill background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, this.width, this.height);

    // Draw row backgrounds
    this.renderRowBackgrounds(ctx, viewport, visibleRows, hoveredRowId, COLORS);

    // Draw vertical grid lines (time)
    this.renderTimeGrid(ctx, viewport, COLORS);

    // Draw today marker
    this.renderTodayMarker(ctx, viewport, COLORS);

    // Draw horizontal row separators
    this.renderRowSeparators(ctx, viewport, visibleRows, COLORS);
  }

  /**
   * Render alternating row backgrounds
   */
  private renderRowBackgrounds(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    visibleRows: VirtualRow[],
    hoveredRowId: string | null,
    COLORS: ReturnType<typeof getGridColors>,
  ): void {
    for (let i = 0; i < visibleRows.length; i++) {
      const row = visibleRows[i];
      const y = row.virtualY - viewport.scrollY;

      // Skip if not visible
      if (y + row.height < 0 || y > this.height) continue;

      // Determine background color
      let bgColor: string;
      if (row.id === hoveredRowId) {
        bgColor = COLORS.rowHover;
      } else if (row.isGroupHeader) {
        bgColor = COLORS.groupHeader;
      } else {
        bgColor = i % 2 === 0 ? COLORS.rowEven : COLORS.rowOdd;
      }

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, y, this.width, row.height);
    }
  }

  /**
   * Render vertical time grid lines
   */
  private renderTimeGrid(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    COLORS: ReturnType<typeof getGridColors>,
  ): void {
    const { zoomLevel, pixelsPerHour, scrollX, timeOrigin } = viewport;
    const intervals = GRID_INTERVALS[zoomLevel];

    // Calculate visible time range
    const visibleStartTime = timeOrigin + (scrollX / pixelsPerHour) * 3600000;
    const visibleEndTime =
      visibleStartTime + (this.width / pixelsPerHour) * 3600000;

    // Find the first grid line
    const startHour = Math.floor(visibleStartTime / 3600000);
    const startTime = startHour * 3600000;

    // Draw minor grid lines
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;

    for (
      let time = startTime;
      time <= visibleEndTime;
      time += intervals.minor * 3600000
    ) {
      const x = ((time - timeOrigin) / 3600000) * pixelsPerHour - scrollX;
      if (x < 0 || x > this.width) continue;

      const hourOfDay = new Date(time).getHours();
      const isMajor =
        hourOfDay % (intervals.major / (intervals.minor || 1)) === 0;

      ctx.strokeStyle = isMajor ? COLORS.gridLineMajor : COLORS.gridLine;
      ctx.lineWidth = isMajor ? 1 : 0.5;

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
  }

  /**
   * Render today marker line
   */
  private renderTodayMarker(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    COLORS: ReturnType<typeof getGridColors>,
  ): void {
    const now = Date.now();
    const { pixelsPerHour, scrollX, timeOrigin } = viewport;

    const x = ((now - timeOrigin) / 3600000) * pixelsPerHour - scrollX;

    // Skip if not visible
    if (x < 0 || x > this.width) return;

    // Draw background highlight
    const startOfTodayTime = startOfDay(now).getTime();
    const endOfTodayTime = startOfTodayTime + 24 * 3600000;

    const todayStartX =
      ((startOfTodayTime - timeOrigin) / 3600000) * pixelsPerHour - scrollX;
    const todayEndX =
      ((endOfTodayTime - timeOrigin) / 3600000) * pixelsPerHour - scrollX;

    ctx.fillStyle = COLORS.todayBackground;
    ctx.fillRect(
      Math.max(0, todayStartX),
      0,
      Math.min(this.width, todayEndX) - Math.max(0, todayStartX),
      this.height,
    );

    // Draw current time line
    ctx.strokeStyle = COLORS.todayLine;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, this.height);
    ctx.stroke();
  }

  /**
   * Render horizontal row separators
   */
  private renderRowSeparators(
    ctx: CanvasRenderingContext2D,
    viewport: ViewportState,
    visibleRows: VirtualRow[],
    COLORS: ReturnType<typeof getGridColors>,
  ): void {
    ctx.strokeStyle = COLORS.gridLine;
    ctx.lineWidth = 0.5;

    for (const row of visibleRows) {
      const y = row.virtualY + row.height - viewport.scrollY;

      if (y < 0 || y > this.height) continue;

      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }
}

// Singleton
let gridRendererInstance: GridRenderer | null = null;

export function getGridRenderer(): GridRenderer {
  if (!gridRendererInstance) {
    gridRendererInstance = new GridRenderer();
  }
  return gridRendererInstance;
}
