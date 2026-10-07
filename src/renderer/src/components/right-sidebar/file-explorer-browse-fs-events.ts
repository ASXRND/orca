/**
 * Cross-pane refresh of browse mode: a mutation in one pane re-reads every
 * open pane whose listing it could have touched. Own-pane refresh already
 * happens in runMutation, so listeners skip their own origin.
 */
export type BrowseFsMutationHandler = (origin: string, changedDirs: readonly string[]) => void

const handlers = new Set<BrowseFsMutationHandler>()

export function subscribeBrowseFsMutation(handler: BrowseFsMutationHandler): () => void {
  handlers.add(handler)
  return () => {
    handlers.delete(handler)
  }
}

/** Notify every browse pane that the filesystem changed, except `origin`. */
export function emitBrowseFsMutation(origin: string, changedDirs: readonly string[]): void {
  for (const handler of handlers) {
    handler(origin, changedDirs)
  }
}

/** A pane needs a re-read when it shows a changed dir or a dir below one. */
export function browseDirNeedsRefresh(currentDir: string, changedDirs: readonly string[]): boolean {
  return changedDirs.some((dir) => dir === currentDir || dir.startsWith(`${currentDir}/`))
}
