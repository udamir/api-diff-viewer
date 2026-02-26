export const isEmpty = (value: unknown) => {
	return (
		!value ||
		value === "0" ||
		(Array.isArray(value) && value.length === 0) ||
		(value instanceof Object && Object.keys(value).length === 0)
	);
};

export const encodeKey = (key: string): string => {
	return key.replace(/~/g, "~0").replace(/\//g, "~1");
};

export const decodeKey = (key: string): string => {
	return key.replace(/~1/g, "/").replace(/~0/g, "~");
};

export const getPathValue = (data: Record<string, unknown>, path: string[]): unknown => {
	let item: unknown = data;
	for (const key of path) {
		if (typeof item !== "object" || item === null) return undefined;
		item = (item as Record<string, unknown>)[key];
		if (item === undefined) {
			return undefined;
		}
	}
	return item;
};
