/**
 * Typed Event Emitter
 *
 * A generic event emitter with TypeScript type safety for event names and payloads.
 */

export class TypedEventEmitter<Events extends Record<string, unknown>> {
  private _listeners = new Map<keyof Events, Set<(data: unknown) => void>>()

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): () => void {
    let set = this._listeners.get(event)
    if (!set) {
      set = new Set()
      this._listeners.set(event, set)
    }
    set.add(handler as (data: unknown) => void)
    return () => {
      set!.delete(handler as (data: unknown) => void)
    }
  }

  /**
   * Unsubscribe a handler from an event.
   */
  off<K extends keyof Events>(event: K, handler: (data: Events[K]) => void): void {
    const set = this._listeners.get(event)
    if (set) {
      set.delete(handler as (data: unknown) => void)
    }
  }

  /**
   * Emit an event to all subscribed handlers.
   * Errors in handlers are caught and logged.
   */
  protected emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const set = this._listeners.get(event)
    if (!set) return
    for (const handler of set) {
      try {
        handler(data)
      } catch (err) {
        console.error(`Error in event handler for "${String(event)}":`, err)
      }
    }
  }

  /**
   * Remove all event listeners.
   */
  removeAllListeners(): void {
    this._listeners.clear()
  }
}
