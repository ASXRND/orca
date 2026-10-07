// @vitest-environment happy-dom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFileExplorerIdleRender } from './use-file-explorer-idle-render'

describe('useFileExplorerIdleRender', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders immediately after mount', () => {
    const { result } = renderHook(() => useFileExplorerIdleRender({ idleMs: 1000 }))
    expect(result.current.rendering).toBe(true)
  })

  it('unmounts content after the idle delay', () => {
    const { result } = renderHook(() => useFileExplorerIdleRender({ idleMs: 1000 }))
    act(() => {
      vi.advanceTimersByTime(1001)
    })
    expect(result.current.rendering).toBe(false)
  })

  it('resets the timer on activity', () => {
    const { result } = renderHook(() => useFileExplorerIdleRender({ idleMs: 1000 }))
    act(() => {
      vi.advanceTimersByTime(900)
      result.current.onPaneActivity()
      vi.advanceTimersByTime(900)
    })
    // 1800ms passed but the timer restarted at 900ms, so still rendering.
    expect(result.current.rendering).toBe(true)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current.rendering).toBe(false)
  })

  it('remounts on activity after idling', () => {
    const { result } = renderHook(() => useFileExplorerIdleRender({ idleMs: 1000 }))
    act(() => {
      vi.advanceTimersByTime(1001)
    })
    expect(result.current.rendering).toBe(false)
    act(() => {
      result.current.onPaneActivity()
    })
    expect(result.current.rendering).toBe(true)
  })
})
