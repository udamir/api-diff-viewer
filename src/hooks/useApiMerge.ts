import { ApiDiffOptions } from 'api-smart-diff'

// @ts-ignore
import MergeWorker from "../worker?worker&inline"

export const useAsyncMerge = (before: any, after: any, options: ApiDiffOptions): Promise<any> => {
  return new Promise((resolve, reject) => {
    const worker: Worker = MergeWorker()
    worker.onmessage = (event) => {
      worker.terminate()
      resolve(event.data)
    }
    worker.onerror = (error) => {
      worker.terminate()
      reject('There is an error with worker!')
    }
    worker.postMessage([before, after, options])
  })
}
