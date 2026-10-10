import { describe, expect, it } from 'vitest'
import { browseMovePlan, browseMoveRejection } from './file-explorer-browse-operations'

describe('browseMoveRejection', () => {
  it('rejects a drop onto the same directory', () => {
    expect(browseMoveRejection('/a/b/file.txt', '/a/b')).toBe(true)
  })

  it('rejects dropping a folder into itself or its child', () => {
    expect(browseMoveRejection('/a/b', '/a/b')).toBe(true)
    expect(browseMoveRejection('/a/b', '/a/b/c')).toBe(true)
  })

  it('allows a move into a sibling folder', () => {
    expect(browseMoveRejection('/a/b/file.txt', '/a/c')).toBe(false)
  })
})

describe('browseMovePlan', () => {
  it('keeps the entry name when it is free', async () => {
    const plan = browseMovePlan('/a/b/file.txt', '/a/c', ['other.txt'])
    expect(plan.destinationPath).toBe('/a/c/file.txt')
    expect(typeof plan.run).toBe('function')
  })

  it('uniquifies the name instead of clobbering an existing entry', () => {
    const plan = browseMovePlan('/a/b/file.txt', '/a/c', ['file.txt'])
    expect(plan.destinationPath).toBe('/a/c/file copy.txt')
  })
})
