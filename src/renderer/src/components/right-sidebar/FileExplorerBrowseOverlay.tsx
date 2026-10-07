import React from 'react'
import { FileExplorerBrowseMode } from './FileExplorerBrowseMode'
import { FileExplorerSplitLayout } from './FileExplorerSplitLayout'
import { useFileExplorerSplit } from './use-file-explorer-split'

type FileExplorerBrowseOverlayProps = {
  browsePath: string | null
  splitEnabled: boolean
  onBrowsePathChange: (path: string | null) => void
  onSplitChange: (enabled: boolean) => void
}

/**
 * Browse mode overlay on top of the worktree tree; exiting returns to the
 * project listing. Keyed by the root — switching folders restarts browse state
 * instead of syncing it from a prop through an effect.
 */
export function FileExplorerBrowseOverlay({
  browsePath,
  splitEnabled,
  onBrowsePathChange,
  onSplitChange
}: FileExplorerBrowseOverlayProps): React.JSX.Element | null {
  const {
    splitSecondaryPath,
    splitOrientation,
    setSplitOrientation,
    splitRatio,
    setSplitRatio,
    showSplit
  } = useFileExplorerSplit({
    worktreePath: browsePath,
    splitEnabled,
    defaultRoot: (path) => path ?? '/'
  })
  if (!browsePath) {
    return null
  }
  return (
    <div className="absolute inset-0 z-10 flex min-h-0 flex-col bg-background">
      {showSplit ? (
        <FileExplorerSplitLayout
          primaryBrowsePath={browsePath}
          secondaryBrowsePath={splitSecondaryPath}
          orientation={splitOrientation}
          ratio={splitRatio}
          onPrimaryExit={() => {
            onSplitChange(false)
            onBrowsePathChange(null)
          }}
          onSecondaryExit={() => onSplitChange(false)}
          onOrientationChange={setSplitOrientation}
          onRatioChange={setSplitRatio}
        />
      ) : (
        <FileExplorerBrowseMode
          key={browsePath}
          browsePath={browsePath}
          onExit={() => onBrowsePathChange(null)}
        />
      )}
    </div>
  )
}
