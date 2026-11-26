import type { CompareError, CompareOptions } from "api-smart-diff";
import type { MergedDocument } from "../types";

export interface WorkerMergeRequest {
	id: number;
	type: "merge";
	payload: { before: unknown; after: unknown; options?: CompareOptions };
}

/** Result of a comparison: the merged document and the errors collected by api-smart-diff */
export interface WorkerCompareResult {
	merged: MergedDocument;
	/** Problems inside the comparison (unresolved `$ref`, a throwing rule, ...); empty when there were none */
	errors: CompareError[];
}

export interface WorkerResultResponse {
	id: number;
	type: "result";
	payload: WorkerCompareResult;
}

export interface WorkerErrorResponse {
	id: number;
	type: "error";
	/** `name` is the error class name (e.g. "UnsupportedSpecError"), since `instanceof` does not survive postMessage */
	payload: { message: string; name?: string };
}

export type WorkerRequest = WorkerMergeRequest;
export type WorkerResponse = WorkerResultResponse | WorkerErrorResponse;
