import type { RefObject } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BrowseEntry } from './file-explorer-browse-mode'
import {
  browseCompletionMatches,
  browseJoinAbsolute,
  completeBrowsePathInput,
  splitBrowseCompletion
} from './file-explorer-browse-path-complete'
import { readBrowseDirEntries } from './file-explorer-browse-fs'
import type { UseFileExplorerBrowseNavigationResult } from './use-file-explorer-browse-navigation'

export type BrowsePathSuggestion = { name: string; isDirectory: boolean; path: string }

/** Cap on rendered candidates: the list is a picker, not a directory dump. */
const MAX_PATH_SUGGESTIONS = 8

export type UseFileExplorerBrowsePathCompleteResult = {
  /** Wraps the path bar: a pointer down outside it dismisses the list. */
  pathWrapRef: RefObject<HTMLDivElement | null>
  suggestions: BrowsePathSuggestion[]
  suggestionIndex: number
  completePath: () => Promise<void>
  moveSuggestion: (delta: number) => void
  pickSuggestion: (index: number) => void
  closeSuggestions: () => void
}

/**
 * Shell-style Tab completion for the browse path bar (termix): extend the last
 * segment to the common prefix of the matches and, when several candidates
 * remain, offer the classic list to pick from with the arrow keys.
 */
export function useFileExplorerBrowsePathComplete(
  nav: Pick<UseFileExplorerBrowseNavigationResult, 'pathInput' | 'setPathInput' | 'readDir'>
): UseFileExplorerBrowsePathCompleteResult {
  const { pathInput, setPathInput, readDir } = nav
  const [suggestions, setSuggestions] = useState<BrowsePathSuggestion[]>([])
  const [suggestionIndex, setSuggestionIndex] = useState(0)
  const pathWrapRef = useRef<HTMLDivElement | null>(null)

  const closeSuggestions = useCallback(() => setSuggestions([]), [])

  // Clicking outside the path bar dismisses the candidate list (termix).
  useEffect(() => {
    if (suggestions.length === 0) {
      return
    }
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target
      if (target instanceof Node && !pathWrapRef.current?.contains(target)) {
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', onPointerDown, true)
    return () => document.removeEventListener('mousedown', onPointerDown, true)
  }, [suggestions.length])

  /** Tab: complete the typed path like a shell prompt; list the leftovers. */
  const completePath = useCallback(async () => {
    const { listDir, prefix } = splitBrowseCompletion(pathInput)
    let entries: BrowseEntry[]
    try {
      entries = await readBrowseDirEntries(listDir)
    } catch {
      // Unreadable directory — completion silently does nothing.
      return
    }
    const matches = browseCompletionMatches(prefix, entries)
    if (matches.length === 0) {
      setSuggestions([])
      return
    }
    const completed = completeBrowsePathInput(pathInput, entries)
    if (completed) {
      setPathInput(completed)
    }
    // One match is already complete; more than one needs a list to choose from.
    setSuggestions(
      matches.length > 1
        ? matches.slice(0, MAX_PATH_SUGGESTIONS).map((match) => ({
            name: match.name,
            isDirectory: match.isDirectory,
            path: browseJoinAbsolute(listDir, match.name)
          }))
        : []
    )
    setSuggestionIndex(0)
  }, [pathInput, setPathInput])

  const moveSuggestion = useCallback(
    (delta: number) => {
      if (suggestions.length === 0) {
        return
      }
      setSuggestionIndex((index) => (index + delta + suggestions.length) % suggestions.length)
    },
    [suggestions.length]
  )

  /** Navigate into a directory pick; hand a file pick to the OS (termix). */
  const pickSuggestion = useCallback(
    (index: number) => {
      const suggestion = suggestions[index]
      if (!suggestion) {
        return
      }
      setSuggestions([])
      setPathInput(suggestion.path)
      if (suggestion.isDirectory) {
        void readDir(suggestion.path)
        return
      }
      void window.api.shell.openPath(suggestion.path)
    },
    [suggestions, setPathInput, readDir]
  )

  return {
    pathWrapRef,
    suggestions,
    suggestionIndex,
    completePath,
    moveSuggestion,
    pickSuggestion,
    closeSuggestions
  }
}
