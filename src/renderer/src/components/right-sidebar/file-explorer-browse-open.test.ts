import { describe, expect, it, vi } from 'vitest'
import { openBrowseFileInEditor, type BrowseFileOpenDeps } from './file-explorer-browse-open'

function makeDeps(): BrowseFileOpenDeps {
  return {
    openFile: vi.fn()
  }
}

describe('openBrowseFileInEditor', () => {
  it('opens the file in a permanent tab', async () => {
    const deps = makeDeps()
    await openBrowseFileInEditor({
      filePath: '/Users/me/Desktop/notes.md',
      worktreeId: 'wt-1',
      worktreePath: '/Users/me/Desktop',
      deps
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
  })

  it('keeps the absolute path when the file sits outside the worktree', async () => {
    const deps = makeDeps()
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
})
