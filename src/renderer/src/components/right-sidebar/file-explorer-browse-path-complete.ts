import type { BrowseEntry } from './file-explorer-browse-mode'

/** Entries the path bar completion needs from a directory listing. */
export type BrowseCompletionEntry = Pick<BrowseEntry, 'name' | 'isDirectory'>

export type BrowseCompletionSplit = {
  /** Absolute directory the caller must list to find candidates. */
  listDir: string
  /** Incomplete last segment being completed ("" right after a "/"). */
  prefix: string
}

/**
 * Splits a typed path for completion (termix splitCompletionInput): a trailing
 * slash means "list this directory", so "/Users/" lists "/Users" with an empty
 * prefix, while "/Use" lists "/" with the prefix "Use".
 */
export function splitBrowseCompletion(input: string): BrowseCompletionSplit {
  const trimmed = input.trim()
  const trailingSlash = trimmed.endsWith('/')
  const norm = trailingSlash ? trimmed.replace(/\/+$/, '') : trimmed
  const slash = norm.lastIndexOf('/')
  const dirPart = slash === -1 ? '' : norm.slice(0, slash)
  const prefix = trailingSlash ? '' : slash === -1 ? norm : norm.slice(slash + 1)
  const listed = trailingSlash ? norm : dirPart
  // The root is the only directory whose listed form is empty ("/Use" -> "/").
  const listDir = listed === '' ? '/' : listed
  return { listDir, prefix }
}

/** Longest common prefix of the candidate names, compared case-insensitively. */
export function browseLongestCommonPrefix(names: string[]): string {
  if (names.length === 0) {
    return ''
  }
  let common = names[0]
  for (const name of names) {
    while (common.length > 0 && !name.toLowerCase().startsWith(common.toLowerCase())) {
      common = common.slice(0, -1)
    }
    if (common === '') {
      return ''
    }
  }
  return common
}

/** Joins a directory and a name without producing a double slash at the root. */
export function browseJoinAbsolute(dir: string, name: string): string {
  if (dir === '/' || dir === '') {
    return `/${name}`
  }
  return `${dir}/${name}`
}

/**
 * Candidates whose name starts with `prefix` (case-insensitive), directories
 * first, then alphabetical — the order of the suggestion list.
 */
export function browseCompletionMatches(
  prefix: string,
  entries: BrowseCompletionEntry[]
): BrowseCompletionEntry[] {
  const needle = prefix.toLowerCase()
  return entries
    .filter((entry) => entry.name.toLowerCase().startsWith(needle))
    .sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name))
}

/**
 * Completed absolute path inside `dir` for the incomplete `prefix`, or null
 * when nothing matches. The prefix is extended to the common prefix of the
 * matches; a single directory match also gets a trailing slash so the next
 * Tab descends into it.
 */
export function completeBrowsePathIn(
  dir: string,
  prefix: string,
  entries: BrowseCompletionEntry[]
): string | null {
  const matches = browseCompletionMatches(prefix, entries)
  if (matches.length === 0) {
    return null
  }
  const common = browseLongestCommonPrefix(matches.map((match) => match.name))
  if (common === '') {
    return null
  }
  const suffix = matches.length === 1 && matches[0].isDirectory ? '/' : ''
  return `${browseJoinAbsolute(dir, common)}${suffix}`
}

/** Completed value for the typed path, or null when nothing matches. */
export function completeBrowsePathInput(
  input: string,
  entries: BrowseCompletionEntry[]
): string | null {
  const { listDir, prefix } = splitBrowseCompletion(input)
  return completeBrowsePathIn(listDir, prefix, entries)
}
