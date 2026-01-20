import { Layers } from "lucide-react";
import {
	useGanttActions,
	useGanttGroupingMode,
} from "../../../context/gantt-context";
import type { GroupingMode } from "../../../types";

export interface GroupingSelectProps {
	/** Size variant */
	size?: "sm" | "md" | "lg";
	/** Show icon */
	showIcon?: boolean;
	/** Additional class name */
	className?: string;
}

const selectSizes = {
	sm: "px-1.5 py-0.5 text-xs",
	md: "px-2 py-1 text-sm",
	lg: "px-3 py-1.5 text-base",
};

const iconSizes = {
	sm: "w-3 h-3",
	md: "w-4 h-4",
	lg: "w-5 h-5",
};

const groupingModes: { value: GroupingMode; label: string }[] = [
	{ value: "none", label: "No Grouping" },
	{ value: "resource_type", label: "By Type" },
	{ value: "order", label: "By Order" },
];

/**
 * Grouping mode dropdown selector.
 */
export function GroupingSelect({
	size = "md",
	showIcon = true,
	className = "",
}: GroupingSelectProps) {
	const groupingMode = useGanttGroupingMode();
	const { setGroupingMode } = useGanttActions();

	return (
		<div className={`flex items-center gap-1.5 ${className}`}>
			{showIcon && (
				<Layers className={`${iconSizes[size]} text-muted-foreground`} />
			)}
			<select
				value={groupingMode}
				onChange={(e) => setGroupingMode(e.target.value as GroupingMode)}
				className={`${selectSizes[size]} bg-secondary border border-border rounded text-foreground focus:outline-none focus:ring-1 focus:ring-ring`}
			>
				{groupingModes.map((mode) => (
					<option key={mode.value} value={mode.value}>
						{mode.label}
					</option>
				))}
			</select>
		</div>
	);
}
