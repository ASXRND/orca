/** Split layout of the browse-mode overlay: two FileExplorerBrowseMode panes. */

/** Side-by-side columns, or stacked rows. */
export type FileExplorerSplitOrientation = 'columns' | 'rows'

/** Fraction of the main axis owned by the primary pane. */
export type FileExplorerSplitRatio = number

export const FILE_EXPLORER_SPLIT_DEFAULT_RATIO = 0.5
/** Min/max so neither pane collapses fully by drag; close via the split button instead. */
export const FILE_EXPLORER_SPLIT_MIN_RATIO = 0.1
export const FILE_EXPLORER_SPLIT_MAX_RATIO = 0.9
/** ms without pointer/keyboard activity before an idle pane stops rendering. */
export const FILE_EXPLORER_SPLIT_IDLE_MS = 60_000

export function clampFileExplorerSplitRatio(ratio: number): FileExplorerSplitRatio {
  if (!Number.isFinite(ratio)) {
    return FILE_EXPLORER_SPLIT_DEFAULT_RATIO
  }
  return Math.min(FILE_EXPLORER_SPLIT_MAX_RATIO, Math.max(FILE_EXPLORER_SPLIT_MIN_RATIO, ratio))
}

/** Pixel size of the primary pane along the split axis. */
export function fileExplorerSplitPrimarySize(
  containerSize: number,
  ratio: FileExplorerSplitRatio
): number {
  return Math.round(containerSize * clampFileExplorerSplitRatio(ratio))
}

/** Toggle columns <-> rows. */
export function toggleFileExplorerSplitOrientation(
  orientation: FileExplorerSplitOrientation
): FileExplorerSplitOrientation {
  return orientation === 'columns' ? 'rows' : 'columns'
}
