import { describe, expect, it, vi } from 'vitest'
import {
  handleBrowseListKeyDown,
  type BrowseKeyboardContext,
  type BrowseKeyEvent
} from './file-explorer-browse-keyboard'

function event(partial: Partial<BrowseKeyEvent> & { key: string }): BrowseKeyEvent {
  return { metaKey: false, ctrlKey: false, preventDefault: vi.fn(), ...partial }
}

function context(overrides: Partial<BrowseKeyboardContext> = {}): BrowseKeyboardContext {
  const entry = { name: 'a.txt', isDirectory: false, isSymlink: false }
  return {
    inlineActive: false,
    selectedEntry: entry,
    onRename: vi.fn(),
    onDelete: vi.fn(),
    onOpen: vi.fn(),
    onCopy: vi.fn(),
    onPaste: vi.fn(),
    ...overrides
  }
}

describe('handleBrowseListKeyDown', () => {
  it('lets the inline input own every key', () => {
    const ctx = context({ inlineActive: true })
    expect(handleBrowseListKeyDown(event({ key: 'F2' }), ctx)).toBe(false)
    expect(ctx.onRename).not.toHaveBeenCalled()
  })

  it('F2 renames, Enter opens, Delete deletes the selection', () => {
    const renameCtx = context()
    handleBrowseListKeyDown(event({ key: 'F2' }), renameCtx)
    expect(renameCtx.onRename).toHaveBeenCalledWith(renameCtx.selectedEntry)

    const openCtx = context()
    handleBrowseListKeyDown(event({ key: 'Enter' }), openCtx)
    expect(openCtx.onOpen).toHaveBeenCalledWith(openCtx.selectedEntry)

    const deleteCtx = context()
    handleBrowseListKeyDown(event({ key: 'Delete' }), deleteCtx)
    expect(deleteCtx.onDelete).toHaveBeenCalledWith(deleteCtx.selectedEntry)
  })

  it('⌘C copies and ⌘V pastes', () => {
    const copyCtx = context()
    handleBrowseListKeyDown(event({ key: 'c', metaKey: true }), copyCtx)
    expect(copyCtx.onCopy).toHaveBeenCalledWith(copyCtx.selectedEntry)

    const pasteCtx = context({ selectedEntry: null })
    expect(handleBrowseListKeyDown(event({ key: 'v', metaKey: true }), pasteCtx)).toBe(true)
    expect(pasteCtx.onPaste).toHaveBeenCalledTimes(1)
  })

  it('ignores navigation keys without a selection', () => {
    const ctx = context({ selectedEntry: null })
    expect(handleBrowseListKeyDown(event({ key: 'F2' }), ctx)).toBe(false)
    expect(handleBrowseListKeyDown(event({ key: 'Enter' }), ctx)).toBe(false)
    expect(handleBrowseListKeyDown(event({ key: 'a' }), ctx)).toBe(false)
  })
})
