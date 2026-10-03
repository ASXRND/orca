import type { BrowseEntry } from './file-explorer-browse-mode'
import {
  browseActionDir,
  browseChildPath,
  browseDuplicateName,
  browseUniqueName
} from './file-explorer-browse-mode'
import type { CopiedEntry } from './file-explorer-browse-clipboard'
import { browseMutationArgs, type BrowseTarget } from './file-explorer-browse-target'

/** A filesystem mutation, plus the directory whose authorization it may need. */
export type BrowseMutationPlan = {
  authorizeDir: string
  run: () => Promise<void>
}

/** Paste a clipboard entry into the action directory, never overwriting a name. */
export function browsePastePlan(
  copied: CopiedEntry,
  currentDir: string,
  target: BrowseEntry | null,
  existingNames: Iterable<string>,
  fsTarget: BrowseTarget = {}
): BrowseMutationPlan {
  const authorizeDir = browseActionDir(currentDir, target)
  const destinationPath = browseChildPath(
    authorizeDir,
    browseUniqueName(copied.name, existingNames)
  )
  return {
    authorizeDir,
    run: async () => {
      await window.api.fs.copy({
        sourcePath: copied.absPath,
        destinationPath,
        ...browseMutationArgs(fsTarget)
      })
    }
  }
}

/** Duplicate an entry next to itself ("name copy.ext"). */
export function browseDuplicatePlan(
  entry: BrowseEntry,
  currentDir: string,
  existingNames: Iterable<string>,
  fsTarget: BrowseTarget = {}
): BrowseMutationPlan {
  const sourcePath = browseChildPath(currentDir, entry.name)
  const destinationPath = browseChildPath(
    currentDir,
    browseUniqueName(browseDuplicateName(entry.name), existingNames)
  )
  return {
    authorizeDir: currentDir,
    run: async () => {
      await window.api.fs.copy({
        sourcePath,
        destinationPath,
        ...browseMutationArgs(fsTarget)
      })
    }
  }
}

/** Create a file or folder inside dirPath (main creates missing parents). */
export function browseCreatePlan(
  kind: 'newFile' | 'newFolder',
  dirPath: string,
  name: string,
  fsTarget: BrowseTarget = {}
): BrowseMutationPlan {
  const targetPath = browseChildPath(dirPath, name)
  return {
    authorizeDir: dirPath,
    run: async () => {
      if (kind === 'newFolder') {
        await window.api.fs.createDir({ dirPath: targetPath, ...browseMutationArgs(fsTarget) })
        return
      }
      await window.api.fs.createFile({ filePath: targetPath, ...browseMutationArgs(fsTarget) })
    }
  }
}

export function browseRenamePlan(
  dirPath: string,
  oldName: string,
  newName: string,
  fsTarget: BrowseTarget = {}
): BrowseMutationPlan {
  return {
    authorizeDir: dirPath,
    run: async () => {
      await window.api.fs.rename({
        oldPath: browseChildPath(dirPath, oldName),
        newPath: browseChildPath(dirPath, newName),
        ...browseMutationArgs(fsTarget)
      })
    }
  }
}

/** Delete goes to the OS trash (fs:deletePath is shell.trashItem), like termix. */
export function browseDeletePlan(
  entry: BrowseEntry,
  currentDir: string,
  fsTarget: BrowseTarget = {}
): BrowseMutationPlan {
  const targetPath = browseChildPath(currentDir, entry.name)
  return {
    authorizeDir: currentDir,
    run: async () => {
      await window.api.fs.deletePath({
        targetPath,
        recursive: entry.isDirectory,
        ...browseMutationArgs(fsTarget)
      })
    }
  }
}
