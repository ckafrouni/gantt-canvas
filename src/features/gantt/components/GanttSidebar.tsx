import { ChevronRight, ChevronDown, User, Cpu } from "lucide-react";
import type { VirtualRow, ResourceId } from "../types";
import { useGanttUIStore } from "../store/ui-store";
import { useGanttDataStore } from "../store/data-store";

interface GanttSidebarProps {
	virtualRows: VirtualRow[];
	width: number;
	height: number;
}

export function GanttSidebar({ virtualRows, width, height }: GanttSidebarProps) {
	const scrollY = useGanttUIStore((s) => s.viewport.scrollY);
	const toggleGroup = useGanttUIStore((s) => s.toggleGroup);
	const resources = useGanttDataStore((s) => s.resources);

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
				{virtualRows.map((row) => {
					if (row.isGroupHeader) {
						return (
							<GroupHeaderRow
								key={row.id}
								row={row}
								onClick={() => row.groupId && toggleGroup(row.groupId)}
							/>
						);
					}

					const resource = row.resourceId
						? resources[row.resourceId]
						: null;

					return (
						<ResourceRow
							key={row.id}
							row={row}
							resourceName={resource?.name ?? "Unknown"}
							resourceType={resource?.type ?? "generic"}
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
	return (
		<div
			className="absolute left-0 right-0 flex items-center px-2 bg-slate-800 border-b border-slate-700 cursor-pointer hover:bg-slate-700 transition-colors"
			style={{
				top: row.virtualY,
				height: row.height,
			}}
			onClick={onClick}
		>
			{row.isCollapsed ? (
				<ChevronRight className="w-4 h-4 text-slate-400 mr-1" />
			) : (
				<ChevronDown className="w-4 h-4 text-slate-400 mr-1" />
			)}
			<span className="text-sm font-medium text-slate-200 truncate">
				{row.groupName}
			</span>
		</div>
	);
}

interface ResourceRowProps {
	row: VirtualRow;
	resourceName: string;
	resourceType: string;
}

function ResourceRow({ row, resourceName, resourceType }: ResourceRowProps) {
	const Icon = resourceType === "operator" ? User : Cpu;

	return (
		<div
			className="absolute left-0 right-0 flex items-center px-3 border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
			style={{
				top: row.virtualY,
				height: row.height,
			}}
		>
			<Icon className="w-4 h-4 text-slate-500 mr-2 flex-shrink-0" />
			<span className="text-sm text-slate-300 truncate">{resourceName}</span>
		</div>
	);
}
