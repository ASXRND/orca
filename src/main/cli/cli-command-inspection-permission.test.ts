import { mkdir, readlink, rm, symlink } from 'node:fs/promises'
import type * as NodeFsPromises from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

// Why: the state under test is a root-owned 0700 symlink, which only root can create, so `readlink`
// is stubbed to reproduce what macOS does for the logged-in user: EACCES instead of the link target.
const deniedReadlinkPath = vi.hoisted(() => ({ path: '' }))

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof NodeFsPromises>()
  return {
    ...actual,
    readlink: async (...args: Parameters<typeof actual.readlink>) => {
      if (deniedReadlinkPath.path && String(args[0]) === deniedReadlinkPath.path) {
        throw Object.assign(
          new Error(`EACCES: permission denied, readlink '${deniedReadlinkPath.path}'`),
          { code: 'EACCES' }
        )
      }
      return actual.readlink(...args)
    }
  }
})

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => tmpdir(),
    getAppPath: () => tmpdir()
  }
}))

import { CliInstaller } from './cli-installer'
import { makeFixture } from './cli-installer-test-fixtures'

const createdRoots: string[] = []

afterEach(async () => {
  deniedReadlinkPath.path = ''
  await Promise.all(
    createdRoots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  )
})

describe.skipIf(process.platform === 'win32')('CliInstaller unreadable command symlink', () => {
  it('reports a repairable stale state instead of failing the status probe', async () => {
    const fixture = await makeFixture()
    createdRoots.push(fixture.root)
    const commandPath = join(fixture.root, 'bin', 'orca')
    await mkdir(dirname(commandPath), { recursive: true })
    await symlink('/Applications/Orca.app/Contents/Resources/bin/orca', commandPath)
    deniedReadlinkPath.path = commandPath

    const installer = new CliInstaller({
      platform: 'darwin',
      isPackaged: false,
      userDataPath: fixture.userDataPath,
      execPath: '/Applications/Orca.app/Contents/MacOS/Orca',
      appPath: fixture.appPath,
      commandPathOverride: commandPath,
      processPathEnv: dirname(commandPath)
    })

    const status = await installer.getStatus()

    expect(status.state).toBe('stale')
    expect(status.detail).toContain('not readable by your user account')
  })

  it('keeps a readable symlink out of the permission repair path', async () => {
    const fixture = await makeFixture()
    createdRoots.push(fixture.root)
    const commandPath = join(fixture.root, 'bin', 'orca')
    await mkdir(dirname(commandPath), { recursive: true })
    await symlink('/Applications/Orca.app/Contents/Resources/bin/orca', commandPath)

    const installer = new CliInstaller({
      platform: 'darwin',
      isPackaged: false,
      userDataPath: fixture.userDataPath,
      execPath: '/Applications/Orca.app/Contents/MacOS/Orca',
      appPath: fixture.appPath,
      commandPathOverride: commandPath,
      processPathEnv: dirname(commandPath)
    })

    const status = await installer.getStatus()

    await expect(readlink(commandPath)).resolves.toBe(
      '/Applications/Orca.app/Contents/Resources/bin/orca'
    )
    expect(status.detail).not.toContain('not readable by your user account')
  })
})
