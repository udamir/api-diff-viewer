import { BaseRulesType } from "api-smart-diff"
import { DiffBlockData } from "./common"

export const buildDiffBlock = (before: any, after: any, rules: BaseRulesType, format: "json" | "yaml" = "yaml"): Promise<DiffBlockData> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../worker.js", import.meta.url))
    worker.onmessage = (event) => {
      worker.terminate()
      resolve(event.data)
    }
    worker.onerror = (error) => {
      worker.terminate()
      reject(error)
    }
    worker.postMessage([before, after, rules, format])
  })
}

