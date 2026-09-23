import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  browseAncestorsOf,
  browseCollapsedExpanded,
  flattenBrowseRows,
  normalizeBrowseDir,
  sortBrowseEntriesWithFiles,
  type BrowseEntry,
  type BrowseRow
} from './file-explorer-browse-mode'
import { readBrowseDirEntries } from './file-explorer-browse-fs'

/** Inline tree of browse mode: expanded folder paths and their cached listings. */
type BrowseTreeState = {
  expandedPaths: ReadonlySet<string>
  childrenByPath: Readonly<Record<string, BrowseEntry[]>>
}

const EMPTY_TREE: BrowseTreeState = { expandedPaths: new Set(), childrenByPath: {} }

export type UseFileExplorerBrowseNavigationResult = {
  pathInput: string
  setPathInput: Dispatch<SetStateAction<string>>
  currentDir: string
  entries: BrowseEntry[]
  rows: BrowseRow[]
  loading: boolean
  error: string | null
  setError: Dispatch<SetStateAction<string | null>>
  ancestors: string[]
  selectedPath: string | null
  setSelectedPath: Dispatch<SetStateAction<string | null>>
  /** Names taken in dirPath: cached children when expanded, a fresh read otherwise. */
  readNamesInDir: (dirPath: string) => Promise<string[]>
  readDir: (dir: string) => Promise<void>
  /** Folder chevron: lazy-load children on first open, otherwise expand/collapse. */
  toggleExpand: (path: string) => void
  submitPath: () => void
  goUp: () => void
}

/**
 * Path-bar and listing state of browse mode: manual navigation to any absolute
 * directory, the entries of the open directory, and the failure text. Reads
 * that are refused go through the shared fs:authorizeExternalPath retry, so
 * browsing never widens the allowed-roots model on its own. Folder rows expand
 * inline (termix tree): children load lazily and are re-read together with the
 * open directory after every mutation.
 */
export function useFileExplorerBrowseNavigation(
  browsePath: string
): UseFileExplorerBrowseNavigationResult {
  const [pathInput, setPathInput] = useState(browsePath)
  const [currentDir, setCurrentDir] = useState(browsePath)
  const [entries, setEntries] = useState<BrowseEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [treeState, setTreeState] = useState<BrowseTreeState>(EMPTY_TREE)
  // Ref-mirrored so readDir's refresh branch sees the latest expansion while
  // its callback identity stays stable.
  const treeStateRef = useRef(treeState)
  const currentDirRef = useRef(browsePath)

  const updateTree = useCallback((next: BrowseTreeState) => {
    treeStateRef.current = next
    setTreeState(next)
  }, [])

  /** Refresh path: re-read every expanded subtree so nested rows stay true. */
  const reloadExpanded = useCallback(async () => {
    const { expandedPaths, childrenByPath } = treeStateRef.current
    if (expandedPaths.size === 0) {
      return
    }
    const nextExpanded = new Set(expandedPaths)
    const nextChildren = { ...childrenByPath }
    await Promise.all(
      [...expandedPaths].map(async (path) => {
        try {
          nextChildren[path] = sortBrowseEntriesWithFiles(await readBrowseDirEntries(path))
        } catch {
          // The expanded folder is gone — drop it instead of keeping a ghost.
          delete nextChildren[path]
          nextExpanded.delete(path)
        }
      })
    )
    updateTree({ expandedPaths: nextExpanded, childrenByPath: nextChildren })
  }, [updateTree])

  const readDir = useCallback(
    async (dir: string) => {
      setLoading(true)
      setError(null)
      try {
        const listing = await readBrowseDirEntries(dir)
        setEntries(sortBrowseEntriesWithFiles(listing))
        const navigated = currentDirRef.current !== dir
        currentDirRef.current = dir
        setCurrentDir(dir)
        setSelectedPath(null)
        if (navigated) {
          updateTree(EMPTY_TREE)
        } else {
          await reloadExpanded()
        }
      } catch (readError) {
        setEntries([])
        setError(readError instanceof Error ? readError.message : String(readError))
      } finally {
        setLoading(false)
      }
    },
    [reloadExpanded, updateTree]
  )

  useEffect(() => {
    void readDir(browsePath)
  }, [browsePath, readDir])

  const toggleExpand = useCallback(
    (path: string) => {
      const { expandedPaths, childrenByPath } = treeStateRef.current
      if (expandedPaths.has(path)) {
        updateTree({
          expandedPaths: browseCollapsedExpanded(expandedPaths, path),
          childrenByPath
        })
        return
      }
      if (childrenByPath[path]) {
        updateTree({ expandedPaths: new Set(expandedPaths).add(path), childrenByPath })
        return
      }
      void (async () => {
        try {
          const children = sortBrowseEntriesWithFiles(await readBrowseDirEntries(path))
          const current = treeStateRef.current
          updateTree({
            expandedPaths: new Set(current.expandedPaths).add(path),
            childrenByPath: { ...current.childrenByPath, [path]: children }
          })
        } catch (readError) {
          setError(readError instanceof Error ? readError.message : String(readError))
        }
      })()
    },
    [updateTree]
  )

  const rows = useMemo(
    () => flattenBrowseRows(entries, treeState.childrenByPath, treeState.expandedPaths, currentDir),
    [entries, treeState, currentDir]
  )

  const readNamesInDir = useCallback(
    async (dirPath: string): Promise<string[]> => {
      if (dirPath === currentDir) {
        return entries.map((entry) => entry.name)
      }
      const cached = treeState.childrenByPath[dirPath]
      if (cached) {
        return cached.map((entry) => entry.name)
      }
      try {
        return sortBrowseEntriesWithFiles(await readBrowseDirEntries(dirPath)).map(
          (entry) => entry.name
        )
      } catch {
        // Unreadable here — the mutation's own authorize retry reports it.
        return []
      }
    },
    [currentDir, entries, treeState.childrenByPath]
  )

  const submitPath = useCallback(() => {
    const normalized = normalizeBrowseDir(pathInput)
    if (!normalized) {
      setError('Not an absolute path')
      return
    }
    void readDir(normalized)
  }, [pathInput, readDir])

  const goUp = useCallback(() => {
    const parent = browseAncestorsOf(currentDir)[0]
    if (parent) {
      setPathInput(parent)
      void readDir(parent)
    }
  }, [currentDir, readDir])

  return {
    pathInput,
    setPathInput,
    currentDir,
    entries,
    rows,
    loading,
    error,
    setError,
    ancestors: browseAncestorsOf(currentDir),
    selectedPath,
    setSelectedPath,
    readNamesInDir,
    readDir,
    toggleExpand,
    submitPath,
    goUp
  }
}
