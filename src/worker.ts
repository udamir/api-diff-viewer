/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { apiMerge } from "api-smart-diff"

declare const self: ServiceWorkerGlobalScope;

self.onmessage = (event) => {
  const [before, after, options] = event.data
  postMessage(apiMerge(before, after, options))
}
