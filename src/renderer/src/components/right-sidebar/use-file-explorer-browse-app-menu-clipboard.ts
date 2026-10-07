import { useEffect, useRef, type RefObject } from 'react'
import { APP_MENU_PASTE_EVENT } from '@/lib/app-menu-paste'
import { APP_MENU_SELECTION_ACTION_EVENT } from '@/lib/app-menu-selection-actions'
import { isEditableTarget } from '@/lib/editable-target'
import { setCopiedEntry } from './file-explorer-browse-clipboard'
import type { BrowseRow } from './file-explorer-browse-mode'

type UseFileExplorerBrowseAppMenuClipboardParams = {
  /** Stable id of this pane: only the last-focused pane may own the menu event. */
  listId: string
  listRef: RefObject<HTMLDivElement | null>
  selectedRow: BrowseRow | null
  onPaste: () => void
}

// Last browse list that held focus: after a file click moves focus to the
// editor the menu chord must still reach the pane with the selection.
let lastFocusedBrowseListId: string | null = null

/**
 * App-menu ⌘C/⌘V in browse mode. On macOS the Copy item registers a Command+C
 * accelerator and Paste registers CmdOrCtrl+V — both intercept the keystroke
 * at the main-process level, so the list's own keydown handler never fires.
 * The renderer route is the app-menu claim events; we take them only when
 * this pane owns the interaction.
 */
export function useFileExplorerBrowseAppMenuClipboard({
  listId,
  listRef,
  selectedRow,
  onPaste
}: UseFileExplorerBrowseAppMenuClipboardParams): void {
  const selectedRowRef = useRef(selectedRow)
  selectedRowRef.current = selectedRow
  const onPasteRef = useRef(onPaste)
  onPasteRef.current = onPaste

  useEffect(() => {
    const ownsInteraction = (): boolean => {
      const active = document.activeElement
      // Inline rename/create owns every key of its input.
      if (isEditableTarget(active)) {
        return false
      }
      const list = listRef.current
      if (list && active && list.contains(active)) {
        return true
      }
      return (active === null || active === document.body) && lastFocusedBrowseListId === listId
    }

    const onSelectionAction = (event: Event): void => {
      if (!('detail' in event) || event.detail !== 'copy') {
        return
      }
      const row = selectedRowRef.current
      if (!row || !ownsInteraction()) {
        return
      }
      event.preventDefault()
      setCopiedEntry({
        absPath: row.path,
        name: row.entry.name,
        isDirectory: row.entry.isDirectory
      })
    }

    const onPasteAction = (event: Event): void => {
      if (!ownsInteraction()) {
        return
      }
      event.preventDefault()
      onPasteRef.current()
    }

    const markFocused = (): void => {
      lastFocusedBrowseListId = listId
    }

    const list = listRef.current
    list?.addEventListener('focusin', markFocused)
    window.addEventListener(APP_MENU_SELECTION_ACTION_EVENT, onSelectionAction)
    window.addEventListener(APP_MENU_PASTE_EVENT, onPasteAction)
    return () => {
      list?.removeEventListener('focusin', markFocused)
      window.removeEventListener(APP_MENU_SELECTION_ACTION_EVENT, onSelectionAction)
      window.removeEventListener(APP_MENU_PASTE_EVENT, onPasteAction)
    }
  }, [listId, listRef])
}
