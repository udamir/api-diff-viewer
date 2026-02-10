/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { apiMerge } from 'api-smart-diff'
import type { WorkerRequest, WorkerResponse } from './types'
import type { MergedDocument } from '../types'

declare const self: DedicatedWorkerGlobalScope

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data
  if (msg.type === 'merge') {
    try {
      const result = apiMerge(msg.payload.before, msg.payload.after, msg.payload.options) as MergedDocument
      const response: WorkerResponse = { id: msg.id, type: 'result', payload: result }
      self.postMessage(response)
    } catch (error) {
      const response: WorkerResponse = { id: msg.id, type: 'error', payload: { message: String(error) } }
      self.postMessage(response)
    }
  }
}
