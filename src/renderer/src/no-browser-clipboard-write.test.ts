import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The main window's session allows only media/fullscreen/pointerLock (attach-main-window-services),
 * so a browser clipboard write rejects and `void`-ing it means the copy silently never happened —
 * which is how browse mode's Copy Path stayed broken. `window.api.ui.writeClipboardText` goes
 * through Electron's IPC and is the app's working route (the web client shims the same API).
 */
const RENDERER_ROOT = import.meta.dirname

const BROWSER_WRITE = /navigator\.clipboard\s*(?:\?\s*)?\.\s*writeText\s*\(/g

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue
      }
      collectSourceFiles(full, out)
      continue
    }
    if (!/\.tsx?$/.test(entry.name) || /\.(test|spec)\.tsx?$/.test(entry.name)) {
      continue
    }
    out.push(full)
  }
  return out
}

/** Blank out comment lines so the ban reads only real code, keeping line numbers stable. */
function stripCommentLines(source: string): string {
  return source
    .split('\n')
    .map((line) => {
      const trimmed = line.trimStart()
      return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')
        ? ''
        : line
    })
    .join('\n')
}

function findBrowserClipboardWrites(file: string): string[] {
  const stripped = stripCommentLines(readFileSync(file, 'utf8'))
  const findings: string[] = []
  for (const match of stripped.matchAll(BROWSER_WRITE)) {
    const line = stripped.slice(0, match.index).split('\n').length
    findings.push(`${path.relative(RENDERER_ROOT, file)}:${line}`)
  }
  return findings
}

describe('renderer clipboard writes', () => {
  it('never writes the clipboard through the browser API', () => {
    const findings = collectSourceFiles(RENDERER_ROOT).flatMap(findBrowserClipboardWrites)
    expect(findings).toEqual([])
  })
})
