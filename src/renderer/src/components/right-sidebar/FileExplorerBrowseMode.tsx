import React from 'react'
import {
  ChevronRight,
  File,
  FilePlus,
  Folder,
  FolderOpen,
  FolderPlus,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { basename } from '@/lib/path'
import { translate } from '@/i18n/i18n'
import { FileExplorerBrowseContextMenu } from './FileExplorerBrowseContextMenu'
import { FileExplorerBrowsePathSuggestions } from './FileExplorerBrowsePathSuggestions'
import { useFileExplorerBrowseNavigation } from './use-file-explorer-browse-navigation'
import { useFileExplorerBrowseActions } from './use-file-explorer-browse'
import { useFileExplorerBrowsePathComplete } from './use-file-explorer-browse-path-complete'

type FileExplorerBrowseModeProps = {
  /** Active browse root — a directory outside the worktree. */
  browsePath: string
  onExit: () => void
}

/**
 * Browse mode view: path bar, entry list and termix-style context menu for
 * arbitrary local directories. All state and file operations live in
 * useFileExplorerBrowse, so this component only renders.
 */
export function FileExplorerBrowseMode({
  browsePath,
  onExit
}: FileExplorerBrowseModeProps): React.JSX.Element {
  const nav = useFileExplorerBrowseNavigation(browsePath)
  const actions = useFileExplorerBrowseActions(nav)
  const {
    pathInput,
    setPathInput,
    currentDir,
    rows,
    loading,
    error,
    ancestors,
    selectedPath,
    setSelectedPath,
    toggleExpand,
    readDir,
    submitPath,
    goUp
  } = nav
  const {
    busy,
    menu,
    setMenu,
    inlineInput,
    inlineValue,
    setInlineValue,
    inlineError,
    inlineInputRef,
    hasClipboard,
    openTarget,
    revealEntry,
    startInlineInput,
    submitInline,
    cancelInline,
    handleMenuAction,
    handleListKeyDown
  } = actions
  const complete = useFileExplorerBrowsePathComplete(nav)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Path bar, termix-style: manual navigation + return to the project tree. */}
      <div
        ref={complete.pathWrapRef}
        className="flex flex-col gap-1 border-b border-border px-2 py-1.5"
      >
        <div className="relative flex items-center gap-1">
          <div className="relative min-w-0 flex-1">
            <input
              type="text"
              className="h-6 w-full min-w-0 rounded-sm border border-border bg-background px-1.5 font-mono text-[11px] text-foreground outline-none focus:border-ring"
              value={pathInput}
              onChange={(event) => {
                setPathInput(event.target.value)
                // Why: the candidate list describes the previous value.
                complete.closeSuggestions()
              }}
              onKeyDown={(event) => {
                // Tab completes the typed path like a shell prompt (termix).
                if (event.key === 'Tab') {
                  event.preventDefault()
                  void complete.completePath()
                  return
                }
                if (complete.suggestions.length > 0) {
                  // Arrows walk the list, Enter takes the pick, Escape closes
                  // it (Enter would otherwise navigate).
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    complete.moveSuggestion(1)
                    return
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    complete.moveSuggestion(-1)
                    return
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    complete.pickSuggestion(complete.suggestionIndex)
                    return
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    complete.closeSuggestions()
                    return
                  }
                }
                if (event.key === 'Enter') {
                  submitPath()
                }
              }}
              spellCheck={false}
              aria-label={translate(
                'auto.components.right.sidebar.FileExplorerBrowseMode.pathBar',
                'Browse path'
              )}
            />
            {complete.suggestions.length > 0 ? (
              <FileExplorerBrowsePathSuggestions
                suggestions={complete.suggestions}
                activeIndex={complete.suggestionIndex}
                onPick={complete.pickSuggestion}
              />
            ) : null}
          </div>
          <TooltipButton
            label={translate(
              'auto.components.right.sidebar.FileExplorerBrowseMode.newFile',
              'New File'
            )}
            onClick={() => startInlineInput('newFile', currentDir)}
          >
            <FilePlus className="size-3" />
          </TooltipButton>
          <TooltipButton
            label={translate(
              'auto.components.right.sidebar.FileExplorerBrowseMode.newFolder',
              'New Folder'
            )}
            onClick={() => startInlineInput('newFolder', currentDir)}
          >
            <FolderPlus className="size-3" />
          </TooltipButton>
          <TooltipButton
            label={translate(
              'auto.components.right.sidebar.FileExplorerBrowseMode.refresh',
              'Refresh'
            )}
            onClick={() => void readDir(currentDir)}
          >
            {busy || loading ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <RefreshCw className="size-3" />
            )}
          </TooltipButton>
          <TooltipButton
            label={translate(
              'auto.components.right.sidebar.FileExplorerBrowseMode.reveal',
              'Reveal in Finder'
            )}
            onClick={() => revealEntry(currentDir)}
          >
            <FolderOpen className="size-3" />
          </TooltipButton>
          <TooltipButton
            label={translate(
              'auto.components.right.sidebar.FileExplorerBrowseMode.goUp',
              'Up one level'
            )}
            onClick={goUp}
          >
            <ChevronRight className="size-3 rotate-90" />
          </TooltipButton>
          <TooltipButton
            label={translate(
              'auto.components.right.sidebar.FileExplorerBrowseMode.backToProject',
              'Back to project'
            )}
            onClick={onExit}
          >
            <span className="text-[11px]">⌂</span>
          </TooltipButton>
        </div>
        {error ? (
          <div className="flex flex-col gap-0.5 text-[11px] text-destructive">
            <span className="truncate" title={error}>
              {error}
            </span>
            {/* Fallback navigation: nearest readable ancestor, like termix ancestorsOf. */}
            {ancestors.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1 text-muted-foreground">
                <span>
                  {translate('auto.components.right.sidebar.FileExplorerBrowseMode.try', 'Try:')}
                </span>
                {ancestors.slice(0, 4).map((ancestor) => (
                  <button
                    key={ancestor}
                    type="button"
                    className="truncate rounded bg-muted px-1 font-mono hover:text-foreground"
                    onClick={() => {
                      setPathInput(ancestor)
                      void readDir(ancestor)
                    }}
                  >
                    {ancestor === '/' ? '/' : basename(ancestor) || ancestor}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <div
        tabIndex={0}
        className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto py-1 outline-none"
        onKeyDown={handleListKeyDown}
        onContextMenu={(event) => {
          // Empty area: the menu targets the open directory (new file/folder, paste, refresh).
          event.preventDefault()
          setSelectedPath(null)
          setMenu({ x: event.clientX, y: event.clientY, target: null })
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
          </div>
        ) : (
          <ul>
            {rows.map((row) => (
              <li key={row.path}>
                <button
                  type="button"
                  aria-expanded={row.entry.isDirectory ? row.isExpanded : undefined}
                  className={cn(
                    'flex w-full items-center gap-1.5 py-1 pr-2 text-left text-xs text-foreground',
                    'hover:bg-accent hover:text-accent-foreground',
                    selectedPath === row.path && 'bg-accent text-accent-foreground'
                  )}
                  style={{ paddingLeft: `${row.depth * 16 + 8}px` }}
                  onClick={() => setSelectedPath(row.path)}
                  onDoubleClick={() => openTarget(row.path, row.entry)}
                  onContextMenu={(event) => {
                    event.preventDefault()
                    // Why: without this, the container handler would overwrite
                    // the entry menu with an empty-area one.
                    event.stopPropagation()
                    setSelectedPath(row.path)
                    setMenu({ x: event.clientX, y: event.clientY, target: row })
                  }}
                >
                  {row.entry.isDirectory ? (
                    <span
                      aria-hidden
                      className="flex size-3.5 shrink-0 cursor-pointer items-center justify-center"
                      onClick={(event) => {
                        // Why: chevron lives inside the row button — keep the
                        // click to the expansion toggle only.
                        event.stopPropagation()
                        toggleExpand(row.path)
                      }}
                    >
                      <ChevronRight
                        className={cn(
                          'size-3 text-muted-foreground transition-transform',
                          row.isExpanded && 'rotate-90'
                        )}
                      />
                    </span>
                  ) : (
                    <span className="size-3.5 shrink-0" />
                  )}
                  {row.entry.isDirectory ? (
                    row.isExpanded ? (
                      <FolderOpen className="size-3 shrink-0 text-muted-foreground" />
                    ) : (
                      <Folder className="size-3 shrink-0 text-muted-foreground" />
                    )
                  ) : (
                    <File className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{row.entry.name}</span>
                  {row.entry.isSymlink ? (
                    <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                      {translate(
                        'auto.components.right.sidebar.FileExplorerBrowseMode.symlink',
                        'link'
                      )}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
            {inlineInput ? (
              <li className="flex flex-col gap-0.5 px-2 py-0.5">
                <div className="flex items-center gap-1">
                  {inlineInput.kind === 'newFolder' ? (
                    <FolderPlus className="size-3 shrink-0 text-muted-foreground" />
                  ) : (
                    <FilePlus className="size-3 shrink-0 text-muted-foreground" />
                  )}
                  <input
                    type="text"
                    className="h-6 min-w-0 flex-1 rounded-sm border border-border bg-background px-1.5 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-ring"
                    ref={inlineInputRef}
                    value={inlineValue}
                    onChange={(event) => setInlineValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        submitInline()
                      } else if (event.key === 'Escape') {
                        event.preventDefault()
                        cancelInline()
                      }
                    }}
                    onBlur={submitInline}
                    placeholder={
                      inlineInput.kind === 'newFolder'
                        ? translate(
                            'auto.components.right.sidebar.FileExplorerBrowseMode.folderName',
                            'Folder name'
                          )
                        : translate(
                            'auto.components.right.sidebar.FileExplorerBrowseMode.fileName',
                            'File name'
                          )
                    }
                    spellCheck={false}
                  />
                </div>
                {inlineError ? (
                  <span className="text-[10px] text-destructive">{inlineError}</span>
                ) : null}
              </li>
            ) : null}
            {rows.length === 0 && !error && !inlineInput ? (
              <li className="px-2 py-2 text-[11px] text-muted-foreground">
                {translate(
                  'auto.components.right.sidebar.FileExplorerBrowseMode.emptyFolder',
                  'Empty folder'
                )}
              </li>
            ) : null}
          </ul>
        )}
      </div>
      {menu ? (
        <FileExplorerBrowseContextMenu
          x={menu.x}
          y={menu.y}
          target={menu.target?.entry ?? null}
          hasClipboard={hasClipboard}
          onAction={handleMenuAction}
          onClose={() => setMenu(null)}
        />
      ) : null}
    </div>
  )
}

/** Ghost icon button with a tooltip — the toolbar icons of the path bar. */
function TooltipButton({
  label,
  onClick,
  children
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="text-muted-foreground hover:text-foreground"
          aria-label={label}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" sideOffset={4}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
