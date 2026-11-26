/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { compareDocuments } from "./compare";
import type { WorkerRequest, WorkerResponse } from "./types";

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
	const msg = event.data;
	if (msg.type === "merge") {
		try {
			const result = compareDocuments(msg.payload.before, msg.payload.after, msg.payload.options);
			const response: WorkerResponse = { id: msg.id, type: "result", payload: result };
			self.postMessage(response);
		} catch (error) {
			const name = error instanceof Error ? error.name : undefined;
			const message = error instanceof Error ? error.message : String(error);
			const response: WorkerResponse = { id: msg.id, type: "error", payload: { message, name } };
			self.postMessage(response);
		}
	}
};
