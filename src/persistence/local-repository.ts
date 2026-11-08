import {
  localRepositorySchemaVersion,
  type LocalCommit,
  type LocalRepository,
} from '../domain/local-repository'
import type { ChangeJournalEntry } from '../domain/change-journal'
import type { Workspace } from '../domain/workspace'
import { loadChangeJournal } from './change-journal'
import { replayChangeJournal } from '../state/journal-replay'
import { migrateLocalRepository } from './local-repository-migrations'
import { activeRepositoryStorageKeys } from './storage-keys'

const localRepositoryStorageKey = activeRepositoryStorageKeys.repository
type RepositoryStorage = Pick<Storage, 'getItem' | 'setItem'>

const latestRevision = (journal: readonly ChangeJournalEntry[]) => journal.at(-1)?.revision ?? 0

const saveLocalRepository = (repository: LocalRepository, storage: RepositoryStorage) => {
  storage.setItem(localRepositoryStorageKey, JSON.stringify(repository))
}

export const createLocalRepository = (
  workspace: Workspace,
  journal: readonly ChangeJournalEntry[],
): LocalRepository => {
  const revision = latestRevision(journal)
  return {
    schemaVersion: localRepositorySchemaVersion,
    id: crypto.randomUUID(),
    name: 'EIA Model',
    type: 'source',
    activeLayer: 'source',
    initialRevision: revision,
    trackedRevision: revision,
    initialSnapshot: structuredClone(workspace),
    baselineSnapshot: structuredClone(workspace),
    commits: [],
  }
}

export const loadOrCreateLocalRepository = (
  workspace: Workspace,
  journal: readonly ChangeJournalEntry[],
  storage: RepositoryStorage = localStorage,
): LocalRepository => {
  const stored = storage.getItem(localRepositoryStorageKey)
  if (stored) {
    const repository = migrateLocalRepository(JSON.parse(stored))
    saveLocalRepository(repository, storage)
    return repository
  }
  const repository = createLocalRepository(workspace, journal)
  saveLocalRepository(repository, storage)
  return repository
}

export const getPendingChanges = (
  repository: LocalRepository,
  journal: readonly ChangeJournalEntry[],
) => journal.filter(({ revision }) => revision > repository.trackedRevision)

export const commitLocalChanges = (
  workspace: Workspace,
  message: string,
  storage: RepositoryStorage = localStorage,
): LocalCommit => {
  const journal = loadChangeJournal(storage)
  const repository = loadOrCreateLocalRepository(workspace, journal, storage)
  const changes = getPendingChanges(repository, journal)
  const trimmedMessage = message.trim()
  if (!trimmedMessage) throw new Error('A commit message is required.')
  if (changes.length === 0) throw new Error('There are no pending changes to commit.')
  const commit: LocalCommit = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message: trimmedMessage,
    layer: repository.activeLayer,
    parentCommitId: repository.commits.at(-1)?.id,
    baseRevision: repository.trackedRevision,
    changes: structuredClone(changes),
  }
  repository.commits.push(commit)
  repository.trackedRevision = changes.at(-1)?.revision ?? repository.trackedRevision
  repository.baselineSnapshot = structuredClone(workspace)
  saveLocalRepository(repository, storage)
  return commit
}

export const reconstructCommittedWorkspace = (repository: LocalRepository): Workspace => {
  const changes = repository.commits.flatMap(({ changes }) => changes)
  return replayChangeJournal(repository.initialSnapshot, changes, repository.initialRevision)
}
