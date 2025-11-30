import { ZoomControls } from "./controls/ZoomControls";
import { UndoRedo } from "./controls/UndoRedo";
import { GroupingSelect } from "./controls/GroupingSelect";
import { TodayButton } from "./controls/TodayButton";

export interface GanttToolbarProps {
  /** Position of the toolbar */
  position?: "top" | "bottom";
  /** Visual variant */
  variant?: "default" | "floating" | "minimal";
  /** Which controls to show */
  items?: Array<"zoom" | "today" | "grouping" | "undo">;
  /** Additional class name */
  className?: string;
}

/**
 * Toolbar component with zoom, grouping, and undo/redo controls.
 * Can be positioned at top or bottom, with different visual variants.
 */
export function GanttToolbar({
  position = "top",
  variant = "default",
  items = ["zoom", "today", "grouping", "undo"],
  className = "",
}: GanttToolbarProps) {
  const borderClass = position === "top" ? "border-b" : "border-t";

  const variantClasses = {
    default: `bg-slate-800 ${borderClass} border-slate-700`,
    floating: "bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-700",
    minimal: "bg-transparent",
  };

  const showZoom = items.includes("zoom");
  const showToday = items.includes("today");
  const showGrouping = items.includes("grouping");
  const showUndo = items.includes("undo");

  return (
    <div className={`flex items-center gap-2 px-4 py-2 ${variantClasses[variant]} ${className}`}>
      {/* Zoom controls */}
      {showZoom && <ZoomControls />}

      {/* Divider */}
      {showZoom && (showToday || showGrouping) && (
        <div className="w-px h-6 bg-slate-600" />
      )}

      {/* Today button */}
      {showToday && <TodayButton />}

      {/* Divider */}
      {showToday && showGrouping && <div className="w-px h-6 bg-slate-600" />}

      {/* Grouping */}
      {showGrouping && <GroupingSelect />}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Undo/Redo */}
      {showUndo && <UndoRedo />}
    </div>
  );
}
