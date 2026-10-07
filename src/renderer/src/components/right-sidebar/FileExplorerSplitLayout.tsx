import React, { useRef } from 'react'
import { Columns2, Rows2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { translate } from '@/i18n/i18n'
import {
  clampFileExplorerSplitRatio,
  toggleFileExplorerSplitOrientation,
  type FileExplorerSplitOrientation,
  type FileExplorerSplitRatio
} from './file-explorer-split-state'
import { FileExplorerSplitPane, FileExplorerSplitDivider } from './FileExplorerSplitPane'

type FileExplorerSplitLayoutProps = {
  primaryBrowsePath: string
  secondaryBrowsePath: string
  orientation: FileExplorerSplitOrientation
  ratio: FileExplorerSplitRatio
  onPrimaryExit: () => void
  onSecondaryExit: () => void
  onOrientationChange: (orientation: FileExplorerSplitOrientation) => void
  onRatioChange: (ratio: FileExplorerSplitRatio) => void
}

/**
 * Two independent FileExplorerBrowseMode panes with their own chains.
 * Each side keeps its own path menu; all split state lives in the parent
 * so an idle pane can unmount and restore without touching the global store.
 */
export function FileExplorerSplitLayout({
  primaryBrowsePath,
  secondaryBrowsePath,
  orientation,
  ratio,
  onPrimaryExit,
  onSecondaryExit,
  onOrientationChange,
  onRatioChange
}: FileExplorerSplitLayoutProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const isColumns = orientation === 'columns'

  return (
    <div
      ref={containerRef}
      className={cn('relative flex min-h-0 flex-1', isColumns ? 'flex-row' : 'flex-col')}
    >
      <FileExplorerSplitPane browsePath={primaryBrowsePath} onExit={onPrimaryExit} />
      <FileExplorerSplitDivider
        orientation={orientation}
        ratio={ratio}
        containerRef={containerRef}
        onResize={(next: number) => onRatioChange(clampFileExplorerSplitRatio(next))}
      />
      <FileExplorerSplitPane browsePath={secondaryBrowsePath} onExit={onSecondaryExit} />
      <div className="absolute right-1 top-1 z-20">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-muted-foreground hover:text-foreground"
              aria-label={translate(
                'auto.components.right.sidebar.FileExplorerSplitLayout.toggleOrientation',
                'Toggle split orientation'
              )}
              onClick={() => onOrientationChange(toggleFileExplorerSplitOrientation(orientation))}
            >
              {isColumns ? <Rows2 className="size-3" /> : <Columns2 className="size-3" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={4}>
            {translate(
              'auto.components.right.sidebar.FileExplorerSplitLayout.toggleOrientation',
              'Toggle split orientation'
            )}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
