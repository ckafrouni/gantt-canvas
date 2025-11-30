import { Undo, Redo } from "lucide-react";
import { useGanttActions, useGanttCanUndo, useGanttCanRedo } from "../../../context/gantt-context";

export interface UndoRedoProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show labels */
  showLabels?: boolean;
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
 * Undo/Redo buttons with optional labels.
 */
export function UndoRedo({ size = "md", showLabels = false, className = "" }: UndoRedoProps) {
  const { undo, redo } = useGanttActions();
  const canUndo = useGanttCanUndo();
  const canRedo = useGanttCanRedo();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={undo}
        disabled={!canUndo}
        className={`${sizeClasses[size]} rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 flex items-center gap-1`}
        title="Undo (Ctrl+Z)"
      >
        <Undo className={iconSizes[size]} />
        {showLabels && <span className="text-sm">Undo</span>}
      </button>
      <button
        type="button"
        onClick={redo}
        disabled={!canRedo}
        className={`${sizeClasses[size]} rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-400 flex items-center gap-1`}
        title="Redo (Ctrl+Shift+Z)"
      >
        <Redo className={iconSizes[size]} />
        {showLabels && <span className="text-sm">Redo</span>}
      </button>
    </div>
  );
}

export interface UndoButtonProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show label */
  showLabel?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Standalone Undo button.
 */
export function UndoButton({ size = "md", showLabel = false, className = "" }: UndoButtonProps) {
  const { undo } = useGanttActions();
  const canUndo = useGanttCanUndo();

  return (
    <button
      type="button"
      onClick={undo}
      disabled={!canUndo}
      className={`${sizeClasses[size]} rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 ${className}`}
      title="Undo (Ctrl+Z)"
    >
      <Undo className={iconSizes[size]} />
      {showLabel && <span className="text-sm">Undo</span>}
    </button>
  );
}

export interface RedoButtonProps {
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Show label */
  showLabel?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Standalone Redo button.
 */
export function RedoButton({ size = "md", showLabel = false, className = "" }: RedoButtonProps) {
  const { redo } = useGanttActions();
  const canRedo = useGanttCanRedo();

  return (
    <button
      type="button"
      onClick={redo}
      disabled={!canRedo}
      className={`${sizeClasses[size]} rounded hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 ${className}`}
      title="Redo (Ctrl+Shift+Z)"
    >
      <Redo className={iconSizes[size]} />
      {showLabel && <span className="text-sm">Redo</span>}
    </button>
  );
}
