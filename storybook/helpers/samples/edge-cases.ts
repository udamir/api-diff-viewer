/** Empty spec — no properties at all */
export const emptySpec = {}

/** Identical before/after — should produce zero changes */
export const identicalSpec = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {},
}

/** A valid JSON string input (should be parsed automatically) */
export const jsonStringBefore = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'String Test', version: '1.0' },
})

export const jsonStringAfter = JSON.stringify({
  openapi: '3.0.0',
  info: { title: 'String Test Modified', version: '2.0' },
})

/** Deeply nested spec for stress testing */
function generateDeeplyNested(depth: number): Record<string, unknown> {
  if (depth <= 0) return { value: 'leaf' }
  return { nested: generateDeeplyNested(depth - 1) }
}

export const deeplyNestedBefore = generateDeeplyNested(10)
export const deeplyNestedAfter = {
  ...generateDeeplyNested(10),
  nested: {
    ...generateDeeplyNested(9),
    addedField: 'new',
  },
}

/** Minimal spec with a single change */
export const minimalBefore = { key: 'old' }
export const minimalAfter = { key: 'new' }
