import { describe, expect, it } from 'vitest'
import {
  browseMutationArgs,
  isRemoteBrowseTarget,
  LOCAL_BROWSE_TARGET
} from './file-explorer-browse-target'

describe('browseMutationArgs', () => {
  it('stays empty for local browsing so fs: routes to this machine', () => {
    expect(browseMutationArgs(LOCAL_BROWSE_TARGET)).toEqual({})
    expect(browseMutationArgs({})).toEqual({})
  })

  it('carries the connection and the SSH guard for a remote target', () => {
    expect(
      browseMutationArgs({
        connectionId: 'srv-220',
        expectation: {
          expectedExecutionHostId: 'ssh:srv-220',
          expectedSshTargetId: 'srv-220',
          expectedSshConnectionGeneration: 7
        }
      })
    ).toEqual({
      connectionId: 'srv-220',
      expectedExecutionHostId: 'ssh:srv-220',
      expectedSshTargetId: 'srv-220',
      expectedSshConnectionGeneration: 7
    })
  })

  it('keeps the connection without a guard when the host has no generation yet', () => {
    // main refuses the write with "SSH connection changed" instead of hitting local disk.
    expect(browseMutationArgs({ connectionId: 'srv-220' })).toEqual({
      connectionId: 'srv-220'
    })
  })
})

describe('isRemoteBrowseTarget', () => {
  it('distinguishes a host from this machine', () => {
    expect(isRemoteBrowseTarget(LOCAL_BROWSE_TARGET)).toBe(false)
    expect(isRemoteBrowseTarget({ connectionId: 'srv-220' })).toBe(true)
  })
})
