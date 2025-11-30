import { ChevronRight, User, Cpu } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import type { VirtualRow } from "../types";
import { useGanttUIStore } from "../store/ui-store";
import { useGanttDataStore } from "../store/data-store";

interface GanttSidebarProps {
  virtualRows: VirtualRow[];
  width: number;
  height: number;
}

export function GanttSidebar({
  virtualRows,
  width,
  height,
}: GanttSidebarProps) {
  const scrollY = useGanttUIStore((s) => s.viewport.scrollY);
  const toggleGroup = useGanttUIStore((s) => s.toggleGroup);
  const resources = useGanttDataStore((s) => s.resources);

  // Track previous row IDs to detect new rows for animation
  const prevRowIdsRef = useRef<Set<string>>(new Set());
  const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentIds = new Set(virtualRows.map((r) => r.id));
    const prevIds = prevRowIdsRef.current;

    // Find newly added rows (for expand animation)
    const newIds = new Set<string>();
    for (const id of currentIds) {
      if (!prevIds.has(id)) {
        // Check if it's a resource row (not a header) - only animate those
        const row = virtualRows.find((r) => r.id === id);
        if (row && !row.isGroupHeader) {
          newIds.add(id);
        }
      }
    }

    if (newIds.size > 0) {
      setNewRowIds(newIds);
      // Clear the "new" state after animation completes
      const timeout = setTimeout(() => {
        setNewRowIds(new Set());
      }, 300);
      return () => clearTimeout(timeout);
    }

    prevRowIdsRef.current = currentIds;
  }, [virtualRows]);

  // Calculate total content height
  const totalHeight =
    virtualRows.length > 0
      ? virtualRows[virtualRows.length - 1].virtualY +
        virtualRows[virtualRows.length - 1].height
      : 0;

  return (
    <div
      className="relative bg-slate-900 border-r border-slate-700 overflow-hidden"
      style={{ width, height }}
    >
      {/* Scrollable content */}
      <div
        className="absolute left-0 right-0"
        style={{
          transform: `translateY(-${scrollY}px)`,
          height: totalHeight,
        }}
      >
        {virtualRows.map((row, index) => {
          if (row.isGroupHeader) {
            return (
              <GroupHeaderRow
                key={row.id}
                row={row}
                onClick={() => row.groupId && toggleGroup(row.groupId)}
              />
            );
          }

          const resource = row.resourceId ? resources[row.resourceId] : null;
          const isNew = newRowIds.has(row.id);
          // Calculate stagger delay based on position within group
          const staggerIndex = index;

          return (
            <ResourceRow
              key={row.id}
              row={row}
              resourceName={resource?.name ?? "Unknown"}
              resourceType={resource?.type ?? "generic"}
              isNew={isNew}
              staggerIndex={staggerIndex}
            />
          );
        })}
      </div>
    </div>
  );
}

interface GroupHeaderRowProps {
  row: VirtualRow;
  onClick: () => void;
}

function GroupHeaderRow({ row, onClick }: GroupHeaderRowProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      className="absolute left-0 right-0 flex items-center px-2 bg-slate-800 border-b border-slate-700 cursor-pointer hover:bg-slate-700 transition-all duration-200 text-left"
      style={{
        top: row.virtualY,
        height: row.height,
      }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <span
        className="transition-transform duration-200"
        style={{
          transform: row.isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
        }}
      >
        <ChevronRight className="w-4 h-4 text-slate-400 mr-1" />
      </span>
      <span className="text-sm font-medium text-slate-200 truncate">
        {row.groupName}
      </span>
    </button>
  );
}

interface ResourceRowProps {
  row: VirtualRow;
  resourceName: string;
  resourceType: string;
  isNew?: boolean;
  staggerIndex?: number;
}

function ResourceRow({
  row,
  resourceName,
  resourceType,
  isNew = false,
  staggerIndex = 0,
}: ResourceRowProps) {
  const Icon = resourceType === "operator" ? User : Cpu;
  const [mounted, setMounted] = useState(!isNew);

  useEffect(() => {
    if (isNew) {
      // Trigger animation on next frame
      const raf = requestAnimationFrame(() => {
        setMounted(true);
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [isNew]);

  // Stagger delay (max 150ms total stagger)
  const staggerDelay = Math.min(staggerIndex * 20, 150);

  return (
    <div
      className="absolute left-0 right-0 flex items-center px-3 border-b border-slate-800 hover:bg-slate-800/50 transition-all duration-200"
      style={{
        top: row.virtualY,
        height: row.height,
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateX(0)" : "translateX(-10px)",
        transitionDelay: isNew ? `${staggerDelay}ms` : "0ms",
      }}
    >
      <Icon className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
      <span className="text-sm text-slate-300 truncate">{resourceName}</span>
    </div>
  );
}
