export const isEmpty = (value: any) => {
  return !value || value === '0' || (value instanceof Array && value.length === 0) || (value instanceof Object && !Object.keys(value))
}

export const encodeKey = (key: string): string => {
  return key.replace(new RegExp("/", "g"), "~1")
}

export const decodeKey = (key: string): string => {
  return key.replace(new RegExp("~1", "g"), "/")
}

export const getPathValue = (data: any, path: string[]) => {
  let item = data
  for (const key of path) {
    item = item[key]
    if (item === undefined) { return undefined }
  }
  return item
}
