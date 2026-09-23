import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'
import { useCallback, useState } from 'react'
import type { BrowseEntry, BrowseRow } from './file-explorer-browse-mode'
import {
  browseDeletePlan,
  browseDuplicatePlan,
  browsePastePlan,
  type BrowseMutationPlan
} from './file-explorer-browse-operations'
import { handleBrowseListKeyDown } from './file-explorer-browse-keyboard'
import { getCopiedEntry, setCopiedEntry } from './file-explorer-browse-clipboard'
import {
  useFileExplorerBrowseMutations,
  type BrowseInlineInput
} from './use-file-explorer-browse-mutations'
import type { UseFileExplorerBrowseNavigationResult } from './use-file-explorer-browse-navigation'
import type { BrowseMenuAction } from './FileExplorerBrowseContextMenu'

export type BrowseMenuPoint = { x: number; y: number; target: BrowseRow | null }

export type UseFileExplorerBrowseActionsResult = {
  busy: boolean
  menu: BrowseMenuPoint | null
  setMenu: (point: BrowseMenuPoint | null) => void
  inlineInput: BrowseInlineInput | null
  inlineValue: string
  setInlineValue: (value: string) => void
  inlineError: string | null
  inlineInputRef: RefObject<HTMLInputElement | null>
  hasClipboard: boolean
  openTarget: (path: string, entry: BrowseEntry) => void
  revealEntry: (targetPath: string) => void
  startInlineInput: (kind: 'newFile' | 'newFolder', dirPath: string) => void
  submitInline: () => void
  cancelInline: () => void
  handleMenuAction: (action: BrowseMenuAction) => void
  handleListKeyDown: (event: ReactKeyboardEvent<HTMLDivElement>) => void
}

/**
 * File operations of browse mode, modeled on termix local-explorer: clipboard,
 * inline rename/create, duplicate, delete-to-trash, reveal, open. Mutations and
 * the inline name input live in useFileExplorerBrowseMutations.
 */
export function useFileExplorerBrowseActions(
  nav: UseFileExplorerBrowseNavigationResult
): UseFileExplorerBrowseActionsResult {
  const { currentDir, rows, readDir, setPathInput, selectedPath, readNamesInDir } = nav
  const [menu, setMenu] = useState<BrowseMenuPoint | null>(null)
  const mutations = useFileExplorerBrowseMutations(nav)
  const {
    busy,
    inlineInput,
    inlineValue,
    setInlineValue,
    inlineError,
    inlineInputRef,
    startInlineInput,
    startRenameInput,
    submitInline,
    cancelInline,
    runMutation
  } = mutations

  /** Open an entry: folders navigate the browse list, files go to the OS. */
  const openTarget = useCallback(
    (path: string, entry: BrowseEntry) => {
      if (entry.isDirectory) {
        setPathInput(path)
        void readDir(path)
        return
      }
      void window.api.shell.openPath(path)
    },
    [readDir, setPathInput]
  )

  const revealEntry = useCallback((targetPath: string) => {
    void window.api.shell.openInFileManager(targetPath)
  }, [])

  const handleMenuAction = useCallback(
    (action: BrowseMenuAction) => {
      const row = menu?.target ?? null
      const entry = row?.entry ?? null
      const targetPath = row?.path ?? null
      // Termix: a highlighted folder is the action target, otherwise its parent.
      const actionDir = row ? (row.entry.isDirectory ? row.path : row.parentDir) : currentDir
      const runPlan = (plan: BrowseMutationPlan): void => {
        void runMutation(plan.run, plan.authorizeDir)
      }
      switch (action) {
        case 'open': {
          if (row && entry) {
            openTarget(row.path, entry)
          }
          break
        }
        case 'reveal': {
          if (targetPath) {
            revealEntry(targetPath)
          }
          break
        }
        case 'copy': {
          if (row && entry) {
            setCopiedEntry({
              absPath: row.path,
              name: entry.name,
              isDirectory: entry.isDirectory
            })
          }
          break
        }
        case 'paste': {
          const copied = getCopiedEntry()
          if (copied) {
            void readNamesInDir(actionDir).then((names) => {
              runPlan(browsePastePlan(copied, actionDir, null, names))
            })
          }
          break
        }
        case 'duplicate': {
          if (row && entry) {
            void readNamesInDir(row.parentDir).then((names) => {
              runPlan(browseDuplicatePlan(entry, row.parentDir, names))
            })
          }
          break
        }
        case 'copyPath': {
          void navigator.clipboard.writeText(targetPath ?? currentDir)
          break
        }
        case 'rename': {
          if (row && entry) {
            startRenameInput(row.parentDir, entry.name)
          }
          break
        }
        case 'delete': {
          if (row && entry) {
            runPlan(browseDeletePlan(entry, row.parentDir))
          }
          break
        }
        case 'newFile':
        case 'newFolder': {
          // A highlighted folder is the target (termix behaviour).
          startInlineInput(action, row && row.entry.isDirectory ? row.path : currentDir)
          break
        }
        case 'refresh': {
          void readDir(currentDir)
          break
        }
      }
    },
    [
      menu,
      currentDir,
      openTarget,
      readDir,
      readNamesInDir,
      revealEntry,
      runMutation,
      startInlineInput,
      startRenameInput
    ]
  )

  const selectedRow = selectedPath ? (rows.find((row) => row.path === selectedPath) ?? null) : null

  /** F2 / ⌫ / ⏎ / ⌘C / ⌘V on the highlighted row (see file-explorer-browse-keyboard). */
  const handleListKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      handleBrowseListKeyDown(event, {
        inlineActive: inlineInput !== null,
        selectedEntry: selectedRow?.entry ?? null,
        onRename: (entry) => {
          if (selectedRow) {
            startRenameInput(selectedRow.parentDir, entry.name)
          }
        },
        onDelete: (entry) => {
          if (selectedRow) {
            const plan = browseDeletePlan(entry, selectedRow.parentDir)
            void runMutation(plan.run, plan.authorizeDir)
          }
        },
        onOpen: (entry) => {
          if (selectedRow) {
            openTarget(selectedRow.path, entry)
          }
        },
        onCopy: (entry) => {
          if (selectedRow) {
            setCopiedEntry({
              absPath: selectedRow.path,
              name: entry.name,
              isDirectory: entry.isDirectory
            })
          }
        },
        onPaste: () => handleMenuAction('paste')
      })
    },
    [handleMenuAction, inlineInput, openTarget, runMutation, selectedRow, startRenameInput]
  )

  return {
    busy,
    menu,
    setMenu,
    inlineInput,
    inlineValue,
    setInlineValue,
    inlineError,
    inlineInputRef,
    hasClipboard: getCopiedEntry() !== null,
    openTarget,
    revealEntry,
    startInlineInput,
    submitInline,
    cancelInline,
    handleMenuAction,
    handleListKeyDown
  }
}
