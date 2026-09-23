import type { BrowseEntry } from './file-explorer-browse-mode'
import {
  browseActionDir,
  browseChildPath,
  browseDuplicateName,
  browseUniqueName
} from './file-explorer-browse-mode'
import type { CopiedEntry } from './file-explorer-browse-clipboard'

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
  existingNames: Iterable<string>
): BrowseMutationPlan {
  const authorizeDir = browseActionDir(currentDir, target)
  const destinationPath = browseChildPath(
    authorizeDir,
    browseUniqueName(copied.name, existingNames)
  )
  return {
    authorizeDir,
    run: async () => {
      await window.api.fs.copy({ sourcePath: copied.absPath, destinationPath })
    }
  }
}

/** Duplicate an entry next to itself ("name copy.ext"). */
export function browseDuplicatePlan(
  entry: BrowseEntry,
  currentDir: string,
  existingNames: Iterable<string>
): BrowseMutationPlan {
  const sourcePath = browseChildPath(currentDir, entry.name)
  const destinationPath = browseChildPath(
    currentDir,
    browseUniqueName(browseDuplicateName(entry.name), existingNames)
  )
  return {
    authorizeDir: currentDir,
    run: async () => {
      await window.api.fs.copy({ sourcePath, destinationPath })
    }
  }
}

/** Create a file or folder inside dirPath (main creates missing parents). */
export function browseCreatePlan(
  kind: 'newFile' | 'newFolder',
  dirPath: string,
  name: string
): BrowseMutationPlan {
  const targetPath = browseChildPath(dirPath, name)
  return {
    authorizeDir: dirPath,
    run: async () => {
      if (kind === 'newFolder') {
        await window.api.fs.createDir({ dirPath: targetPath })
        return
      }
      await window.api.fs.createFile({ filePath: targetPath })
    }
  }
}

export function browseRenamePlan(
  dirPath: string,
  oldName: string,
  newName: string
): BrowseMutationPlan {
  return {
    authorizeDir: dirPath,
    run: async () => {
      await window.api.fs.rename({
        oldPath: browseChildPath(dirPath, oldName),
        newPath: browseChildPath(dirPath, newName)
      })
    }
  }
}

/** Delete goes to the OS trash (fs:deletePath is shell.trashItem), like termix. */
export function browseDeletePlan(entry: BrowseEntry, currentDir: string): BrowseMutationPlan {
  const targetPath = browseChildPath(currentDir, entry.name)
  return {
    authorizeDir: currentDir,
    run: async () => {
      await window.api.fs.deletePath({ targetPath, recursive: entry.isDirectory })
    }
  }
}
