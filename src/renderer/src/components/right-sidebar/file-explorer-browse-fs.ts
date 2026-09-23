import type { BrowseEntry } from './file-explorer-browse-mode'

/**
 * readDir with the external-subtree authorize retry: a refused read first asks
 * fs:authorizeExternalPath for the directory, then retries once. Shared by the
 * browse listing, folder expansion and path-bar completion, so none of them
 * widens the allowed-roots model on its own.
 */
export async function readBrowseDirEntries(dir: string): Promise<BrowseEntry[]> {
  try {
    return await window.api.fs.readDir({ dirPath: dir })
  } catch {
    await window.api.fs.authorizeExternalPath({ targetPath: dir })
    return await window.api.fs.readDir({ dirPath: dir })
  }
}
