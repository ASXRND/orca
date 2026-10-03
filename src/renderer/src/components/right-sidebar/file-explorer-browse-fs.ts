import type { BrowseEntry } from './file-explorer-browse-mode'
import { isRemoteBrowseTarget, type BrowseTarget } from './file-explorer-browse-target'

/**
 * readDir with the external-subtree authorize retry: a refused read first asks
 * fs:authorizeExternalPath for the directory, then retries once. Shared by the
 * browse listing, folder expansion and path-bar completion, so none of them
 * widens the allowed-roots model on its own. An SSH target is its own boundary
 * and has no allowed-roots model, so it is read once and reported as-is.
 */
export async function readBrowseDirEntries(
  dir: string,
  target: BrowseTarget = {}
): Promise<BrowseEntry[]> {
  const connectionId = target.connectionId
  try {
    return await window.api.fs.readDir(
      connectionId ? { dirPath: dir, connectionId } : { dirPath: dir }
    )
  } catch (error) {
    if (isRemoteBrowseTarget(target)) {
      throw error
    }
    await window.api.fs.authorizeExternalPath({ targetPath: dir })
    return await window.api.fs.readDir({ dirPath: dir })
  }
}
