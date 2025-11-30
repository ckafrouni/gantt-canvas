import type { Task, TaskPhase, StoredTask } from "../types";

/** Calculate total duration from phases in minutes */
export function calculateTotalDuration(phases: TaskPhase[]): number {
	return phases.reduce((sum, phase) => sum + phase.duration, 0);
}

/** Calculate end time from start and phases */
export function calculateEndTime(
	startTime: number,
	phases: TaskPhase[],
): number {
	const totalMinutes = calculateTotalDuration(phases);
	return startTime + totalMinutes * 60 * 1000; // Convert minutes to ms
}

/** Hydrate a stored task with computed fields */
export function hydrateTask(task: StoredTask): Task {
	const totalDuration = calculateTotalDuration(task.phases);
	return {
		...task,
		_totalDuration: totalDuration,
		_endTime: task.startTime + totalDuration * 60 * 1000,
	};
}

/** Get phase boundaries for rendering */
export function getPhaseRanges(
	task: Task,
): Array<{
	type: TaskPhase["type"];
	start: number;
	end: number;
	color?: string;
}> {
	const ranges: Array<{
		type: TaskPhase["type"];
		start: number;
		end: number;
		color?: string;
	}> = [];
	let currentStart = task.startTime;

	for (const phase of task.phases) {
		const phaseDurationMs = phase.duration * 60 * 1000;
		ranges.push({
			type: phase.type,
			start: currentStart,
			end: currentStart + phaseDurationMs,
			color: phase.color,
		});
		currentStart += phaseDurationMs;
	}

	return ranges;
}

/** Default phase colors */
export const PHASE_COLORS: Record<TaskPhase["type"], string> = {
	setup: "#f59e0b", // amber
	execution: "#3b82f6", // blue
	cleanup: "#8b5cf6", // purple
};

/** Get color for a task phase */
export function getPhaseColor(phase: TaskPhase): string {
	return phase.color ?? PHASE_COLORS[phase.type];
}

/** Check if two tasks overlap in time */
export function tasksOverlap(a: Task, b: Task): boolean {
	return a.startTime < b._endTime && a._endTime > b.startTime;
}

/** Check if a task overlaps with a time range */
export function taskOverlapsRange(
	task: Task,
	rangeStart: number,
	rangeEnd: number,
): boolean {
	return task.startTime < rangeEnd && task._endTime > rangeStart;
}

/** Snap a timestamp to the nearest interval */
export function snapToInterval(
	timestamp: number,
	intervalMinutes: number,
): number {
	const intervalMs = intervalMinutes * 60 * 1000;
	return Math.round(timestamp / intervalMs) * intervalMs;
}

/** Format duration in human-readable form */
export function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes}m`;
	}
	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;
	if (remainingMinutes === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${remainingMinutes}m`;
}
