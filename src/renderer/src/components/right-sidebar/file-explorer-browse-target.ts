import { useMemo } from 'react'
import { useAppStore } from '@/store'
import { getConnectionIdFromState } from '@/lib/connection-owner-resolution'
import { toSshExecutionHostId } from '../../../../shared/execution-host'
import type { SshMutationExpectation } from '../../../../shared/ssh-types'

/**
 * Where a browse list operates: this machine when connectionId is absent, or one
 * SSH target otherwise. connectionId is the same contract every fs: bridge
 * method already accepts, so browse reads and writes ride the existing SFTP
 * provider — nothing is installed on the target host.
 */
export type BrowseTarget = {
  connectionId?: string
  /**
   * Guard for SSH writes: main refuses a mutation whose generation moved on
   * ("SSH connection changed; refresh and try again"). Local browsing needs none.
   */
  expectation?: SshMutationExpectation
}

export const LOCAL_BROWSE_TARGET: BrowseTarget = {}

export function isRemoteBrowseTarget(target: BrowseTarget): boolean {
  return Boolean(target.connectionId)
}

/** Connection + guard every fs: call in browse mode spreads into its args. */
export function browseMutationArgs(
  target: BrowseTarget
): SshMutationExpectation & { connectionId?: string } {
  return {
    ...(target.connectionId ? { connectionId: target.connectionId } : {}),
    ...target.expectation
  }
}

/**
 * Browse target of the active workspace: a folder workspace whose path lives on
 * an SSH host browses that host, everything else browses this machine. A
 * disconnected host keeps its connectionId — reads still reach the host and
 * writes are refused by the expectation rather than silently hitting local disk.
 */
export function useBrowseTarget(): BrowseTarget {
  const activeWorktreeId = useAppStore((s) => s.activeWorktreeId)
  const connectionId = useAppStore(
    (s) => getConnectionIdFromState(s, s.activeWorktreeId ?? null) ?? null
  )
  const generation = useAppStore((s) =>
    connectionId ? (s.sshConnectionStates.get(connectionId)?.connectionGeneration ?? null) : null
  )
  return useMemo<BrowseTarget>(
    () =>
      connectionId && activeWorktreeId
        ? {
            connectionId,
            expectation: {
              expectedExecutionHostId: toSshExecutionHostId(connectionId),
              expectedSshTargetId: connectionId,
              expectedSshConnectionGeneration: generation ?? undefined
            }
          }
        : LOCAL_BROWSE_TARGET,
    [activeWorktreeId, connectionId, generation]
  )
}
