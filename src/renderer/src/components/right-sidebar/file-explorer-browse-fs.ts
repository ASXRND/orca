import type { BrowseEntry } from './file-explorer-browse-mode'
import type { BrowseTarget } from './file-explorer-browse-target'

/**
 * readDir through the standard allowed-roots check, used by the
 * browse listing, folder expansion and path-bar completion: browsing never
 * widens the allowed-roots model on its own. An SSH target is its own boundary
 * and has no allowed-roots model, so it is read once and reported as-is.
 */
export async function readBrowseDirEntries(
  dir: string,
  target: BrowseTarget = {}
): Promise<BrowseEntry[]> {
  const connectionId = target.connectionId
  return await window.api.fs.readDir(
    connectionId ? { dirPath: dir, connectionId } : { dirPath: dir }
  )
}
