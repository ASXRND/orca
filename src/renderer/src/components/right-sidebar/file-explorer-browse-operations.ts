import type { BrowseEntry } from './file-explorer-browse-mode'
import {
  browseActionDir,
  browseChildPath,
  browseDuplicateName,
  browseUniqueName
} from './file-explorer-browse-mode'
import { basename, dirname } from '@/lib/path'
import type { CopiedEntry } from './file-explorer-browse-clipboard'
import { browseMutationArgs, type BrowseTarget } from './file-explorer-browse-target'

/** A filesystem mutation run. */
export type BrowseMutationPlan = {
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
  const actionDir = browseActionDir(currentDir, target)
  const destinationPath = browseChildPath(actionDir, browseUniqueName(copied.name, existingNames))
  return {
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
    run: async () => {
      await window.api.fs.rename({
        oldPath: browseChildPath(dirPath, oldName),
        newPath: browseChildPath(dirPath, newName),
        ...browseMutationArgs(fsTarget)
      })
    }
  }
}

export type BrowseMovePlan = BrowseMutationPlan & { destinationPath: string }

/** A move must not run: same dir, or dropping a folder into itself. */
export function browseMoveRejection(sourcePath: string, destDir: string): boolean {
  if (dirname(sourcePath) === destDir) {
    return true
  }
  return (
    destDir === sourcePath ||
    destDir.startsWith(`${sourcePath}/`) ||
    destDir.startsWith(`${sourcePath}\\`)
  )
}

/** Move an entry into destDir; never overwrites — the name is uniquified. */
export function browseMovePlan(
  sourcePath: string,
  destDir: string,
  existingNames: Iterable<string>,
  fsTarget: BrowseTarget = {}
): BrowseMovePlan {
  const destinationPath = browseChildPath(
    destDir,
    browseUniqueName(basename(sourcePath), existingNames)
  )
  return {
    destinationPath,
    run: async () => {
      await window.api.fs.rename({
        oldPath: sourcePath,
        newPath: destinationPath,
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
    run: async () => {
      await window.api.fs.deletePath({
        targetPath,
        recursive: entry.isDirectory,
        ...browseMutationArgs(fsTarget)
      })
    }
  }
}
