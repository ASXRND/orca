import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { browseEntryNameError, browseNameStem } from './file-explorer-browse-mode'
import { browseCreatePlan, browseRenamePlan } from './file-explorer-browse-operations'
import { isRemoteBrowseTarget, useBrowseTarget } from './file-explorer-browse-target'
import type { UseFileExplorerBrowseNavigationResult } from './use-file-explorer-browse-navigation'

export type BrowseInlineInput =
  | { kind: 'newFile' | 'newFolder'; dirPath: string }
  | { kind: 'rename'; dirPath: string; oldName: string }

export type UseFileExplorerBrowseMutationsResult = {
  busy: boolean
  inlineInput: BrowseInlineInput | null
  inlineValue: string
  setInlineValue: (value: string) => void
  inlineError: string | null
  inlineInputRef: RefObject<HTMLInputElement | null>
  startInlineInput: (kind: 'newFile' | 'newFolder', dirPath: string) => void
  startRenameInput: (dirPath: string, oldName: string) => void
  submitInline: () => void
  cancelInline: () => void
  runMutation: (action: () => Promise<void>) => Promise<void>
}

/**
 * Write path of browse mode: the mutation runner plus the
 * inline rename/create input. Every mutation that fails surfaces the main
 * process verdict; browsing never widens the allowed-roots model on its own.
 */
export function useFileExplorerBrowseMutations(
  nav: Pick<
    UseFileExplorerBrowseNavigationResult,
    'currentDir' | 'readDir' | 'setError' | 'readNamesInDir'
  >
): UseFileExplorerBrowseMutationsResult {
  const { currentDir, readDir, setError, readNamesInDir } = nav
  const target = useBrowseTarget()
  const [busy, setBusy] = useState(false)
  const [inlineInput, setInlineInputState] = useState<BrowseInlineInput | null>(null)
  const [inlineValue, setInlineValueState] = useState('')
  const [inlineError, setInlineError] = useState<string | null>(null)
  const inlineInputRef = useRef<HTMLInputElement>(null)
  // Mirrors the open inline input: submit awaits a listing read, and the row
  // may be cancelled while that read is still in flight.
  const latestInputRef = useRef<BrowseInlineInput | null>(inlineInput)

  useEffect(() => {
    latestInputRef.current = inlineInput
  }, [inlineInput])

  const setInlineValue = useCallback((value: string) => {
    setInlineValueState(value)
    setInlineError(null)
  }, [])

  const openInlineInput = useCallback((next: BrowseInlineInput, value: string) => {
    setInlineInputState(next)
    setInlineValueState(value)
    setInlineError(null)
  }, [])

  useEffect(() => {
    if (!inlineInput) {
      return
    }
    inlineInputRef.current?.focus()
    // Rename: preselect the stem, like termix (extension stays unselected).
    if (inlineInput.kind === 'rename') {
      const { stem } = browseNameStem(inlineInput.oldName)
      inlineInputRef.current?.setSelectionRange(0, stem.length || inlineInput.oldName.length)
    }
  }, [inlineInput])

  const runMutation = useCallback(
    async (action: () => Promise<void>): Promise<void> => {
      setBusy(true)
      try {
        await action()
        await readDir(currentDir)
      } catch (error) {
        if (isRemoteBrowseTarget(target)) {
          // Why: allowed-roots are a local concept; an SSH target is its own
          // boundary, so its refusal (stale connection, permissions) is final.
          setError(error instanceof Error ? error.message : String(error))
          return
        }
        // Why: mutation targets may live outside allowed roots — authorize the
        // directory the action lands in, then retry once before surfacing it.
        try {
          await action()
          await readDir(currentDir)
        } catch (retryError) {
          setError(retryError instanceof Error ? retryError.message : String(retryError))
        }
      } finally {
        setBusy(false)
      }
    },
    [currentDir, readDir, setError, target]
  )

  const startInlineInput = useCallback(
    (kind: 'newFile' | 'newFolder', dirPath: string) => {
      openInlineInput({ kind, dirPath }, '')
    },
    [openInlineInput]
  )

  const startRenameInput = useCallback(
    (dirPath: string, oldName: string) => {
      openInlineInput({ kind: 'rename', dirPath, oldName }, oldName)
    },
    [openInlineInput]
  )

  const submitInline = useCallback(() => {
    const pending = inlineInput
    if (!pending) {
      return
    }
    const name = inlineValue.trim()
    void (async () => {
      const existing = await readNamesInDir(pending.dirPath)
      if (latestInputRef.current !== pending) {
        // The input was cancelled while the listing read was in flight.
        return
      }
      // Why: renaming an entry to its own name is a no-op, not a collision.
      const taken =
        pending.kind === 'rename'
          ? existing.filter((entryName) => entryName !== pending.oldName)
          : existing
      const validationError = browseEntryNameError(name, taken)
      if (validationError) {
        setInlineError(validationError)
        return
      }
      setInlineInputState(null)
      setInlineValueState('')
      setInlineError(null)
      const plan =
        pending.kind === 'rename'
          ? browseRenamePlan(pending.dirPath, pending.oldName, name, target)
          : browseCreatePlan(pending.kind, pending.dirPath, name, target)
      void runMutation(plan.run)
    })()
  }, [inlineValue, inlineInput, readNamesInDir, runMutation, target])

  const cancelInline = useCallback(() => {
    setInlineInputState(null)
    setInlineValueState('')
    setInlineError(null)
  }, [])

  return {
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
  }
}
