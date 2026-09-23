// In-app clipboard for browse mode, modeled on termix localClipboard: "Copy"
// remembers an entry module-level so it survives the context menu closing;
// "Paste" duplicates it into the current folder via fs:copy.
export type CopiedEntry = {
  absPath: string
  name: string
  isDirectory: boolean
}

let copied: CopiedEntry | null = null

export function setCopiedEntry(entry: CopiedEntry): void {
  copied = entry
}

export function getCopiedEntry(): CopiedEntry | null {
  return copied
}

export function clearCopiedEntry(): void {
  copied = null
}
