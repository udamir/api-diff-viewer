/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { apiMerge } from "api-smart-diff"
import { DiffBlockData, metaKey } from "./diff-builder/common";
import { buildDiffJson } from "./diff-builder/json-builder";
import { buildDiffYaml } from "./diff-builder/yaml-builder";

declare const self: ServiceWorkerGlobalScope;

self.onmessage =  (event) => {
  const rules = event.data[2]
    const data = apiMerge(event.data[0], event.data[1], { rules, metaKey, arrayMeta: true })
    const block = new DiffBlockData(1, -2, [])
    const buildDiff = event.data[3] === "json" ? buildDiffJson : buildDiffYaml
    buildDiff(event.data, block)
    postMessage(data)
}
