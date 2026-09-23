import type { BrowseEntry } from './file-explorer-browse-mode'

/** Minimal keyboard event shape so this stays testable without React. */
export type BrowseKeyEvent = {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  preventDefault: () => void
}

export type BrowseKeyboardContext = {
  /** Inline name input is open: it owns every key. */
  inlineActive: boolean
  selectedEntry: BrowseEntry | null
  onRename: (entry: BrowseEntry) => void
  onDelete: (entry: BrowseEntry) => void
  onOpen: (entry: BrowseEntry) => void
  onCopy: (entry: BrowseEntry) => void
  onPaste: () => void
}

/**
 * Keyboard shortcuts of the browse list, termix-style: F2 rename, ⌫ delete,
 * ⏎ open, ⌘C copy, ⌘V paste. Returns true when the event was consumed.
 */
export function handleBrowseListKeyDown(
  event: BrowseKeyEvent,
  context: BrowseKeyboardContext
): boolean {
  if (context.inlineActive) {
    return false
  }
  const { selectedEntry } = context
  const modified = event.metaKey || event.ctrlKey
  if (event.key === 'F2' && selectedEntry) {
    event.preventDefault()
    context.onRename(selectedEntry)
    return true
  }
  if ((event.key === 'Delete' || event.key === 'Backspace') && selectedEntry) {
    event.preventDefault()
    context.onDelete(selectedEntry)
    return true
  }
  if (event.key === 'Enter' && selectedEntry) {
    event.preventDefault()
    context.onOpen(selectedEntry)
    return true
  }
  if (modified && event.key.toLowerCase() === 'c' && selectedEntry) {
    event.preventDefault()
    context.onCopy(selectedEntry)
    return true
  }
  if (modified && event.key.toLowerCase() === 'v') {
    event.preventDefault()
    context.onPaste()
    return true
  }
  return false
}
