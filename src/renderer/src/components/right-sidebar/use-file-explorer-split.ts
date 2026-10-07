import { useState } from 'react'
import {
  clampFileExplorerSplitRatio,
  FILE_EXPLORER_SPLIT_DEFAULT_RATIO,
  type FileExplorerSplitOrientation,
  type FileExplorerSplitRatio
} from './file-explorer-split-state'

type UseFileExplorerSplitParams = {
  /** Primary browse chain, or null when browse mode is off. */
  worktreePath: string | null
  /** Split button toggled in the toolbar. */
  splitEnabled: boolean
  /** Fallback root for the secondary pane (parent of the primary chain). */
  defaultRoot: (worktreePath: string | null) => string
}

/**
 * Split layout of the browse overlay. Local to the overlay, same transience as
 * browsePath itself — orientation and ratio are layout of this session, not
 * cross-session sidebar state. The second chain starts at the default root and
 * navigates inside its own pane from there.
 */
export function useFileExplorerSplit({
  worktreePath,
  splitEnabled,
  defaultRoot
}: UseFileExplorerSplitParams) {
  const [splitOrientation, setSplitOrientation] = useState<FileExplorerSplitOrientation>('columns')
  const [splitRatio, setSplitRatioState] = useState<FileExplorerSplitRatio>(
    FILE_EXPLORER_SPLIT_DEFAULT_RATIO
  )
  return {
    splitSecondaryPath: defaultRoot(worktreePath),
    splitOrientation,
    setSplitOrientation,
    splitRatio,
    setSplitRatio: (next: number) => setSplitRatioState(clampFileExplorerSplitRatio(next)),
    showSplit: splitEnabled && worktreePath !== null
  }
}
