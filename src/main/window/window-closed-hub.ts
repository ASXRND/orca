import type { BrowserWindow } from 'electron'

/**
 * Fan-out hub for `closed` listeners on a single BrowserWindow.
 *
 * Why: every subsystem used to attach its own `closed` listener directly to the
 * window. Electron's BrowserWindow is an EventEmitter with the default
 * maxListeners of 10, so the ~10 permanent + transient listeners pushed the
 * count past the limit and triggered MaxListenersExceededWarning at startup.
 * Subscribers register here instead; the hub holds exactly ONE real `closed`
 * listener per window and fans the event out to subscribers with no cap.
 *
 * Semantics:
 * - `closed` can fire only once per window, so subscribers are invoked at most
 *   once and their set is cleared on dispatch.
 * - Removers are idempotent and tolerate missing `removeListener` (used on
 *   test doubles with `on`/`once` only) and windows that are already destroyed.
 */

export type WindowClosedListener = () => void

const subscribers = new WeakMap<BrowserWindow, Set<WindowClosedListener>>()

const attachHub = new WeakMap<BrowserWindow, { isClosed: () => boolean }>()

function ensureHub(
  window: BrowserWindow,
  attachWindowListener: (...args: unknown[]) => unknown
): { isClosed: () => boolean } {
  const existing = attachHub.get(window)
  if (existing) {
    return existing
  }

  let closed = false
  const listeners = new Set<WindowClosedListener>()
  subscribers.set(window, listeners)

  const dispatch = (): void => {
    if (closed) {
      return
    }
    closed = true
    // Why: `closed` fires at most once; drop the registry eagerly so
    // subscribers registered after dispatch are not silently leaked.
    subscribers.delete(window)
    // Why: iterate the live set directly; removers may delete the current
    // element mid-loop and Set iteration tolerates that.
    for (const listener of listeners) {
      try {
        listener()
      } catch (error) {
        console.warn('[window-closed-hub] closed subscriber failed', error)
      }
    }
    listeners.clear()
  }

  const hub = { isClosed: (): boolean => closed }
  attachHub.set(window, hub)
  attachWindowListener('closed', dispatch)
  return hub
}

/**
 * Subscribes `listener` to the window's `closed` event via the shared fan-out
 * hub. Returns an idempotent unsubscribe function; it is safe to call the
 * returned remover multiple times, after close, or on windows whose
 * `removeListener` is unavailable (lean test doubles).
 *
 * Why: subscribing after the window has already closed (only possible with a
 * direct test dispatch) attaches a hub whose dispatch can never fire; lean
 * doubles without `on` are treated the same way and the remover is a no-op.
 */
export function onWindowClosed(window: BrowserWindow, listener: WindowClosedListener): () => void {
  const existingHub = attachHub.get(window)
  if (existingHub?.isClosed()) {
    // Why: mirror EventEmitter semantics — a subscription added after `closed`
    // already fired would otherwise wait forever; register nothing.
    return () => {}
  }
  if (!existingHub) {
    // Why: defer real-window attach through a duck-typed probe so lean test
    // doubles without `on` behave like a closed window (no-op remover) instead
    // of throwing. Reflect.apply keeps `this` bound to the window without
    // type assertions on the Electron prototype method.
    const probe: unknown = window.on
    if (typeof probe !== 'function') {
      return () => {}
    }
    ensureHub(window, (...args: unknown[]) => {
      Reflect.apply(probe, window, args)
    })
  }

  const listeners = subscribers.get(window)
  if (!listeners) {
    // Unreachable with the current ensureHub: a hub is created together with
    // its registry before any listener can be inserted.
    return () => {}
  }
  listeners.add(listener)
  let removed = false
  return (): void => {
    if (removed) {
      return
    }
    removed = true
    listeners.delete(listener)
  }
}
