import { useMemo } from "react";
import type { VirtualRow, Resource } from "../types";
import {
  useGanttResources,
  useGanttTasks,
  useGanttOrders,
  useGanttGrouping,
  useGanttViewport,
} from "../context/gantt-context";

const GROUP_HEADER_HEIGHT = 32;

/**
 * Hook to calculate virtual rows based on grouping and collapse state.
 * Uses the composable context instead of global stores.
 */
export function useComposableVirtualRows(): VirtualRow[] {
  const resources = useGanttResources();
  const tasks = useGanttTasks();
  const orders = useGanttOrders();
  const grouping = useGanttGrouping();
  const viewport = useGanttViewport();

  const { mode: groupingMode, expandedGroups } = grouping;
  const rowHeight = viewport.rowHeight;

  return useMemo(() => {
    const virtualRows: VirtualRow[] = [];
    let currentY = 0;

    const resourceList = Object.values(resources);

    if (groupingMode === "none") {
      // No grouping - just list all resources
      for (const resource of resourceList) {
        virtualRows.push({
          id: `resource-${resource.id}`,
          resourceId: resource.id,
          virtualY: currentY,
          height: rowHeight,
          isGroupHeader: false,
        });
        currentY += rowHeight;
      }
    } else if (groupingMode === "resource_type") {
      // Group by resource type
      const byType = new Map<string, Resource[]>();

      for (const resource of resourceList) {
        const type = resource.type;
        if (!byType.has(type)) {
          byType.set(type, []);
        }
        byType.get(type)?.push(resource);
      }

      for (const [type, typeResources] of byType) {
        const groupId = `type-${type}`;
        const isExpanded = expandedGroups.has(groupId);

        // Add group header
        virtualRows.push({
          id: groupId,
          resourceId: null,
          virtualY: currentY,
          height: GROUP_HEADER_HEIGHT,
          isGroupHeader: true,
          groupId,
          groupName: `${type.charAt(0).toUpperCase()}${type.slice(1)}s`,
          isCollapsed: !isExpanded,
        });
        currentY += GROUP_HEADER_HEIGHT;

        // Add resources if expanded
        if (isExpanded) {
          for (const resource of typeResources) {
            virtualRows.push({
              id: `resource-${resource.id}`,
              resourceId: resource.id,
              virtualY: currentY,
              height: rowHeight,
              isGroupHeader: false,
              groupId,
            });
            currentY += rowHeight;
          }
        }
      }
    } else if (groupingMode === "order") {
      // Group by order - resources that have tasks from the same order
      const orderResources = new Map<string, Set<string>>();

      // Find which resources have tasks for each order
      for (const task of Object.values(tasks)) {
        const orderId = task.orderId;
        if (!orderResources.has(orderId)) {
          orderResources.set(orderId, new Set());
        }
        orderResources.get(orderId)?.add(task.resourceId);
      }

      // Resources not assigned to any order
      const assignedResources = new Set<string>();
      for (const resourceIds of orderResources.values()) {
        for (const id of resourceIds) {
          assignedResources.add(id);
        }
      }

      // Sort orders by priority
      const sortedOrders = Object.values(orders).sort(
        (a, b) => a.priority - b.priority,
      );

      for (const order of sortedOrders) {
        const resourceIds = orderResources.get(order.id);
        if (!resourceIds || resourceIds.size === 0) continue;

        const groupId = `order-${order.id}`;
        const isExpanded = expandedGroups.has(groupId);

        // Add group header
        virtualRows.push({
          id: groupId,
          resourceId: null,
          virtualY: currentY,
          height: GROUP_HEADER_HEIGHT,
          isGroupHeader: true,
          groupId,
          groupName: order.name,
          isCollapsed: !isExpanded,
        });
        currentY += GROUP_HEADER_HEIGHT;

        // Add resources if expanded
        if (isExpanded) {
          for (const resourceId of resourceIds) {
            const resource = resources[resourceId];
            if (!resource) continue;

            virtualRows.push({
              id: `resource-${resource.id}-${order.id}`,
              resourceId: resource.id,
              virtualY: currentY,
              height: rowHeight,
              isGroupHeader: false,
              groupId,
            });
            currentY += rowHeight;
          }
        }
      }

      // Add unassigned resources at the end
      const unassignedResources = resourceList.filter(
        (r) => !assignedResources.has(r.id),
      );

      if (unassignedResources.length > 0) {
        const groupId = "unassigned";
        const isExpanded = expandedGroups.has(groupId);

        virtualRows.push({
          id: groupId,
          resourceId: null,
          virtualY: currentY,
          height: GROUP_HEADER_HEIGHT,
          isGroupHeader: true,
          groupId,
          groupName: "Unassigned",
          isCollapsed: !isExpanded,
        });
        currentY += GROUP_HEADER_HEIGHT;

        if (isExpanded) {
          for (const resource of unassignedResources) {
            virtualRows.push({
              id: `resource-${resource.id}`,
              resourceId: resource.id,
              virtualY: currentY,
              height: rowHeight,
              isGroupHeader: false,
              groupId,
            });
            currentY += rowHeight;
          }
        }
      }
    }

    return virtualRows;
  }, [resources, tasks, orders, groupingMode, expandedGroups, rowHeight]);
}

/**
 * Get visible rows for the current viewport.
 * Uses the composable context.
 */
export function useComposableVisibleRows(virtualRows: VirtualRow[]): VirtualRow[] {
  const viewport = useGanttViewport();
  const { scrollY, height, rowHeight } = viewport;

  return useMemo(() => {
    if (virtualRows.length === 0 || height === 0) return [];

    const BUFFER = 3;
    const visibleRows: VirtualRow[] = [];

    for (const row of virtualRows) {
      const rowTop = row.virtualY;
      const rowBottom = row.virtualY + row.height;

      if (
        rowBottom >= scrollY - BUFFER * rowHeight &&
        rowTop <= scrollY + height + BUFFER * rowHeight
      ) {
        visibleRows.push(row);
      }
    }

    return visibleRows;
  }, [virtualRows, scrollY, height, rowHeight]);
}
