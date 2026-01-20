import type {
	Order,
	Resource,
	ResourceGroup,
	StoredTask,
	TaskDependency,
	TaskPhase,
} from "../types";
import {
	createDependencyId,
	createGroupId,
	createOrderId,
	createResourceId,
	createTaskId,
} from "../types";

/** Generate random demo data for the Gantt chart */
export function generateDemoData(options: {
	taskCount?: number;
	resourceCount?: number;
	orderCount?: number;
	dependencyRatio?: number;
}): {
	tasks: StoredTask[];
	resources: Resource[];
	dependencies: TaskDependency[];
	orders: Order[];
	groups: ResourceGroup[];
} {
	const {
		taskCount = 100,
		resourceCount = 20,
		orderCount = 5,
		dependencyRatio = 0.3,
	} = options;

	// Generate resource groups
	const groups: ResourceGroup[] = [
		{
			id: createGroupId("operators"),
			name: "Operators",
			type: "operator",
			color: "#3b82f6",
		},
		{
			id: createGroupId("machines"),
			name: "Machines",
			type: "machine",
			color: "#10b981",
		},
	];

	// Generate resources
	const resources: Resource[] = [];
	const operatorCount = Math.floor(resourceCount * 0.4);
	const machineCount = resourceCount - operatorCount;

	for (let i = 0; i < operatorCount; i++) {
		resources.push({
			id: createResourceId(`op-${i}`),
			name: `Operator ${i + 1}`,
			type: "operator",
			capacity: 1,
			groupId: createGroupId("operators"),
		});
	}

	for (let i = 0; i < machineCount; i++) {
		resources.push({
			id: createResourceId(`machine-${i}`),
			name: `Machine ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ""}`,
			type: "machine",
			capacity: 1,
			groupId: createGroupId("machines"),
		});
	}

	// Generate orders
	const orders: Order[] = [];
	const orderColors = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6"];

	for (let i = 0; i < orderCount; i++) {
		orders.push({
			id: createOrderId(`order-${i}`),
			name: `Order #${1000 + i}`,
			priority: i + 1,
			color: orderColors[i % orderColors.length],
			dueDate: Date.now() + (i + 2) * 7 * 24 * 60 * 60 * 1000,
		});
	}

	// Generate tasks
	const tasks: StoredTask[] = [];
	const taskColors = [
		"#3b82f6", // blue
		"#10b981", // emerald
		"#f59e0b", // amber
		"#ef4444", // red
		"#8b5cf6", // violet
		"#ec4899", // pink
		"#06b6d4", // cyan
	];

	const now = Date.now();
	const dayMs = 24 * 60 * 60 * 1000;
	const hourMs = 60 * 60 * 1000;

	for (let i = 0; i < taskCount; i++) {
		const resourceIndex = i % resources.length;
		const resource = resources[resourceIndex];
		const orderIndex =
			Math.floor(i / Math.ceil(taskCount / orderCount)) % orderCount;

		// Random start time within the next 30 days, spread out
		const startOffset = Math.floor(i / resources.length) * 4 * hourMs;
		const randomOffset = Math.random() * 8 * hourMs;
		const startTime = now - 2 * dayMs + startOffset + randomOffset;

		// Generate phases
		const phases: TaskPhase[] = [];
		const hasSetup = Math.random() > 0.3;
		const hasCleanup = Math.random() > 0.5;

		if (hasSetup) {
			phases.push({
				type: "setup",
				duration: 15 + Math.floor(Math.random() * 30), // 15-45 min
			});
		}

		phases.push({
			type: "execution",
			duration: 30 + Math.floor(Math.random() * 180), // 30-210 min
		});

		if (hasCleanup) {
			phases.push({
				type: "cleanup",
				duration: 10 + Math.floor(Math.random() * 20), // 10-30 min
			});
		}

		tasks.push({
			id: createTaskId(`task-${i}`),
			name: `Task ${i + 1}`,
			description: `Description for task ${i + 1}`,
			resourceId: resource.id,
			orderId: orders[orderIndex].id,
			startTime,
			phases,
			color: taskColors[orderIndex % taskColors.length],
			priority: Math.ceil(Math.random() * 5),
			status: Math.random() > 0.8 ? "completed" : "scheduled",
			progress: Math.random() > 0.7 ? Math.floor(Math.random() * 100) : 0,
		});
	}

	// Generate dependencies (only between tasks in the same order)
	const dependencies: TaskDependency[] = [];
	const tasksByOrder = new Map<string, StoredTask[]>();

	for (const task of tasks) {
		const orderTasks = tasksByOrder.get(task.orderId) ?? [];
		orderTasks.push(task);
		tasksByOrder.set(task.orderId, orderTasks);
	}

	let depIndex = 0;
	for (const [_orderId, orderTasks] of tasksByOrder) {
		// Sort by start time
		orderTasks.sort((a, b) => a.startTime - b.startTime);

		// Create some dependencies within the order
		for (let i = 1; i < orderTasks.length; i++) {
			if (Math.random() < dependencyRatio) {
				const predecessorIndex = Math.floor(Math.random() * i);
				dependencies.push({
					id: createDependencyId(`dep-${depIndex++}`),
					predecessorId: orderTasks[predecessorIndex].id,
					successorId: orderTasks[i].id,
					type: "FS",
					lag: 0,
				});
			}
		}
	}

	return { tasks, resources, dependencies, orders, groups };
}

/** Generate large dataset for performance testing */
export function generateLargeDataset(
	taskCount: number,
): ReturnType<typeof generateDemoData> {
	const resourceCount = Math.min(100, Math.max(20, Math.floor(taskCount / 50)));
	const orderCount = Math.min(20, Math.max(5, Math.floor(taskCount / 200)));

	return generateDemoData({
		taskCount,
		resourceCount,
		orderCount,
		dependencyRatio: 0.2,
	});
}
