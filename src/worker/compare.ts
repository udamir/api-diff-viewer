/**
 * Thin wrapper around api-smart-diff's apiCompare(), shared by the main thread,
 * the synchronous worker fallback and the worker entry point.
 */

import { apiCompare, type CompareError, type CompareOptions } from "api-smart-diff";
import type { MergedDocument } from "../types";
import type { WorkerCompareResult } from "./types";

/** Drop `error` (an arbitrary thrown value) so the errors stay structured-cloneable */
function toCloneableError({ kind, message, path, scope }: CompareError): CompareError {
	return { kind, message, path: [...path], scope };
}

/** Compare two documents and return the merged document plus the collected comparison errors */
export function compareDocuments(before: unknown, after: unknown, options?: CompareOptions): WorkerCompareResult {
	const result = apiCompare(before, after, options);
	return {
		merged: result.merged as MergedDocument,
		errors: (result.errors ?? []).map(toCloneableError),
	};
}

/**
 * Whether the options can be posted to a worker: functions (custom `rules`, `extensions`,
 * `annotateHook`, `onError`) cannot cross `postMessage`, so such comparisons run on the main thread.
 */
export function isCloneableCompareOptions(options?: CompareOptions): boolean {
	if (!options) return true;
	return !options.rules && !options.extensions && !options.annotateHook && !options.onError;
}
