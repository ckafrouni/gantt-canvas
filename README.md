# Gantt Canvas

Custom Gantt chart built with Canvas 2D rendering and React. Uses a composable compound component architecture for flexible layouts.

## Features

### Task System
- **Phases**: Tasks have setup, execution, and cleanup phases with individual durations
- **Dependencies**: FS (Finish-to-Start), FF, SS, SF with lag support
- **Status**: scheduled, in_progress, completed, blocked
- **Constraints**: earliest start, latest end, fixed time (non-draggable)

### Interactions
- Click to select, drag to move/reschedule
- Drag edges to resize
- Scroll to pan, Ctrl+Scroll to zoom
- Ctrl+Z/Y for undo/redo
- Multi-select support
- **Snap resolution**: Configurable minimum time resolution (default: 30 min). Drag operations snap to this resolution, scaling with zoom level but never below the minimum.

### Rendering
- Canvas 2D with spatial indexing (rbush) for performance
- Handles 10k+ tasks smoothly
- Branded TypeScript types (TaskId, ResourceId, etc.)

## Demo Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page with all demos |
| `/gantt` | Original layout with top toolbar, task count selector (100-10k) |
| `/gantt-bottom-toolbar` | Toolbar at bottom (video editor style), sidebar left |
| `/gantt-sidebar-right` | Detail panel on right, floating toolbar, no sidebar |
| `/gantt-minimal` | Full-screen canvas with corner controls only |

## Composable API

```tsx
<Gantt.Provider
  tasks={tasks}
  resources={resources}
  minResolution={30} // Snap to 30-min intervals (default)
>
  <Gantt.Timeline height={50} />
  <Gantt.Sidebar width={200} />
  <Gantt.Canvas width={800} height={600} />
  <Gantt.Toolbar position="bottom" />
</Gantt.Provider>
```

**Components**: `Gantt.Provider`, `Gantt.Canvas`, `Gantt.Timeline`, `Gantt.Sidebar`, `Gantt.Toolbar`, `ZoomControls`, `UndoRedo`, `TodayButton`

**Hooks**: `useGanttActions`, `useGanttTasks`, `useGanttResources`, `useGanttSelection`, `useGanttSelectedTasks`, `useGanttViewport`, `useGanttZoom`, `useGanttMinResolution`, `useGanttDrag`, `useGanttCanUndo`

## Tech Stack
React 19 • Vite • Zustand • TanStack Router • Tailwind CSS • TypeScript

## Run
```bash
pnpm install
pnpm start
```
