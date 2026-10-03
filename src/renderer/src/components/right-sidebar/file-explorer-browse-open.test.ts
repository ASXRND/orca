import { describe, expect, it, vi } from 'vitest'
import { openBrowseFileInEditor, type BrowseFileOpenDeps } from './file-explorer-browse-open'

function makeDeps(authorize: BrowseFileOpenDeps['authorizeExternalPath']): BrowseFileOpenDeps {
  return {
    authorizeExternalPath: authorize,
    openFile: vi.fn(),
    onError: vi.fn()
  }
}

describe('openBrowseFileInEditor', () => {
  it('authorizes the exact path before opening a preview tab', async () => {
    const deps = makeDeps(vi.fn().mockResolvedValue(undefined))
    await openBrowseFileInEditor({
      filePath: '/Users/me/Desktop/notes.md',
      worktreeId: 'wt-1',
      worktreePath: '/Users/me/Desktop',
      deps
    })
    expect(deps.authorizeExternalPath).toHaveBeenCalledWith({
      targetPath: '/Users/me/Desktop/notes.md'
    })
    expect(deps.openFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: '/Users/me/Desktop/notes.md',
        relativePath: 'notes.md',
        worktreeId: 'wt-1',
        runtimeEnvironmentId: null,
        mode: 'edit'
      }),
      { preview: false, focusEditor: true, suppressActiveRuntimeFallback: true }
    )
    expect(deps.onError).not.toHaveBeenCalled()
  })

  it('keeps the absolute path when the file sits outside the worktree', async () => {
    const deps = makeDeps(vi.fn().mockResolvedValue(undefined))
    await openBrowseFileInEditor({
      filePath: '/etc/hosts',
      worktreeId: 'wt-1',
      worktreePath: '/Users/me/Desktop',
      deps
    })
    expect(deps.openFile).toHaveBeenCalledWith(
      expect.objectContaining({ relativePath: '/etc/hosts' }),
      expect.anything()
    )
  })

  it('reports the refusal instead of opening when authorization fails', async () => {
    const deps = makeDeps(vi.fn().mockRejectedValue(new Error('denied')))
    await openBrowseFileInEditor({
      filePath: '/etc/shadow',
      worktreeId: 'wt-1',
      worktreePath: null,
      deps
    })
    expect(deps.openFile).not.toHaveBeenCalled()
    expect(deps.onError).toHaveBeenCalledTimes(1)
  })
})
