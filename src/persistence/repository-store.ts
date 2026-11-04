import type { ChangeJournalEntry } from '../domain/change-journal'
import type { LocalRepository } from '../domain/local-repository'
import type { Workspace } from '../domain/workspace'
import { parseChangeJournal } from './change-journal'
import { migrateLocalRepository } from './local-repository-migrations'
import { migrateWorkspace } from './migrations'

export type RepositoryStoreStorage = Pick<Storage, 'getItem' | 'setItem'>

export interface RepositorySnapshot {
  workspace: Workspace
  journal: ChangeJournalEntry[]
  repository: LocalRepository
}

const activeKeys = {
  workspace: 'eia-workspace',
  journal: 'eia-change-journal',
  repository: 'eia-local-repository',
} as const

const snapshotKey = (repositoryId: string) => `eia-repository:${repositoryId}:snapshot`
const legacyKey = (repositoryId: string, activeKey: string) => `eia-repository:${repositoryId}:${activeKey}`

const parseJson = (value: string | null, description: string): unknown => {
  if (value === null) throw new Error(`${description} is missing.`)
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`${description} is invalid.`)
  }
}

const parseSnapshot = (value: unknown): RepositorySnapshot => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Repository snapshot is invalid.')
  }
  const snapshot = value as Record<string, unknown>
  return {
    workspace: migrateWorkspace(snapshot.workspace),
    journal: parseChangeJournal(snapshot.journal),
    repository: migrateLocalRepository(snapshot.repository),
  }
}

export const loadActiveRepositorySnapshot = (
  storage: RepositoryStoreStorage = localStorage,
): RepositorySnapshot => ({
  workspace: migrateWorkspace(parseJson(storage.getItem(activeKeys.workspace), 'Active workspace')),
  journal: parseChangeJournal(parseJson(storage.getItem(activeKeys.journal), 'Active change journal')),
  repository: migrateLocalRepository(parseJson(storage.getItem(activeKeys.repository), 'Active repository')),
})

export const saveActiveRepositorySnapshot = (
  snapshot: RepositorySnapshot,
  storage: RepositoryStoreStorage = localStorage,
) => {
  storage.setItem(activeKeys.workspace, JSON.stringify(snapshot.workspace))
  storage.setItem(activeKeys.journal, JSON.stringify(snapshot.journal))
  storage.setItem(activeKeys.repository, JSON.stringify(snapshot.repository))
}

export const saveRepositorySnapshot = (
  snapshot: RepositorySnapshot,
  storage: RepositoryStoreStorage = localStorage,
) => {
  storage.setItem(snapshotKey(snapshot.repository.id), JSON.stringify(snapshot))
}

export const loadRepositorySnapshot = (
  repositoryId: string,
  storage: RepositoryStoreStorage = localStorage,
): RepositorySnapshot => {
  const stored = storage.getItem(snapshotKey(repositoryId))
  if (stored !== null) return parseSnapshot(parseJson(stored, 'Repository snapshot'))

  const snapshot = parseSnapshot({
    workspace: parseJson(storage.getItem(legacyKey(repositoryId, activeKeys.workspace)), 'Stored workspace'),
    journal: parseJson(storage.getItem(legacyKey(repositoryId, activeKeys.journal)), 'Stored change journal'),
    repository: parseJson(storage.getItem(legacyKey(repositoryId, activeKeys.repository)), 'Stored repository'),
  })
  saveRepositorySnapshot(snapshot, storage)
  return snapshot
}

export const archiveActiveRepository = (
  repositoryId: string,
  storage: RepositoryStoreStorage = localStorage,
) => {
  const snapshot = loadActiveRepositorySnapshot(storage)
  if (snapshot.repository.id !== repositoryId) throw new Error('Active repository identity does not match the catalog.')
  saveRepositorySnapshot(snapshot, storage)
}

export const activateRepository = (
  repositoryId: string,
  storage: RepositoryStoreStorage = localStorage,
) => {
  const snapshot = loadRepositorySnapshot(repositoryId, storage)
  saveActiveRepositorySnapshot(snapshot, storage)
  return snapshot
}
