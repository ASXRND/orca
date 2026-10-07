import { describe, expect, it } from 'vitest'
import {
  clampFileExplorerSplitRatio,
  FILE_EXPLORER_SPLIT_DEFAULT_RATIO,
  FILE_EXPLORER_SPLIT_IDLE_MS,
  FILE_EXPLORER_SPLIT_MAX_RATIO,
  FILE_EXPLORER_SPLIT_MIN_RATIO,
  fileExplorerSplitPrimarySize,
  toggleFileExplorerSplitOrientation
} from './file-explorer-split-state'

describe('clampFileExplorerSplitRatio', () => {
  it('keeps an in-range ratio as is', () => {
    expect(clampFileExplorerSplitRatio(0.5)).toBe(0.5)
  })

  it('clamps to the min and max edges', () => {
    expect(clampFileExplorerSplitRatio(0)).toBe(FILE_EXPLORER_SPLIT_MIN_RATIO)
    expect(clampFileExplorerSplitRatio(0.05)).toBe(FILE_EXPLORER_SPLIT_MIN_RATIO)
    expect(clampFileExplorerSplitRatio(0.99)).toBe(FILE_EXPLORER_SPLIT_MAX_RATIO)
    expect(clampFileExplorerSplitRatio(1)).toBe(FILE_EXPLORER_SPLIT_MAX_RATIO)
  })

  it('falls back to default for non-finite input', () => {
    expect(clampFileExplorerSplitRatio(Number.NaN)).toBe(FILE_EXPLORER_SPLIT_DEFAULT_RATIO)
    expect(clampFileExplorerSplitRatio(Number.POSITIVE_INFINITY)).toBe(
      FILE_EXPLORER_SPLIT_DEFAULT_RATIO
    )
  })
})

describe('fileExplorerSplitPrimarySize', () => {
  it('converts ratio to pixels', () => {
    expect(fileExplorerSplitPrimarySize(1000, 0.5)).toBe(500)
    expect(fileExplorerSplitPrimarySize(1000, 0)).toBe(
      Math.round(1000 * FILE_EXPLORER_SPLIT_MIN_RATIO)
    )
  })
})

describe('toggleFileExplorerSplitOrientation', () => {
  it('toggles columns <-> rows', () => {
    expect(toggleFileExplorerSplitOrientation('columns')).toBe('rows')
    expect(toggleFileExplorerSplitOrientation('rows')).toBe('columns')
  })
})

describe('FILE_EXPLORER_SPLIT_IDLE_MS', () => {
  it('idles a pane after one minute', () => {
    expect(FILE_EXPLORER_SPLIT_IDLE_MS).toBe(60_000)
  })
})
