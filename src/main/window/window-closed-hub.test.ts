import { EventEmitter } from 'node:events'

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { BrowserWindow } from 'electron'

import { onWindowClosed } from './window-closed-hub'

/**
 * Why: BrowserWindow is an EventEmitter, so a node EventEmitter is a structural
 * match for the events the hub uses; keeps type assertions out of the tests.
 */
function createWindow(): BrowserWindow {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: BrowserWindow is a node EventEmitter, the test double only exercises the event surface the hub uses.
  return new EventEmitter() as BrowserWindow
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('onWindowClosed', () => {
  it('attaches exactly one real closed listener and fans the event out to subscribers', () => {
    const window = createWindow()
    const first = vi.fn()
    const second = vi.fn()

    onWindowClosed(window, first)
    onWindowClosed(window, second)
    window.emit('closed')

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
    expect(window.listenerCount('closed')).toBe(1)
  })

  it('keeps the real listener count stable across subscribe and unsubscribe churn', () => {
    const window = createWindow()

    for (let i = 0; i < 12; i += 1) {
      const remove = onWindowClosed(window, vi.fn())
      remove()
    }
    onWindowClosed(window, vi.fn())
    onWindowClosed(window, vi.fn())

    expect(window.listenerCount('closed')).toBe(1)
  })

  it('removes a subscriber before dispatch so it is not invoked', () => {
    const window = createWindow()
    const listener = vi.fn()

    const remove = onWindowClosed(window, listener)
    remove()
    window.emit('closed')

    expect(listener).not.toHaveBeenCalled()
  })

  it('supports repeated unsubscribe calls', () => {
    const window = createWindow()
    const listener = vi.fn()

    const remove = onWindowClosed(window, listener)
    remove()
    remove()
    window.emit('closed')

    expect(listener).not.toHaveBeenCalled()
  })

  it('isolates subscriber failures and warns instead of skipping the rest', () => {
    const window = createWindow()
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const failing = vi.fn(() => {
      throw new Error('subscriber boom')
    })
    const after = vi.fn()

    onWindowClosed(window, failing)
    onWindowClosed(window, after)
    window.emit('closed')

    expect(failing).toHaveBeenCalledTimes(1)
    expect(after).toHaveBeenCalledTimes(1)
    expect(warnSpy).toHaveBeenCalledWith(
      '[window-closed-hub] closed subscriber failed',
      expect.any(Error)
    )
  })

  it('ignores duplicate window closed dispatches', () => {
    const window = createWindow()
    const listener = vi.fn()

    onWindowClosed(window, listener)
    window.emit('closed')
    window.emit('closed')

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not invoke subscribers registered after the window already closed', () => {
    const window = createWindow()
    const before = vi.fn()
    const late = vi.fn()

    onWindowClosed(window, before)
    window.emit('closed')
    onWindowClosed(window, late)
    window.emit('closed')

    expect(before).toHaveBeenCalledTimes(1)
    expect(late).not.toHaveBeenCalled()
  })

  it('degrades to a no-op subscription for lean doubles without an on method', () => {
    // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: the lean double intentionally omits the event surface to verify the no-op degradation path.
    const leanWindow = {
      isDestroyed: vi.fn(() => false)
    } as unknown as BrowserWindow
    const listener = vi.fn()

    const remove = onWindowClosed(leanWindow, listener)
    remove()

    expect(listener).not.toHaveBeenCalled()
  })
})
