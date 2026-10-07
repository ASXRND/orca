import { useCallback, useEffect, useRef, useState } from 'react'
import { FILE_EXPLORER_SPLIT_IDLE_MS } from './file-explorer-split-state'

type UseFileExplorerIdleRenderOptions = {
  /** Idle delay before the pane stops rendering; defaults to one minute. */
  idleMs?: number
}

/**
 * Marks a split pane idle after `idleMs` without pointer or keyboard activity.
 * The pane content unmounts (browsePath state stays in the parent, so the chain
 * restores on next activity); any event inside the pane remounts it instantly.
 */
export function useFileExplorerIdleRender(options: UseFileExplorerIdleRenderOptions = {}): {
  rendering: boolean
  onPaneActivity: () => void
  containerHandlers: {
    onPointerDown: () => void
    onPointerMove: () => void
    onWheel: () => void
    onKeyDown: () => void
    onFocus: () => void
  }
} {
  const idleMs = options.idleMs ?? FILE_EXPLORER_SPLIT_IDLE_MS
  const [rendering, setRendering] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const renderingRef = useRef(rendering)
  renderingRef.current = rendering

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    },
    []
  )

  const armTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null
      setRendering(false)
    }, idleMs)
  }, [idleMs])

  useEffect(() => {
    armTimer()
  }, [armTimer])

  const onPaneActivity = useCallback(() => {
    if (!renderingRef.current) {
      setRendering(true)
    }
    armTimer()
  }, [armTimer])

  const containerHandlers = {
    onPointerDown: onPaneActivity,
    onPointerMove: onPaneActivity,
    onWheel: onPaneActivity,
    onKeyDown: onPaneActivity,
    onFocus: onPaneActivity
  }

  return { rendering, onPaneActivity, containerHandlers }
}
