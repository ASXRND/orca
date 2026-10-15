import type { DragEvent as ReactDragEvent } from 'react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { basename, dirname } from '@/lib/path'
import {
  getWorkspaceFileDragRejectionMessage,
  readWorkspaceFileDragPaths,
  WORKSPACE_FILE_PATH_MIME
} from '@/lib/workspace-file-drag'
import type { BrowseRow } from './file-explorer-browse-mode'
import { browseMovePlan, browseMoveRejection } from './file-explorer-browse-operations'
import type { BrowseTarget } from './file-explorer-browse-target'

type UseFileExplorerBrowseDndParams = {
  instanceId: string
  currentDir: string
  inlineActive: boolean
  target: BrowseTarget
  readNamesInDir: (dirPath: string) => Promise<string[]>
  runMutation: (action: () => Promise<void>, authorizeDir?: string) => Promise<void>
  notifyMutation?: (changedDirs: string[], instanceId: string) => void
}

export type BrowseRowDragProps = {
  draggable: boolean
  onDragStart: (event: ReactDragEvent) => void
  onDragEnd: () => void
  onDragOver: (event: ReactDragEvent) => void
  onDrop: (event: ReactDragEvent) => void
}

export type BrowseListDragProps = {
  onDragOver: (event: ReactDragEvent) => void
  onDragLeave: (event: ReactDragEvent) => void
  onDrop: (event: ReactDragEvent) => void
}

/**
 * HTML5 move of browse rows: inside one pane and across split panes — both
 * are FileExplorerBrowseMode in the same document, so a plain MIME drag
 * crosses them. Each pane refreshes through the fs-mutation event.
 */
export function useFileExplorerBrowseDnd({
  instanceId,
  currentDir,
  inlineActive,
  target,
  readNamesInDir,
  runMutation,
  notifyMutation
}: UseFileExplorerBrowseDndParams) {
  const [dropTargetDir, setDropTargetDir] = useState<string | null>(null)

  // Safety net: a drag cancelled mid-flight never fires drop.
  useEffect(() => {
    const clear = () => setDropTargetDir(null)
    window.addEventListener('dragend', clear)
    return () => window.removeEventListener('dragend', clear)
  }, [])

  const moveInto = useCallback(
    (sourcePaths: string[], destDir: string) => {
      const accepted = sourcePaths.filter((path) => !browseMoveRejection(path, destDir))
      if (accepted.length === 0) {
        return
      }
      const notify = notifyMutation
      void (async () => {
        const names = new Set(await readNamesInDir(destDir))
        for (const sourcePath of accepted) {
          const plan = browseMovePlan(sourcePath, destDir, names, target)
          await runMutation(plan.run, plan.authorizeDir)
          names.add(basename(plan.destinationPath))
        }
        notify?.([destDir, ...accepted.map((path) => dirname(path))], instanceId)
      })()
    },
    [instanceId, notifyMutation, readNamesInDir, runMutation, target]
  )

  const readDraggedPaths = (event: ReactDragEvent): string[] => {
    const read = readWorkspaceFileDragPaths(event.dataTransfer)
    if (read.status === 'rejected') {
      toast.error(getWorkspaceFileDragRejectionMessage(read.reason))
      return []
    }
    return read.paths
  }

  const rowDragProps = useCallback(
    (row: BrowseRow): BrowseRowDragProps => {
      const destDir = row.entry.isDirectory ? row.path : row.parentDir
      return {
        draggable: !inlineActive,
        onDragStart: (event) => {
          event.dataTransfer.setData(WORKSPACE_FILE_PATH_MIME, row.path)
          event.dataTransfer.effectAllowed = 'move'
        },
        onDragEnd: () => setDropTargetDir(null),
        onDragOver: (event) => {
          if (!event.dataTransfer.types.includes(WORKSPACE_FILE_PATH_MIME)) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          event.dataTransfer.dropEffect = 'move'
          setDropTargetDir(destDir)
        },
        onDrop: (event) => {
          if (!event.dataTransfer.types.includes(WORKSPACE_FILE_PATH_MIME)) {
            return
          }
          event.preventDefault()
          event.stopPropagation()
          const paths = readDraggedPaths(event)
          setDropTargetDir(null)
          moveInto(paths, destDir)
        }
      }
    },
    [inlineActive, moveInto]
  )

  const listDragProps: BrowseListDragProps = {
    onDragOver: (event) => {
      if (!event.dataTransfer.types.includes(WORKSPACE_FILE_PATH_MIME)) {
        return
      }
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setDropTargetDir(currentDir)
    },
    onDragLeave: (event) => {
      if (event.target !== event.currentTarget) {
        return
      }
      setDropTargetDir(null)
    },
    onDrop: (event) => {
      if (!event.dataTransfer.types.includes(WORKSPACE_FILE_PATH_MIME)) {
        return
      }
      event.preventDefault()
      const paths = readDraggedPaths(event)
      setDropTargetDir(null)
      moveInto(paths, currentDir)
    }
  }

  return { dropTargetDir, listDragProps, rowDragProps }
}
