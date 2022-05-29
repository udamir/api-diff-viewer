import { ApiDiffOptions } from 'api-smart-diff'

export const useAsyncMerge = (before: any, after: any, options: ApiDiffOptions): Promise<any> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../worker.ts", import.meta.url), { type: "module" })
    worker.onmessage = (event) => {
      worker.terminate()
      resolve(event.data)
    }
    worker.onerror = (error) => {
      worker.terminate()
      reject(error)
    }
    worker.postMessage([before, after, options])
  })
}
