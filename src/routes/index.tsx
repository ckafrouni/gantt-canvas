import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowDown,
	Calendar,
	LayoutGrid,
	Minimize2,
	PanelRight,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

function App() {
	const demos = [
		{
			icon: <Calendar className="w-8 h-8 text-cyan-400" />,
			title: "Original Gantt",
			description:
				"The original monolithic Gantt chart component with default layout.",
			href: "/gantt",
			color: "cyan",
		},
		{
			icon: <ArrowDown className="w-8 h-8 text-emerald-400" />,
			title: "Bottom Toolbar",
			description:
				"Toolbar at bottom like video editing software. Selection info bar below.",
			href: "/gantt-bottom-toolbar",
			color: "emerald",
		},
		{
			icon: <PanelRight className="w-8 h-8 text-violet-400" />,
			title: "Right Sidebar + Floating",
			description:
				"Detail panel on right, floating toolbar overlay. No resource sidebar.",
			href: "/gantt-sidebar-right",
			color: "violet",
		},
		{
			icon: <Minimize2 className="w-8 h-8 text-amber-400" />,
			title: "Minimal Canvas",
			description:
				"Full-screen canvas with corner controls. Completely custom UI.",
			href: "/gantt-minimal",
			color: "amber",
		},
	];

	return (
		<div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
			{/* Hero */}
			<section className="relative py-20 px-6 text-center overflow-hidden">
				<div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10" />
				<div className="relative max-w-4xl mx-auto">
					<div className="flex items-center justify-center gap-4 mb-6">
						<LayoutGrid className="w-12 h-12 text-cyan-400" />
						<h1 className="text-5xl md:text-6xl font-black text-white">
							<span className="text-gray-300">Composable</span>{" "}
							<span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
								Gantt
							</span>
						</h1>
					</div>
					<p className="text-xl md:text-2xl text-gray-300 mb-4 font-light">
						High-performance Gantt chart with compound component architecture
					</p>
					<p className="text-lg text-gray-400 max-w-2xl mx-auto mb-8">
						Build custom layouts using composable components. Full control over
						positioning with React context-based state management.
					</p>
				</div>
			</section>

			{/* Demo Cards */}
			<section className="py-12 px-6 max-w-5xl mx-auto">
				<h2 className="text-2xl font-semibold text-white mb-8 text-center">
					Layout Examples
				</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					{demos.map((demo) => (
						<Link
							key={demo.href}
							to={demo.href}
							className={`block bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-${demo.color}-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-${demo.color}-500/10 group`}
						>
							<div className="mb-4">{demo.icon}</div>
							<h3 className="text-xl font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
								{demo.title}
							</h3>
							<p className="text-gray-400 leading-relaxed text-sm">
								{demo.description}
							</p>
							<div className="mt-4 text-sm text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">
								View demo →
							</div>
						</Link>
					))}
				</div>
			</section>

			{/* Usage Example */}
			<section className="py-12 px-6 max-w-4xl mx-auto">
				<h2 className="text-2xl font-semibold text-white mb-6 text-center">
					Composable API
				</h2>
				<div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
					<pre className="text-sm text-gray-300 overflow-x-auto">
						<code>{`import { Gantt } from "@/features/gantt/composable";

function CustomLayout() {
  return (
    <Gantt.Provider tasks={tasks} resources={resources}>
      {/* Arrange however you want */}
      <div className="flex flex-col h-full">
        <Gantt.Timeline height={50} />
        <div className="flex flex-1">
          <Gantt.Sidebar width={200} />
          <Gantt.Canvas width={800} height={600} />
        </div>
        <Gantt.Toolbar position="bottom" />
      </div>
    </Gantt.Provider>
  );
}`}</code>
					</pre>
				</div>
			</section>

			{/* Components List */}
			<section className="py-12 px-6 max-w-4xl mx-auto">
				<h2 className="text-2xl font-semibold text-white mb-6 text-center">
					Available Components
				</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{[
						"Gantt.Provider",
						"Gantt.Canvas",
						"Gantt.Timeline",
						"Gantt.Sidebar",
						"Gantt.Toolbar",
						"ZoomControls",
						"UndoRedo",
						"TodayButton",
					].map((component) => (
						<div
							key={component}
							className="bg-slate-800/50 rounded-lg px-4 py-3 text-center border border-slate-700"
						>
							<code className="text-cyan-400 text-sm">{component}</code>
						</div>
					))}
				</div>
			</section>

			{/* Hooks List */}
			<section className="py-12 px-6 max-w-4xl mx-auto mb-12">
				<h2 className="text-2xl font-semibold text-white mb-6 text-center">
					Available Hooks
				</h2>
				<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
					{[
						"useGanttActions",
						"useGanttTasks",
						"useGanttResources",
						"useGanttSelection",
						"useGanttSelectedTasks",
						"useGanttViewport",
						"useGanttZoom",
						"useGanttDrag",
						"useGanttCanUndo",
					].map((hook) => (
						<div
							key={hook}
							className="bg-slate-800/50 rounded-lg px-3 py-2 text-center border border-slate-700"
						>
							<code className="text-emerald-400 text-xs">{hook}</code>
						</div>
					))}
				</div>
			</section>
		</div>
	);
}
