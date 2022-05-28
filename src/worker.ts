/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { apiMerge } from "api-smart-diff"
import { metaKey } from "./diff-builder/common";

declare const self: ServiceWorkerGlobalScope;

self.onmessage =  (event) => {
  const rules = event.data[2]
  const data = apiMerge(event.data[0], event.data[1], { rules, metaKey, arrayMeta: true })
  postMessage(data)
}
