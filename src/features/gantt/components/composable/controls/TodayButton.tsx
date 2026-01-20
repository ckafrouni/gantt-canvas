import { Calendar } from "lucide-react";
import { useGanttActions } from "../../../context/gantt-context";

export interface TodayButtonProps {
	/** Size variant */
	size?: "sm" | "md" | "lg";
	/** Show label */
	showLabel?: boolean;
	/** Label text */
	label?: string;
	/** Additional class name */
	className?: string;
	/** Callback after scrolling */
	onClick?: () => void;
}

const sizeClasses = {
	sm: "px-1.5 py-0.5",
	md: "px-2 py-1",
	lg: "px-3 py-1.5",
};

const iconSizes = {
	sm: "w-3 h-3",
	md: "w-4 h-4",
	lg: "w-5 h-5",
};

const textSizes = {
	sm: "text-xs",
	md: "text-sm",
	lg: "text-base",
};

/**
 * Button that scrolls the timeline to the current time.
 */
export function TodayButton({
	size = "md",
	showLabel = true,
	label = "Today",
	className = "",
	onClick,
}: TodayButtonProps) {
	const { scrollToTime } = useGanttActions();

	const handleClick = () => {
		scrollToTime(Date.now());
		onClick?.();
	};

	return (
		<button
			type="button"
			onClick={handleClick}
			className={`${sizeClasses[size]} flex items-center gap-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors ${className}`}
			title="Scroll to today"
		>
			<Calendar className={iconSizes[size]} />
			{showLabel && <span className={textSizes[size]}>{label}</span>}
		</button>
	);
}
