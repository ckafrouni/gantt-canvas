/**
 * Theme-aware colors for canvas rendering.
 * Reads CSS custom properties at runtime to support light/dark mode switching.
 */

/** Cache for computed colors */
let colorCache: Record<string, string> = {};
let lastTheme: string | null = null;

/**
 * Get a CSS custom property value as a color string
 */
function getCSSColor(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();

  return value || fallback;
}

/**
 * Convert oklch color to a canvas-compatible format
 * Canvas doesn't support oklch directly, so we need to use a temporary element
 */
function resolveColor(cssValue: string): string {
  if (typeof document === "undefined") return cssValue;

  // If it's already a standard format, return as-is
  if (cssValue.startsWith("#") || cssValue.startsWith("rgb") || cssValue.startsWith("hsl")) {
    return cssValue;
  }

  // For oklch and other formats, use a temp element to convert
  const temp = document.createElement("div");
  temp.style.color = cssValue;
  document.body.appendChild(temp);
  const computed = getComputedStyle(temp).color;
  document.body.removeChild(temp);

  return computed || cssValue;
}

/**
 * Check if theme has changed and clear cache if needed
 */
function checkThemeChange(): void {
  if (typeof document === "undefined") return;

  const isDark = document.documentElement.classList.contains("dark");
  const currentTheme = isDark ? "dark" : "light";

  if (lastTheme !== currentTheme) {
    colorCache = {};
    lastTheme = currentTheme;
  }
}

/**
 * Get a theme color, with caching for performance
 */
function getThemeColor(varName: string, fallback: string): string {
  checkThemeChange();

  const cacheKey = varName;
  if (colorCache[cacheKey]) {
    return colorCache[cacheKey];
  }

  const cssValue = getCSSColor(varName, fallback);
  const resolved = resolveColor(cssValue);
  colorCache[cacheKey] = resolved;

  return resolved;
}

/**
 * Clear the color cache (call this when theme changes)
 */
export function clearColorCache(): void {
  colorCache = {};
  lastTheme = null;
}

/**
 * Get all grid colors for current theme
 */
export function getGridColors() {
  return {
    background: getThemeColor("--background", "#f8fafc"),
    rowOdd: getThemeColor("--card", "#ffffff"),
    rowEven: getThemeColor("--background", "#f8fafc"),
    rowHover: getThemeColor("--accent", "#f1f5f9"),
    gridLine: getThemeColor("--border", "#e2e8f0"),
    gridLineMajor: getThemeColor("--border", "#cbd5e1"),
    todayLine: getThemeColor("--destructive", "#ef4444"),
    todayBackground: "rgba(239, 68, 68, 0.1)",
    weekendBackground: "rgba(100, 116, 139, 0.08)",
    headerText: getThemeColor("--muted-foreground", "#64748b"),
    groupHeader: getThemeColor("--secondary", "#f1f5f9"),
  };
}

/**
 * Get all task colors for current theme
 */
export function getTaskColors() {
  return {
    taskDefault: getThemeColor("--primary", "#3b82f6"),
    taskText: "#ffffff",
    taskTextDark: getThemeColor("--foreground", "#1e293b"),
    selectedBorder: "#fbbf24", // amber-400 - keep consistent
    hoveredBorder: getThemeColor("--primary", "#3b82f6"),
    progressBackground: "rgba(255, 255, 255, 0.3)",
    progressForeground: "rgba(255, 255, 255, 0.5)",
  };
}

/**
 * Get all interaction colors for current theme
 */
export function getInteractionColors() {
  return {
    dragPreview: "rgba(59, 130, 246, 0.5)",
    dragPreviewBorder: getThemeColor("--primary", "#3b82f6"),
    dropZoneValid: "rgba(34, 197, 94, 0.2)",
    dropZoneInvalid: "rgba(239, 68, 68, 0.2)",
    selectionBox: "rgba(59, 130, 246, 0.2)",
    selectionBoxBorder: getThemeColor("--primary", "#3b82f6"),
    snapLine: "#fbbf24", // amber-400
    conflictHighlight: "rgba(239, 68, 68, 0.3)",
    tooltipBackground: getThemeColor("--popover", "#1e293b"),
    tooltipText: getThemeColor("--popover-foreground", "#f8fafc"),
  };
}
