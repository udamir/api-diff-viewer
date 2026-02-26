import type { DiffBlockData } from "../diff-builder/common";
import { decodeKey, encodeKey } from "./common";

/** A document path — string with `/` separators, or an array of segments */
export type DiffPath = string | string[];

/** Encode a single path segment (JSON Pointer escaping: `~` → `~0`, `/` → `~1`) */
export const encodeSegment = encodeKey;

/** Decode a single path segment (`~1` → `/`, `~0` → `~`) */
export const decodeSegment = decodeKey;

/** Convert a DiffPath to an array of decoded segments */
export function parsePath(path: DiffPath): string[] {
	if (Array.isArray(path)) return path;
	if (path === "") return [];
	return path.split("/").map(decodeSegment);
}

/** Convert an array of segments to a string-form path (encoded) */
export function formatPath(segments: string[]): string {
	return segments.map(encodeSegment).join("/");
}

/** Resolve a DiffPath to a DiffBlockData by matching the block ID */
export function resolvePathToBlock(path: DiffPath, blocks: DiffBlockData[]): DiffBlockData | null {
	const targetId = Array.isArray(path) ? formatPath(path) : path;

	const search = (nodes: DiffBlockData[]): DiffBlockData | null => {
		for (const block of nodes) {
			if (block.id === targetId) return block;
			const found = search(block.children);
			if (found) return found;
		}
		return null;
	};

	return search(blocks);
}

/** Get all ancestor block IDs for a given path (from root to parent) */
export function getAncestorBlockIds(path: DiffPath, blocks: DiffBlockData[]): string[] {
	const segments = parsePath(path);
	const ancestors: string[] = [];

	for (let i = 1; i < segments.length; i++) {
		const ancestorPath = formatPath(segments.slice(0, i));
		if (resolvePathToBlock(ancestorPath, blocks)) {
			ancestors.push(ancestorPath);
		}
	}

	return ancestors;
}
