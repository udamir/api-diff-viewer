import type { ComapreOptions } from 'api-smart-diff'
import type { MergedDocument } from '../types'

export interface WorkerMergeRequest {
  id: number
  type: 'merge'
  payload: { before: unknown; after: unknown; options?: ComapreOptions }
}

export interface WorkerResultResponse {
  id: number
  type: 'result'
  payload: MergedDocument
}

export interface WorkerErrorResponse {
  id: number
  type: 'error'
  payload: { message: string }
}

export type WorkerRequest = WorkerMergeRequest
export type WorkerResponse = WorkerResultResponse | WorkerErrorResponse
