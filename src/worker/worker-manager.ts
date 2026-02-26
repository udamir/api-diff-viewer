/**
 * Worker Manager
 *
 * Promise-based wrapper around the diff worker with automatic fallback
 * to synchronous apiMerge() when Worker creation fails.
 */

import type { ComapreOptions } from "api-smart-diff";
import { apiMerge } from "api-smart-diff";
import type { MergedDocument } from "../types";
import type { WorkerResponse } from "./types";

interface PendingRequest {
	resolve: (value: MergedDocument) => void;
	reject: (reason: unknown) => void;
}

export class DiffWorkerManager {
	private worker: Worker | null = null;
	private pendingRequests = new Map<number, PendingRequest>();
	private nextId = 0;
	private _useFallback = false;

	constructor(workerUrl?: string) {
		try {
			if (workerUrl) {
				this.worker = new Worker(workerUrl, { type: "module" });
			} else {
				// Inline blob worker — import the worker entry point via Vite's worker support
				// For production builds, the worker code is inlined.
				// For this implementation we fall back to sync if blob creation fails.
				this._useFallback = true;
			}
		} catch {
			console.warn("api-diff-viewer: Worker creation failed, using synchronous fallback");
			this._useFallback = true;
		}

		if (this.worker) {
			this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
				const msg = event.data;
				const pending = this.pendingRequests.get(msg.id);
				if (!pending) return;

				this.pendingRequests.delete(msg.id);
				if (msg.type === "result") {
					pending.resolve(msg.payload);
				} else if (msg.type === "error") {
					pending.reject(new Error(msg.payload.message));
				}
			};

			this.worker.onerror = () => {
				// On worker error, reject all pending and switch to fallback
				for (const [, pending] of this.pendingRequests) {
					pending.reject(new Error("Worker error"));
				}
				this.pendingRequests.clear();
				this._useFallback = true;
				this.worker?.terminate();
				this.worker = null;
			};
		}
	}

	/**
	 * Merge before/after specs. Uses worker if available, otherwise falls back to sync.
	 */
	async merge(before: unknown, after: unknown, options?: ComapreOptions): Promise<MergedDocument> {
		if (this._useFallback || !this.worker) {
			return apiMerge(before, after, options) as MergedDocument;
		}

		return new Promise((resolve, reject) => {
			const id = this.nextId++;
			this.pendingRequests.set(id, { resolve, reject });
			this.worker?.postMessage({
				id,
				type: "merge",
				payload: { before, after, options },
			});
		});
	}

	/**
	 * Terminate the worker and reject all pending requests.
	 */
	destroy(): void {
		for (const [, pending] of this.pendingRequests) {
			pending.reject(new Error("Worker manager destroyed"));
		}
		this.pendingRequests.clear();
		this.worker?.terminate();
		this.worker = null;
	}
}
