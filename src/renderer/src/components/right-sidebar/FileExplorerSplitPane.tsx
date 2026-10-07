import React, { useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import { FileExplorerBrowseMode } from './FileExplorerBrowseMode'
import {
  clampFileExplorerSplitRatio,
  type FileExplorerSplitOrientation,
  type FileExplorerSplitRatio
} from './file-explorer-split-state'
import { useFileExplorerIdleRender } from './use-file-explorer-idle-render'

type FileExplorerSplitPaneProps = {
  browsePath: string
  onExit: () => void
}

/**
 * One side of the split. Content unmounts after a minute of inactivity —
 * browsePath stays in the parent, so the chain restores on next activity.
 */
export function FileExplorerSplitPane({ browsePath, onExit }: FileExplorerSplitPaneProps) {
  const { rendering, containerHandlers } = useFileExplorerIdleRender()
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col" {...containerHandlers}>
      {rendering ? (
        <FileExplorerBrowseMode key={browsePath} browsePath={browsePath} onExit={onExit} />
      ) : (
        <div className="flex min-h-0 flex-1 items-center justify-center px-2 text-center text-[11px] text-muted-foreground">
          {translate(
            'auto.components.right.sidebar.FileExplorerSplitLayout.idlePaused',
            'Paused after a minute of inactivity — click to resume'
          )}
        </div>
      )}
    </div>
  )
}

type FileExplorerSplitDividerProps = {
  orientation: FileExplorerSplitOrientation
  ratio: FileExplorerSplitRatio
  containerRef: React.RefObject<HTMLDivElement | null>
  onResize: (ratio: number) => void
}

/**
 * Draggable divider, following the combined-diff file tree divider pattern:
 * role=separator with aria bounds and keyboard stepping.
 */
export function FileExplorerSplitDivider({
  orientation,
  ratio,
  containerRef,
  onResize
}: FileExplorerSplitDividerProps) {
  const isColumns = orientation === 'columns'
  const startRef = useRef<{ client: number; ratio: number } | null>(null)
  const ratioRef = useRef(ratio)
  ratioRef.current = ratio

  const finishDrag = useCallback(() => {
    startRef.current = null
  }, [])

  const handleMove = useCallback(
    (event: PointerEvent) => {
      const start = startRef.current
      const container = containerRef.current
      if (!start || !container) {
        return
      }
      const rect = container.getBoundingClientRect()
      const span = isColumns ? rect.width : rect.height
      if (span <= 0) {
        return
      }
      const delta = (isColumns ? event.clientX : event.clientY) - start.client
      onResize(start.ratio + delta / span)
    },
    [containerRef, isColumns, onResize]
  )

  const startDrag = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      startRef.current = {
        client: isColumns ? event.clientX : event.clientY,
        ratio: ratioRef.current
      }
      const move = (e: PointerEvent) => handleMove(e)
      const up = () => {
        finishDrag()
        document.removeEventListener('pointermove', move)
        document.removeEventListener('pointerup', up)
      }
      document.addEventListener('pointermove', move)
      document.addEventListener('pointerup', up)
    },
    [finishDrag, handleMove, isColumns]
  )

  const stepRatio = useCallback(
    (event: React.KeyboardEvent) => {
      const step = event.shiftKey ? 0.1 : 0.02
      const current = ratioRef.current
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault()
        onResize(current - step)
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault()
        onResize(current + step)
      }
    },
    [onResize]
  )

  return (
    <div
      role="separator"
      aria-label={translate(
        'auto.components.right.sidebar.FileExplorerSplitLayout.resizeDivider',
        'Resize explorer panes'
      )}
      aria-orientation={isColumns ? 'vertical' : 'horizontal'}
      aria-valuemin={10}
      aria-valuemax={90}
      aria-valuenow={Math.round(clampFileExplorerSplitRatio(ratio) * 100)}
      tabIndex={0}
      className={cn(
        'group z-10 shrink-0 outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isColumns ? 'h-full w-1 cursor-col-resize' : 'h-1 w-full cursor-row-resize'
      )}
      onMouseDown={startDrag}
      onKeyDown={stepRatio}
    >
      <div className="h-full w-full bg-transparent transition-colors group-hover:bg-ring/50 group-active:bg-ring group-focus-visible:bg-ring" />
    </div>
  )
}
