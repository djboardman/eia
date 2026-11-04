import type { ChangeJournalEntry } from './change-journal'
import type { Workspace } from './workspace'

export const localRepositorySchemaVersion = 2 as const
export type RepositoryType = 'source' | 'fork'
export type RepositoryLayer = 'source' | 'fork'

export interface UpstreamReference {
  repositoryId: string
  lastSynchronizedCommitId?: string
}

export interface LocalCommit {
  id: string
  timestamp: string
  message: string
  layer: RepositoryLayer
  parentCommitId?: string
  baseRevision: number
  changes: ChangeJournalEntry[]
}

export interface LocalRepository {
  schemaVersion: typeof localRepositorySchemaVersion
  id: string
  name: string
  type: RepositoryType
  activeLayer: RepositoryLayer
  upstream?: UpstreamReference
  initialRevision: number
  trackedRevision: number
  initialSnapshot: Workspace
  baselineSnapshot: Workspace
  commits: LocalCommit[]
}
