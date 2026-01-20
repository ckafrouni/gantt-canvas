import type { RenderLayer } from "../types";

type RenderCallback = () => void;

/**
 * Batches render calls using requestAnimationFrame
 * Prevents multiple renders per frame for better performance
 */
export class RenderScheduler {
	private frameId: number | null = null;
	private dirtyLayers: Set<RenderLayer> = new Set();
	private renderers: Map<RenderLayer, RenderCallback> = new Map();
	private isDestroyed = false;

	/**
	 * Register a renderer for a layer
	 */
	registerRenderer(layer: RenderLayer, callback: RenderCallback): void {
		this.renderers.set(layer, callback);
	}

	/**
	 * Unregister a renderer
	 */
	unregisterRenderer(layer: RenderLayer): void {
		this.renderers.delete(layer);
	}

	/**
	 * Mark a layer as dirty (needs re-render)
	 */
	markDirty(layer: RenderLayer): void {
		if (this.isDestroyed) return;
		this.dirtyLayers.add(layer);
		this.scheduleRender();
	}

	/**
	 * Mark multiple layers as dirty
	 */
	markDirtyMany(layers: RenderLayer[]): void {
		if (this.isDestroyed) return;
		for (const layer of layers) {
			this.dirtyLayers.add(layer);
		}
		this.scheduleRender();
	}

	/**
	 * Mark all layers as dirty
	 */
	markAllDirty(): void {
		if (this.isDestroyed) return;
		this.dirtyLayers.add("grid");
		this.dirtyLayers.add("tasks");
		this.dirtyLayers.add("dependencies");
		this.dirtyLayers.add("interaction");
		this.scheduleRender();
	}

	/**
	 * Force an immediate render (use sparingly)
	 */
	forceRender(): void {
		if (this.isDestroyed) return;
		this.cancelScheduledRender();
		this.render();
	}

	/**
	 * Schedule a render on the next animation frame
	 */
	private scheduleRender(): void {
		if (this.frameId !== null || this.isDestroyed) return;

		this.frameId = requestAnimationFrame(() => {
			this.frameId = null;
			this.render();
		});
	}

	/**
	 * Cancel any scheduled render
	 */
	private cancelScheduledRender(): void {
		if (this.frameId !== null) {
			cancelAnimationFrame(this.frameId);
			this.frameId = null;
		}
	}

	/**
	 * Execute renders for all dirty layers
	 */
	private render(): void {
		if (this.isDestroyed) return;

		const layers = Array.from(this.dirtyLayers);
		this.dirtyLayers.clear();

		// Render layers in order: grid -> tasks -> dependencies -> interaction
		const order: RenderLayer[] = [
			"grid",
			"tasks",
			"dependencies",
			"interaction",
		];

		for (const layer of order) {
			if (layers.includes(layer)) {
				const renderer = this.renderers.get(layer);
				if (renderer) {
					try {
						renderer();
					} catch (error) {
						console.error(`Error rendering layer ${layer}:`, error);
					}
				}
			}
		}
	}

	/**
	 * Check if a layer is dirty
	 */
	isDirty(layer: RenderLayer): boolean {
		return this.dirtyLayers.has(layer);
	}

	/**
	 * Check if any layer is dirty
	 */
	hasDirtyLayers(): boolean {
		return this.dirtyLayers.size > 0;
	}

	/**
	 * Clean up resources
	 */
	dispose(): void {
		this.isDestroyed = true;
		this.cancelScheduledRender();
		this.dirtyLayers.clear();
		this.renderers.clear();
	}
}

// Singleton instance
let schedulerInstance: RenderScheduler | null = null;

export function getRenderScheduler(): RenderScheduler {
	if (!schedulerInstance) {
		schedulerInstance = new RenderScheduler();
	}
	return schedulerInstance;
}

export function resetRenderScheduler(): void {
	if (schedulerInstance) {
		schedulerInstance.dispose();
		schedulerInstance = null;
	}
}
