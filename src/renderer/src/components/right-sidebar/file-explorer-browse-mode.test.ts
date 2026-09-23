import { describe, expect, it } from 'vitest'
import {
  browseActionDir,
  browseAncestorsOf,
  browseCollapsedExpanded,
  browseDuplicateName,
  browseEntryNameError,
  browseNameStem,
  browseUniqueName,
  flattenBrowseRows,
  normalizeBrowseDir
} from './file-explorer-browse-mode'

describe('normalizeBrowseDir', () => {
  it('trims, decodes escapes and drops the trailing slash', () => {
    expect(normalizeBrowseDir('  /Users/me/Desktop/  ')).toBe('/Users/me/Desktop')
    expect(normalizeBrowseDir('/Users/me/My%20Folder')).toBe('/Users/me/My Folder')
  })

  it('keeps the filesystem root as a single slash', () => {
    expect(normalizeBrowseDir('/')).toBe('/')
  })

  it('rejects relative and empty input', () => {
    expect(normalizeBrowseDir('Users/me')).toBeNull()
    expect(normalizeBrowseDir('   ')).toBeNull()
  })
})

describe('browseAncestorsOf', () => {
  it('walks up to the root, nearest first', () => {
    expect(browseAncestorsOf('/a/b/c')).toEqual(['/a/b', '/a', '/'])
  })

  it('returns the root for the root itself', () => {
    expect(browseAncestorsOf('/')).toEqual(['/'])
  })
})

describe('browseActionDir', () => {
  it('uses a selected folder as the action target', () => {
    expect(browseActionDir('/a', { name: 'b', isDirectory: true })).toBe('/a/b')
  })

  it('falls back to the open directory for files and empty areas', () => {
    expect(browseActionDir('/a', { name: 'f.txt', isDirectory: false })).toBe('/a')
    expect(browseActionDir('/a', null)).toBe('/a')
  })
})

describe('browseUniqueName', () => {
  it('keeps a free name untouched', () => {
    expect(browseUniqueName('a.txt', ['b.txt'])).toBe('a.txt')
  })

  it('inserts " copy" before the extension', () => {
    expect(browseUniqueName('a.txt', ['a.txt'])).toBe('a copy.txt')
  })

  it('numbers further collisions', () => {
    expect(browseUniqueName('a.txt', ['a.txt', 'a copy.txt', 'a copy 2.txt'])).toBe('a copy 3.txt')
  })

  it('handles names without an extension', () => {
    expect(browseUniqueName('docs', ['docs'])).toBe('docs copy')
  })
})

describe('browseEntryNameError', () => {
  const existing = ['a.txt', 'docs']

  it('accepts a fresh name', () => {
    expect(browseEntryNameError('b.txt', existing)).toBeNull()
  })

  it('rejects empty, slashed, reserved and duplicate names', () => {
    expect(browseEntryNameError('  ', existing)).toBe('Name cannot be empty')
    expect(browseEntryNameError('a/b', existing)).toBe('Name cannot contain "/"')
    expect(browseEntryNameError('..', existing)).toBe('Reserved name')
    expect(browseEntryNameError('a.txt', existing)).toBe('Already exists')
  })
})

describe('browseNameStem / browseDuplicateName', () => {
  it('splits stem and extension', () => {
    expect(browseNameStem('a.txt')).toEqual({ stem: 'a', ext: '.txt' })
    expect(browseNameStem('docs')).toEqual({ stem: 'docs', ext: '' })
  })

  it('builds the termix-style duplicate name', () => {
    expect(browseDuplicateName('a.txt')).toBe('a copy.txt')
    expect(browseDuplicateName('docs')).toBe('docs copy')
  })
})

describe('flattenBrowseRows', () => {
  const dir = (name: string) => ({ name, isDirectory: true, isSymlink: false })
  const file = (name: string) => ({ name, isDirectory: false, isSymlink: false })

  it('lists the open directory at depth 0', () => {
    const rows = flattenBrowseRows([dir('a'), file('b.txt')], {}, new Set(), '/root')
    expect(rows.map((row) => [row.path, row.depth])).toEqual([
      ['/root/a', 0],
      ['/root/b.txt', 0]
    ])
    expect(rows[0].parentDir).toBe('/root')
    expect(rows[0].isExpanded).toBe(false)
  })

  it('inserts cached children of expanded folders one level deeper', () => {
    const rows = flattenBrowseRows(
      [dir('a')],
      { '/root/a': [dir('nested'), file('c.txt')] },
      new Set(['/root/a']),
      '/root'
    )
    expect(rows.map((row) => [row.path, row.depth])).toEqual([
      ['/root/a', 0],
      ['/root/a/nested', 1],
      ['/root/a/c.txt', 1]
    ])
    expect(rows[1].parentDir).toBe('/root/a')
    expect(rows[0].isExpanded).toBe(true)
  })

  it('skips children of collapsed and not-yet-loaded folders', () => {
    const collapsed = flattenBrowseRows(
      [dir('a')],
      { '/root/a': [file('c.txt')] },
      new Set(),
      '/root'
    )
    expect(collapsed).toHaveLength(1)
    const loading = flattenBrowseRows([dir('a')], {}, new Set(['/root/a']), '/root')
    expect(loading).toHaveLength(1)
    expect(loading[0].isExpanded).toBe(true)
  })
})

describe('browseCollapsedExpanded', () => {
  it('drops the folder and every descendant, keeping look-alike names', () => {
    const expanded = new Set(['/a', '/a/b', '/a/b/c', '/ab'])
    expect([...browseCollapsedExpanded(expanded, '/a')].sort()).toEqual(['/ab'])
  })

  it('keeps unrelated folders', () => {
    const expanded = new Set(['/a', '/b'])
    expect([...browseCollapsedExpanded(expanded, '/x')].sort()).toEqual(['/a', '/b'])
  })
})
