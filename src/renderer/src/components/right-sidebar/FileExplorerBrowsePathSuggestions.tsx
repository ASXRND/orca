import React from 'react'
import { File, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BrowsePathSuggestion } from './use-file-explorer-browse-path-complete'

type FileExplorerBrowsePathSuggestionsProps = {
  suggestions: BrowsePathSuggestion[]
  activeIndex: number
  onPick: (index: number) => void
}

/** Candidate list under the path bar: Tab left more than one match to pick from. */
export function FileExplorerBrowsePathSuggestions({
  suggestions,
  activeIndex,
  onPick
}: FileExplorerBrowsePathSuggestionsProps): React.JSX.Element {
  return (
    <ul
      role="listbox"
      className="scrollbar-sleek absolute inset-x-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-popover py-0.5 shadow-md"
    >
      {suggestions.map((suggestion, index) => (
        <li key={suggestion.path}>
          <button
            type="button"
            role="option"
            aria-selected={index === activeIndex}
            title={suggestion.path}
            className={cn(
              'flex w-full items-center gap-1.5 px-2 py-1 text-left text-[11px] text-popover-foreground',
              index === activeIndex && 'bg-accent text-accent-foreground'
            )}
            onClick={() => onPick(index)}
          >
            {suggestion.isDirectory ? (
              <Folder className="size-3 shrink-0 text-muted-foreground" />
            ) : (
              <File className="size-3 shrink-0 text-muted-foreground" />
            )}
            <span className="truncate">{suggestion.name}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}
