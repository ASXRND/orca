import { detectLanguage } from '@/lib/language-detect'
import { toWorktreeRelativePath } from '@/lib/terminal-links'
import { translate } from '@/i18n/i18n'

export type BrowseFileOpenDeps = {
  authorizeExternalPath: (args: { targetPath: string }) => Promise<void>
  openFile: (
    params: {
      filePath: string
      relativePath: string
      worktreeId: string
      language: string
      mode: 'edit'
      runtimeEnvironmentId?: string | null
    },
    options?: {
      preview?: boolean
      suppressActiveRuntimeFallback?: boolean
      focusEditor?: boolean
    }
  ) => void
  onError: (message: string) => void
}

/**
 * Opens a browsed file as an editor tab (termix local-file tab parity). Browse
 * targets can live outside the worktree, so the user's click is the trust
 * gesture: the external read is authorized before the tab exists, matching the
 * AI-vault log open contract.
 */
export async function openBrowseFileInEditor(args: {
  filePath: string
  worktreeId: string
  /** Active worktree root; a file under it keeps a relative path for display. */
  worktreePath: string | null
  /** SSH target the list was browsed through; absent means local browsing. */
  connectionId?: string
  deps: BrowseFileOpenDeps
}): Promise<void> {
  const { filePath, worktreeId, worktreePath, connectionId, deps } = args
  // Why: allowed-roots govern local reads only — on an SSH target the connection
  // is already the boundary, so there is nothing to authorize before the tab.
  if (!connectionId) {
    try {
      await deps.authorizeExternalPath({ targetPath: filePath })
    } catch {
      deps.onError(
        translate(
          'auto.components.right.sidebar.fileExplorerBrowseOpen.notAuthorized',
          "Couldn't open file — path not authorized."
        )
      )
      return
    }
  }
  deps.openFile(
    {
      filePath,
      // Why: outside the worktree there is no relative path, so the external-file
      // contract reads the exact authorized absolute path.
      relativePath: (worktreePath && toWorktreeRelativePath(filePath, worktreePath)) || filePath,
      worktreeId,
      // Why: browse walks the client-local disk — pin local ownership so an active
      // runtime cannot reinterpret the path as remote.
      runtimeEnvironmentId: null,
      language: detectLanguage(filePath),
      mode: 'edit'
    },
    {
      // Why: each browsed file keeps its own tab — a preview tab would be reused
      // by the next click and drop the file the user was reading.
      preview: false,
      // Why: picking a file in browse mode is an explicit focus handoff, the same
      // contract as activating a row in the project tree.
      focusEditor: true,
      suppressActiveRuntimeFallback: true
    }
  )
}
