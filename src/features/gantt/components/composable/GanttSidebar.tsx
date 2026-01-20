import { ChevronRight, Cpu, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
	useGanttActions,
	useGanttResources,
	useGanttViewport,
} from "../../context/gantt-context";
import { useComposableVirtualRows } from "../../hooks/useComposableVirtualRows";
import type { VirtualRow } from "../../types";

export interface GanttSidebarProps {
	/** Width of the sidebar */
	width?: number;
	/** Height of the sidebar (if not set, uses flex-1) */
	height?: number;
	/** Position of the sidebar */
	position?: "left" | "right";
	/** Enable resize handle */
	resizable?: boolean;
	/** Enable collapse button */
	collapsible?: boolean;
	/** Additional class name */
	className?: string;
	/** Virtual rows (optional - uses internal calculation if not provided) */
	virtualRows?: VirtualRow[];
}

/**
 * Sidebar component showing resource list with grouping support.
 * Can be positioned on either side and optionally resized.
 */
export function GanttSidebar({
	width: propWidth,
	height,
	position = "left",
	resizable = false,
	collapsible = false,
	className = "",
	virtualRows: externalVirtualRows,
}: GanttSidebarProps) {
	const viewport = useGanttViewport();
	const resources = useGanttResources();
	const { toggleGroup, setSidebarWidth } = useGanttActions();

	// Use external virtual rows if provided, otherwise compute internally
	const internalVirtualRows = useComposableVirtualRows();
	const virtualRows = externalVirtualRows ?? internalVirtualRows;

	const sidebarWidth = (propWidth ?? viewport.width > 0) ? 200 : 200;
	const scrollY = viewport.scrollY;

	// Track previous row IDs to detect new rows for animation
	const prevRowIdsRef = useRef<Set<string>>(new Set());
	const [newRowIds, setNewRowIds] = useState<Set<string>>(new Set());
	const [isCollapsed, setIsCollapsed] = useState(false);

	useEffect(() => {
		const currentIds = new Set(virtualRows.map((r) => r.id));
		const prevIds = prevRowIdsRef.current;

		// Find newly added rows (for expand animation)
		const newIds = new Set<string>();
		for (const id of currentIds) {
			if (!prevIds.has(id)) {
				const row = virtualRows.find((r) => r.id === id);
				if (row && !row.isGroupHeader) {
					newIds.add(id);
				}
			}
		}

		if (newIds.size > 0) {
			setNewRowIds(newIds);
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

	const borderClass = position === "left" ? "border-r" : "border-l";

	if (isCollapsed && collapsible) {
		return (
			<button
				type="button"
				className={`flex items-center justify-center bg-card ${borderClass} border-border cursor-pointer hover:bg-accent transition-colors ${className}`}
				style={{ width: 32, height }}
				onClick={() => setIsCollapsed(false)}
			>
				<ChevronRight
					className={`w-4 h-4 text-muted-foreground ${position === "right" ? "rotate-180" : ""}`}
				/>
			</button>
		);
	}

	return (
		<div
			className={`relative bg-card ${borderClass} border-border overflow-hidden ${className}`}
			style={{ width: sidebarWidth, height }}
		>
			{/* Collapse button */}
			{collapsible && (
				<button
					type="button"
					className={`absolute top-2 ${position === "left" ? "right-2" : "left-2"} p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground z-10`}
					onClick={() => setIsCollapsed(true)}
				>
					<ChevronRight
						className={`w-3 h-3 ${position === "left" ? "rotate-180" : ""}`}
					/>
				</button>
			)}

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

			{/* Resize handle */}
			{resizable && (
				<ResizeHandle
					position={position}
					onResize={(delta) => setSidebarWidth(sidebarWidth + delta)}
				/>
			)}
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
			className="absolute left-0 right-0 flex items-center px-2 bg-secondary border-b border-border cursor-pointer hover:bg-accent transition-all duration-200 text-left"
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
				<ChevronRight className="w-4 h-4 text-muted-foreground mr-1" />
			</span>
			<span className="text-sm font-medium text-foreground truncate">
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
			const raf = requestAnimationFrame(() => {
				setMounted(true);
			});
			return () => cancelAnimationFrame(raf);
		}
	}, [isNew]);

	const staggerDelay = Math.min(staggerIndex * 20, 150);

	return (
		<div
			className="absolute left-0 right-0 flex items-center px-3 border-b border-border/50 hover:bg-accent/50 transition-all duration-200"
			style={{
				top: row.virtualY,
				height: row.height,
				opacity: mounted ? 1 : 0,
				transform: mounted ? "translateX(0)" : "translateX(-10px)",
				transitionDelay: isNew ? `${staggerDelay}ms` : "0ms",
			}}
		>
			<Icon className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
			<span className="text-sm text-foreground/80 truncate">
				{resourceName}
			</span>
		</div>
	);
}

interface ResizeHandleProps {
	position: "left" | "right";
	onResize: (delta: number) => void;
}

function ResizeHandle({ position, onResize }: ResizeHandleProps) {
	const handleMouseDown = (e: React.MouseEvent) => {
		e.preventDefault();
		const startX = e.clientX;

		const handleMouseMove = (moveEvent: MouseEvent) => {
			const delta =
				position === "left"
					? moveEvent.clientX - startX
					: startX - moveEvent.clientX;
			onResize(delta);
		};

		const handleMouseUp = () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: resize handle requires mouse interaction
		<div
			className={`absolute top-0 bottom-0 w-1 cursor-ew-resize hover:bg-primary/50 transition-colors ${
				position === "left" ? "right-0" : "left-0"
			}`}
			onMouseDown={handleMouseDown}
		/>
	);
}
