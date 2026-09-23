import { dirname, joinPath } from '@/lib/path'

/**
 * Normalize a user-typed path for the browse-mode root. Mirrors termix normalizeDir:
 * trim, decode URI escapes, drop the trailing slash (but keep "/" root).
 */
export function normalizeBrowseDir(input: string): string | null {
  const raw = input.trim()
  if (!raw) {
    return null
  }
  let candidate = raw
  try {
    candidate = decodeURIComponent(raw)
  } catch {
    // Why: keep the literal string when it is not valid percent-encoding.
  }
  if (!candidate.startsWith('/')) {
    return null
  }
  while (candidate.length > 1 && candidate.endsWith('/')) {
    candidate = candidate.slice(0, -1)
  }
  return candidate
}

/** Ancestors of dir, nearest first (parent, grandparent, ... "/"). */
export function browseAncestorsOf(dir: string): string[] {
  const result: string[] = []
  let current = dirname(dir) || '/'
  while (!result.includes(current)) {
    result.push(current)
    if (current === '/') {
      break
    }
    current = dirname(current) || '/'
  }
  return result
}

export type BrowseEntry = { name: string; isDirectory: boolean; isSymlink: boolean }

/** Files and dirs, dirs first, alphabetical (full browse mode shows files too). */
export function sortBrowseEntriesWithFiles(entries: BrowseEntry[]): BrowseEntry[] {
  return [...entries].sort((a, b) =>
    a.isDirectory === b.isDirectory ? a.name.localeCompare(b.name) : a.isDirectory ? -1 : 1
  )
}

export function browseChildPath(dir: string, name: string): string {
  return joinPath(dir, name)
}

export function browseParentOf(dir: string): string {
  return dirname(dir) || '/'
}

/** Termix-style duplicate name: "name.ext" -> "name copy.ext", "name" -> "name copy". */
export function browseDuplicateName(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot > 0) {
    return `${name.slice(0, dot)} copy${name.slice(dot)}`
  }
  return `${name} copy`
}

/** "name.ext" -> ".ext", "name" -> "" — used by the rename inline input selection. */
export function browseNameStem(name: string): { stem: string; ext: string } {
  const dot = name.lastIndexOf('.')
  if (dot > 0) {
    return { stem: name.slice(0, dot), ext: name.slice(dot) }
  }
  return { stem: name, ext: '' }
}

/**
 * Directory an action applies to: a selected folder becomes the target (termix
 * behaviour — New File inside the highlighted folder), otherwise the open dir.
 */
export function browseActionDir(
  currentDir: string,
  target: { name: string; isDirectory: boolean } | null
): string {
  if (target && target.isDirectory) {
    return browseChildPath(currentDir, target.name)
  }
  return currentDir
}

/** "a.txt" -> "a copy.txt" -> "a copy 2.txt": first name not already taken. */
export function browseUniqueName(name: string, existingNames: Iterable<string>): string {
  const taken = new Set(existingNames)
  if (!taken.has(name)) {
    return name
  }
  const { stem, ext } = browseNameStem(name)
  const base = `${stem} copy`
  let candidate = `${base}${ext}`
  let index = 1
  while (taken.has(candidate)) {
    index += 1
    candidate = `${base} ${index}${ext}`
  }
  return candidate
}

/** Null when the typed name is usable, otherwise the inline validation message. */
export function browseEntryNameError(name: string, existingNames: Iterable<string>): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return 'Name cannot be empty'
  }
  if (trimmed.includes('/')) {
    return 'Name cannot contain "/"'
  }
  if (trimmed === '.' || trimmed === '..') {
    return 'Reserved name'
  }
  if (new Set(existingNames).has(trimmed)) {
    return 'Already exists'
  }
  return null
}

export type BrowseRow = {
  entry: BrowseEntry
  /** Absolute path of the entry. */
  path: string
  /** Directory the entry lives in — mutation plans target it. */
  parentDir: string
  /** Indent level in the browse list (0 = the open directory). */
  depth: number
  /** Directory whose children are currently shown inline. */
  isExpanded: boolean
}

/**
 * Depth-first rows of the browse list: the open directory's entries plus the
 * cached children of every expanded folder, indented by depth (termix tree).
 */
export function flattenBrowseRows(
  entries: BrowseEntry[],
  childrenByPath: Readonly<Record<string, BrowseEntry[]>>,
  expandedPaths: ReadonlySet<string>,
  rootDir: string
): BrowseRow[] {
  const rows: BrowseRow[] = []
  const walk = (list: BrowseEntry[], parentDir: string, depth: number): void => {
    for (const entry of list) {
      const path = browseChildPath(parentDir, entry.name)
      const isExpanded = entry.isDirectory && expandedPaths.has(path)
      rows.push({ entry, path, parentDir, depth, isExpanded })
      const children = isExpanded ? childrenByPath[path] : undefined
      if (children) {
        walk(children, path, depth + 1)
      }
    }
  }
  walk(entries, rootDir, 0)
  return rows
}

/** Expanded set without `path` and every descendant of it (termix collapseTree). */
export function browseCollapsedExpanded(expanded: ReadonlySet<string>, path: string): Set<string> {
  return new Set(
    [...expanded].filter((candidate) => candidate !== path && !candidate.startsWith(`${path}/`))
  )
}
