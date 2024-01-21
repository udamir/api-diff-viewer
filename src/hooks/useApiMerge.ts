import { useEffect, useRef } from 'react'
import { ComapreOptions } from 'api-smart-diff'

// @ts-ignore
import MergeWorker from "../worker?worker&inline"

export const useAsyncMerge = (before: any, after: any, options: ComapreOptions): Promise<any> => {
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

export const useMergeWorker = (setData: (value: any) => void, setError?: (value: string) => void) => {
  const workerRef = useRef<Worker | null>(null)
  
  useEffect(() => {
    const worker: Worker = MergeWorker()
    workerRef.current = worker
    worker.onmessage = (event) => setData(event.data)
    worker.onerror = () => setError && setError('There is an error with worker!')
    return () => worker.terminate()
  }, [])
  
  return (before: any, after: any, options: ComapreOptions) => {
    setData(null)
    workerRef.current?.postMessage([before, after, options])
  }
}
