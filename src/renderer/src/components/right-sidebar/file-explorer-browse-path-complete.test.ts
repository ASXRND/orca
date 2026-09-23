import { describe, expect, it } from 'vitest'
import {
  browseCompletionMatches,
  browseJoinAbsolute,
  browseLongestCommonPrefix,
  completeBrowsePathInput,
  splitBrowseCompletion
} from './file-explorer-browse-path-complete'

describe('splitBrowseCompletion', () => {
  it('lists the parent of a partial segment', () => {
    expect(splitBrowseCompletion('/Use')).toEqual({ listDir: '/', prefix: 'Use' })
    expect(splitBrowseCompletion('/Users/al')).toEqual({ listDir: '/Users', prefix: 'al' })
  })

  it('lists the directory itself after a trailing slash', () => {
    expect(splitBrowseCompletion('/Users/')).toEqual({ listDir: '/Users', prefix: '' })
    expect(splitBrowseCompletion('/')).toEqual({ listDir: '/', prefix: '' })
  })
})

describe('browseLongestCommonPrefix', () => {
  it('finds the shared start of the names, case-insensitively', () => {
    expect(browseLongestCommonPrefix(['alpha', 'alpine', 'ALPS'])).toBe('alp')
    expect(browseLongestCommonPrefix(['one'])).toBe('one')
    expect(browseLongestCommonPrefix(['a', 'b'])).toBe('')
    expect(browseLongestCommonPrefix([])).toBe('')
  })
})

describe('browseCompletionMatches', () => {
  const entries = [
    { name: 'alpha.txt', isDirectory: false },
    { name: 'Alpine', isDirectory: true },
    { name: 'beta', isDirectory: true },
    { name: 'alp', isDirectory: false }
  ]

  it('matches case-insensitively with directories first', () => {
    expect(browseCompletionMatches('al', entries).map((entry) => entry.name)).toEqual([
      'Alpine',
      'alp',
      'alpha.txt'
    ])
  })

  it('returns nothing when the prefix does not match', () => {
    expect(browseCompletionMatches('z', entries)).toEqual([])
  })
})

describe('browseJoinAbsolute', () => {
  it('joins at the root without a double slash', () => {
    expect(browseJoinAbsolute('/', 'Users')).toBe('/Users')
    expect(browseJoinAbsolute('/Users', 'me')).toBe('/Users/me')
  })
})

describe('completeBrowsePathInput', () => {
  it('extends a single file match to its full name', () => {
    expect(completeBrowsePathInput('/tmp/ap', [{ name: 'apple.txt', isDirectory: false }])).toBe(
      '/tmp/apple.txt'
    )
  })

  it('adds a trailing slash for a single directory match', () => {
    expect(completeBrowsePathInput('/tmp/ap', [{ name: 'apps', isDirectory: true }])).toBe(
      '/tmp/apps/'
    )
  })

  it('extends several matches to their common prefix', () => {
    expect(
      completeBrowsePathInput('/tmp/a', [
        { name: 'alpha', isDirectory: true },
        { name: 'alpine', isDirectory: false }
      ])
    ).toBe('/tmp/alp')
  })

  it('completes from the filesystem root', () => {
    expect(completeBrowsePathInput('/Us', [{ name: 'Users', isDirectory: true }])).toBe('/Users/')
  })

  it('returns null when nothing matches', () => {
    expect(completeBrowsePathInput('/tmp/z', [{ name: 'apple', isDirectory: false }])).toBeNull()
  })
})
