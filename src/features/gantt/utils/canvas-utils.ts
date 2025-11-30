/**
 * Canvas utility functions for drawing operations
 */

/**
 * Setup a canvas for high-DPI displays
 */
export function setupHighDPICanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): CanvasRenderingContext2D {
  const dpr = window.devicePixelRatio || 1;

  // Set display size
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  // Set actual size in memory (scaled for retina)
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);

  // Get context and scale
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D canvas context");
  }
  ctx.scale(dpr, dpr);

  return ctx;
}

/**
 * Clear a canvas
 */
export function clearCanvas(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.clearRect(0, 0, width, height);
}

/**
 * Draw a rounded rectangle
 */
export function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  if (width < 2 * radius) radius = width / 2;
  if (height < 2 * radius) radius = height / 2;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

/**
 * Fill a rounded rectangle
 */
export function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
): void {
  ctx.fillStyle = color;
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.fill();
}

/**
 * Stroke a rounded rectangle
 */
export function strokeRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string,
  lineWidth: number,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.stroke();
}

/**
 * Truncate text to fit within a given width
 */
export function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  ellipsis = "...",
): string {
  const metrics = ctx.measureText(text);
  if (metrics.width <= maxWidth) return text;

  const ellipsisWidth = ctx.measureText(ellipsis).width;
  if (ellipsisWidth >= maxWidth) return "";

  let truncated = text;
  while (truncated.length > 0) {
    truncated = truncated.slice(0, -1);
    const width = ctx.measureText(truncated).width + ellipsisWidth;
    if (width <= maxWidth) {
      return truncated + ellipsis;
    }
  }

  return "";
}

/**
 * Draw text with truncation
 */
export function drawTruncatedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  color: string,
  font: string,
): void {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textBaseline = "middle";

  const truncated = truncateText(ctx, text, maxWidth);
  ctx.fillText(truncated, x, y);
}

/**
 * Draw an arrow line (for dependencies)
 */
export function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number,
  arrowSize = 8,
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;

  // Draw line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Draw arrowhead
  const angle = Math.atan2(toY - fromY, toX - fromX);
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - arrowSize * Math.cos(angle - Math.PI / 6),
    toY - arrowSize * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    toX - arrowSize * Math.cos(angle + Math.PI / 6),
    toY - arrowSize * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw an orthogonal dependency arrow (right-angle turns)
 */
export function drawOrthogonalArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number,
  arrowSize = 6,
): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Calculate midpoint for the bend
  const midX = fromX + 20;

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(midX, fromY); // Go right
  ctx.lineTo(midX, toY); // Go up/down
  ctx.lineTo(toX, toY); // Go to target
  ctx.stroke();

  // Draw arrowhead pointing left
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX + arrowSize, toY - arrowSize / 2);
  ctx.lineTo(toX + arrowSize, toY + arrowSize / 2);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draw a dashed line
 */
export function drawDashedLine(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  lineWidth: number,
  dashPattern: number[] = [5, 5],
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dashPattern);

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  ctx.setLineDash([]);
}

/**
 * Create a linear gradient
 */
export function createHorizontalGradient(
  ctx: CanvasRenderingContext2D,
  x: number,
  width: number,
  colorStart: string,
  colorEnd: string,
): CanvasGradient {
  const gradient = ctx.createLinearGradient(x, 0, x + width, 0);
  gradient.addColorStop(0, colorStart);
  gradient.addColorStop(1, colorEnd);
  return gradient;
}

/**
 * Lighten a hex color
 */
export function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/**
 * Darken a hex color
 */
export function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
  const B = Math.max(0, (num & 0x0000ff) - amt);
  return `#${((1 << 24) | (R << 16) | (G << 8) | B).toString(16).slice(1)}`;
}

/**
 * Convert hex to rgba
 */
export function hexToRgba(hex: string, alpha: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0,0,0,${alpha})`;
  return `rgba(${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)},${alpha})`;
}
