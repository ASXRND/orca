import React from 'react'

/** Stable per-mount id distinguishing split browse panes via a module counter. */
export function useFileExplorerBrowseInstance(): string {
  return React.useMemo(() => nextBrowseInstanceId(), [])
}

let nextId = 0

function nextBrowseInstanceId(): string {
  nextId += 1
  return `browse-${nextId}`
}
