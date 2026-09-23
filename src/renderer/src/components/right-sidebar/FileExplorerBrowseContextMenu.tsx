import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  ClipboardPaste,
  Copy,
  CopyPlus,
  ExternalLink,
  FilePlus,
  FolderPlus,
  FolderSearch,
  Pencil,
  RefreshCw,
  Trash2
} from 'lucide-react'
import { translate } from '@/i18n/i18n'
import type { BrowseEntry } from './file-explorer-browse-mode'

const VIEWPORT_PADDING = 8

export type BrowseMenuAction =
  | 'open'
  | 'copy'
  | 'paste'
  | 'duplicate'
  | 'copyPath'
  | 'reveal'
  | 'rename'
  | 'delete'
  | 'newFile'
  | 'newFolder'
  | 'refresh'

type MenuEntry = {
  action: BrowseMenuAction
  icon: React.ReactNode
  label: string
  shortcut?: string
}

/**
 * Termix-style context menu: a fixed overlay rendered at the cursor
 * coordinates, clamped to the viewport once its real size is known.
 * Closes on Escape and on any pointer down outside the menu.
 */
export function FileExplorerBrowseContextMenu({
  x,
  y,
  target,
  hasClipboard,
  onAction,
  onClose
}: {
  x: number
  y: number
  target: BrowseEntry | null
  hasClipboard: boolean
  onAction: (action: BrowseMenuAction) => void
  onClose: () => void
}): React.JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: x, top: y })

  // Keep the menu inside the window once its real size is known.
  useLayoutEffect(() => {
    const menu = menuRef.current
    if (!menu) {
      return
    }
    const { width, height } = menu.getBoundingClientRect()
    setPosition({
      left: Math.min(x, window.innerWidth - width - VIEWPORT_PADDING),
      top: Math.min(y, window.innerHeight - height - VIEWPORT_PADDING)
    })
  }, [x, y])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    const onPointerDown = (event: MouseEvent): void => {
      const target = event.target
      if (target instanceof Node && !menuRef.current?.contains(target)) {
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('mousedown', onPointerDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('mousedown', onPointerDown, true)
    }
  }, [onClose])

  const isFileSelected = target !== null && !target.isDirectory
  const isDirSelected = target !== null && target.isDirectory
  const pasteAvailable = hasClipboard || isDirSelected || target === null

  const entries: MenuEntry[] = []
  if (isFileSelected) {
    entries.push(
      {
        action: 'open',
        icon: <ExternalLink className="size-3" />,
        label: translate('auto.components.right.sidebar.FileExplorerBrowseMode.openFile', 'Open'),
        shortcut: '⏎'
      },
      {
        action: 'reveal',
        icon: <FolderSearch className="size-3" />,
        label: translate(
          'auto.components.right.sidebar.FileExplorerBrowseMode.reveal',
          'Reveal in Finder'
        )
      }
    )
  } else if (isDirSelected) {
    entries.push(
      {
        action: 'open',
        icon: <FolderSearch className="size-3" />,
        label: translate('auto.components.right.sidebar.FileExplorerBrowseMode.openFolder', 'Open'),
        shortcut: '⏎'
      },
      {
        action: 'reveal',
        icon: <ExternalLink className="size-3" />,
        label: translate(
          'auto.components.right.sidebar.FileExplorerBrowseMode.reveal',
          'Reveal in Finder'
        )
      },
      {
        action: 'newFile',
        icon: <FilePlus className="size-3" />,
        label: translate('auto.components.right.sidebar.FileExplorerBrowseMode.newFile', 'New File')
      },
      {
        action: 'newFolder',
        icon: <FolderPlus className="size-3" />,
        label: translate(
          'auto.components.right.sidebar.FileExplorerBrowseMode.newFolder',
          'New Folder'
        )
      }
    )
  }
  if (target) {
    entries.push(
      {
        action: 'copy',
        icon: <Copy className="size-3" />,
        label: translate('auto.components.right.sidebar.FileExplorerBrowseMode.copy', 'Copy'),
        shortcut: '⌘C'
      },
      {
        action: 'duplicate',
        icon: <CopyPlus className="size-3" />,
        label: translate(
          'auto.components.right.sidebar.FileExplorerBrowseMode.duplicate',
          'Duplicate'
        )
      },
      {
        action: 'copyPath',
        icon: <Copy className="size-3" />,
        label: translate(
          'auto.components.right.sidebar.FileExplorerBrowseMode.copyPath',
          'Copy Path'
        )
      },
      {
        action: 'rename',
        icon: <Pencil className="size-3" />,
        label: translate('auto.components.right.sidebar.FileExplorerBrowseMode.rename', 'Rename'),
        shortcut: 'F2'
      },
      {
        action: 'delete',
        icon: <Trash2 className="size-3" />,
        label: translate('auto.components.right.sidebar.FileExplorerBrowseMode.delete', 'Delete'),
        shortcut: '⌫'
      }
    )
  }
  if (pasteAvailable) {
    entries.push({
      action: 'paste',
      icon: <ClipboardPaste className="size-3" />,
      label: translate('auto.components.right.sidebar.FileExplorerBrowseMode.paste', 'Paste'),
      shortcut: '⌘V'
    })
  }
  if (!target) {
    entries.push(
      {
        action: 'newFile',
        icon: <FilePlus className="size-3" />,
        label: translate('auto.components.right.sidebar.FileExplorerBrowseMode.newFile', 'New File')
      },
      {
        action: 'newFolder',
        icon: <FolderPlus className="size-3" />,
        label: translate(
          'auto.components.right.sidebar.FileExplorerBrowseMode.newFolder',
          'New Folder'
        )
      },
      {
        action: 'refresh',
        icon: <RefreshCw className="size-3" />,
        label: translate('auto.components.right.sidebar.FileExplorerBrowseMode.refresh', 'Refresh')
      }
    )
  }
  // Group id per action so separators fall between logical sections.
  const groupOf: Record<BrowseMenuAction, number> = {
    open: 0,
    newFile: 1,
    newFolder: 1,
    reveal: 2,
    copy: 2,
    paste: 2,
    duplicate: 2,
    copyPath: 2,
    rename: 3,
    delete: 3,
    refresh: 4
  }
  const items: (MenuEntry | 'sep')[] = []
  entries.forEach((entry, index) => {
    if (index > 0 && groupOf[entries[index - 1].action] !== groupOf[entry.action]) {
      items.push('sep')
    }
    items.push(entry)
  })

  return (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-50 min-w-[190px] rounded-md border border-border bg-popover py-1 text-xs text-popover-foreground shadow-md"
      style={{ left: position.left, top: position.top }}
      onContextMenu={(event) => event.preventDefault()}
    >
      {items.map((item, index) =>
        item === 'sep' ? (
          <div key={`sep-${index}`} className="my-1 border-t border-border" />
        ) : (
          <button
            key={item.action}
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-2 py-1 text-left hover:bg-accent hover:text-accent-foreground"
            onClick={() => {
              onAction(item.action)
              onClose()
            }}
          >
            {item.icon}
            <span className="flex-1 truncate">{item.label}</span>
            {item.shortcut ? (
              <span className="text-[10px] text-muted-foreground">{item.shortcut}</span>
            ) : null}
          </button>
        )
      )}
    </div>
  )
}
