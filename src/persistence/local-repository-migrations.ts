import {
  localRepositorySchemaVersion,
  type LocalCommit,
  type LocalRepository,
  type RepositoryLayer,
} from '../domain/local-repository'
import { parseChangeJournal } from './change-journal'
import { migrateWorkspace } from './migrations'

const parseCommit = (
  value: unknown,
  expectedBaseRevision: number,
  parentCommitId: string | undefined,
  defaultLayer: RepositoryLayer,
): LocalCommit => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid local commit.')
  const commit = value as Record<string, unknown>
  if (typeof commit.id !== 'string' || !commit.id) throw new Error('Invalid local commit ID.')
  if (typeof commit.message !== 'string' || !commit.message.trim()) throw new Error('Invalid local commit message.')
  if (typeof commit.timestamp !== 'string' || Number.isNaN(Date.parse(commit.timestamp))) {
    throw new Error('Invalid local commit timestamp.')
  }
  if (commit.baseRevision !== expectedBaseRevision) throw new Error('Invalid local commit base revision.')
  if (commit.parentCommitId !== parentCommitId) throw new Error('Invalid local commit parent.')
  const changes = parseChangeJournal(commit.changes, expectedBaseRevision + 1)
  if (changes.length === 0) throw new Error('Local commits must contain changes.')
  const layer = commit.layer ?? defaultLayer
  if (layer !== 'source' && layer !== 'fork') throw new Error('Invalid local commit layer.')
  return {
    id: commit.id,
    timestamp: commit.timestamp,
    message: commit.message,
    layer,
    parentCommitId,
    baseRevision: expectedBaseRevision,
    changes,
  }
}

export const migrateLocalRepository = (value: unknown): LocalRepository => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid local repository.')
  const repository = value as Record<string, unknown>
  const storedVersion = Number(repository.schemaVersion)
  if (storedVersion !== 1 && storedVersion !== localRepositorySchemaVersion) {
    throw new Error('Unsupported local repository version.')
  }
  const type = storedVersion === 1 ? 'source' : repository.type
  if (type !== 'source' && type !== 'fork') throw new Error('Invalid repository type.')
  const activeLayer = storedVersion === 1 ? 'source' : repository.activeLayer
  if (activeLayer !== 'source' && activeLayer !== 'fork') throw new Error('Invalid active repository layer.')
  if (type === 'source' && activeLayer !== 'source') throw new Error('A source repository must use the source layer.')
  const id = storedVersion === 1 ? crypto.randomUUID() : repository.id
  const name = storedVersion === 1 ? 'EIA Model' : repository.name
  if (typeof id !== 'string' || !id || typeof name !== 'string' || !name.trim()) {
    throw new Error('Invalid repository identity.')
  }
  let upstream: LocalRepository['upstream']
  if (type === 'fork') {
    if (!repository.upstream || typeof repository.upstream !== 'object' || Array.isArray(repository.upstream)) {
      throw new Error('A fork requires an upstream repository.')
    }
    const storedUpstream = repository.upstream as Record<string, unknown>
    if (typeof storedUpstream.repositoryId !== 'string' || !storedUpstream.repositoryId) {
      throw new Error('Invalid upstream repository ID.')
    }
    if (storedUpstream.lastSynchronizedCommitId !== undefined && typeof storedUpstream.lastSynchronizedCommitId !== 'string') {
      throw new Error('Invalid synchronized upstream commit ID.')
    }
    upstream = {
      repositoryId: storedUpstream.repositoryId,
      lastSynchronizedCommitId: storedUpstream.lastSynchronizedCommitId as string | undefined,
    }
  }
  if (!Number.isInteger(repository.initialRevision) || Number(repository.initialRevision) < 0) {
    throw new Error('Invalid initial repository revision.')
  }
  const initialRevision = Number(repository.initialRevision)
  let expectedRevision = initialRevision
  let parentCommitId: string | undefined
  if (!Array.isArray(repository.commits)) throw new Error('Invalid local commit history.')
  const commits = repository.commits.map((value) => {
    const commit = parseCommit(value, expectedRevision, parentCommitId, type === 'fork' ? 'fork' : 'source')
    expectedRevision = commit.changes.at(-1)?.revision ?? expectedRevision
    parentCommitId = commit.id
    return commit
  })
  if (repository.trackedRevision !== expectedRevision) throw new Error('Invalid tracked repository revision.')
  return {
    schemaVersion: localRepositorySchemaVersion,
    id,
    name: name.trim(),
    type,
    activeLayer,
    upstream,
    initialRevision,
    trackedRevision: expectedRevision,
    initialSnapshot: migrateWorkspace(repository.initialSnapshot),
    baselineSnapshot: migrateWorkspace(repository.baselineSnapshot),
    commits,
  }
}
