import type { ChangeJournalEntry } from '../domain/change-journal'
import type { LocalCommit, LocalRepository } from '../domain/local-repository'
import type { Workspace } from '../domain/workspace'
import { applyWorkspaceCommand, type WorkspaceCommand } from '../state/commands'
import {
  loadRepositorySnapshot,
  saveActiveRepositorySnapshot,
  type RepositoryStoreStorage,
} from './repository-store'

export interface PullConflict {
  incoming: ChangeJournalEntry
  local: ChangeJournalEntry
}

export interface ForkPullPreview {
  commits: LocalCommit[]
  changeCount: number
  conflicts: PullConflict[]
}

const loadUpstream = (fork: LocalRepository, storage: RepositoryStoreStorage) => {
  const upstreamId = fork.upstream?.repositoryId
  if (!upstreamId) throw new Error('Fork upstream is missing.')
  const source = loadRepositorySnapshot(upstreamId, storage).repository
  if (source.type !== 'source') throw new Error('Fork upstream is not a Source repository.')
  return source
}

const incomingCommits = (fork: LocalRepository, source: LocalRepository) => {
  const synchronizedId = fork.upstream?.lastSynchronizedCommitId
  if (!synchronizedId) return source.commits
  const synchronizedIndex = source.commits.findIndex(({ id }) => id === synchronizedId)
  if (synchronizedIndex < 0) throw new Error('The synchronized Source commit is no longer available.')
  return source.commits.slice(synchronizedIndex + 1)
}

const commandTargets = (command: WorkspaceCommand): string[] => {
  switch (command.type) {
    case 'workspace.replace': return ['*']
    case 'category.create':
    case 'category.delete': return [`category/${command.definitionId}/*`]
    case 'category.rename': return [`category/${command.definitionId}/name`]
    case 'recordType.create': return [
      `record/${command.definitionId}/*`,
      command.parentKind === 'category'
        ? `category/${command.parentId}/record-types`
        : `record/${command.parentId}/${command.parentKind}`,
    ]
    case 'recordType.delete': return [`record/${command.definitionId}/*`]
    case 'recordType.rename': return [`record/${command.definitionId}/name`]
    case 'recordType.setKind': return [`record/${command.definitionId}/kind`]
    case 'stringSubtype.create':
    case 'stringSubtype.delete': return [`string-subtype/${command.definitionId}/*`]
    case 'stringSubtype.update': return Object.keys(command.changes).map(
      (property) => `string-subtype/${command.definitionId}/${property}`,
    )
    case 'dataScope.create':
    case 'dataScope.delete': return [`data-scope/${command.definitionId}/*`]
    case 'dataScope.rename': return [`data-scope/${command.definitionId}/name`]
    case 'middleware.create':
    case 'middleware.delete': return [`middleware/${command.definitionId}/*`]
    case 'middleware.rename': return [`middleware/${command.definitionId}/name`]
    case 'pipeline.create': return [
      `middleware/${command.middlewareDefinitionId}/pipeline/${command.definitionId}/*`,
    ]
    case 'pipeline.delete': return [`pipeline/${command.definitionId}/*`]
    case 'pipeline.rename': return [`pipeline/${command.definitionId}/name`]
    case 'pipeline.update': return Object.keys(command.changes).map(
      (property) => `pipeline/${command.definitionId}/${property}`,
    )
    case 'api.importWsdl': return [
      `data-scope/${command.dataScopeDefinitionId}/api/${command.definitionId}/*`,
    ]
    case 'attribute.add':
    case 'attribute.delete': return [
      `record/${command.recordTypeDefinitionId}/attribute/${command.definitionId}/*`,
    ]
    case 'attribute.update': return Object.keys(command.changes).map(
      (property) => `record/${command.recordTypeDefinitionId}/attribute/${command.definitionId}/${property}`,
    )
    case 'attribute.move': return [`record/${command.recordTypeDefinitionId}/attributes/order`]
    case 'relationshipAttribute.add':
    case 'relationshipAttribute.delete': return [
      `record/${command.recordTypeDefinitionId}/relationship/${command.definitionId}/*`,
    ]
    case 'relationshipAttribute.update': return Object.keys(command.changes).map(
      (property) => `record/${command.recordTypeDefinitionId}/relationship/${command.definitionId}/${property}`,
    )
  }
}

const targetsOverlap = (left: string, right: string) => {
  if (left === '*' || right === '*') return true
  if (left === right) return true
  if (left.endsWith('/*') && right.startsWith(left.slice(0, -1))) return true
  return right.endsWith('/*') && left.startsWith(right.slice(0, -1))
}

const commandsConflict = (incoming: WorkspaceCommand, local: WorkspaceCommand) =>
  commandTargets(incoming).some((left) => commandTargets(local).some((right) => targetsOverlap(left, right)))

const forkChanges = (fork: LocalRepository, journal: readonly ChangeJournalEntry[]) => [
  ...fork.commits.filter(({ layer }) => layer === 'fork').flatMap(({ changes }) => changes),
  ...journal.filter(({ revision }) => revision > fork.trackedRevision),
]

export const previewForkPull = (
  fork: LocalRepository,
  journal: readonly ChangeJournalEntry[],
  storage: RepositoryStoreStorage = localStorage,
): ForkPullPreview => {
  if (fork.type !== 'fork') throw new Error('Only a Fork repository can pull from Source.')
  const commits = incomingCommits(fork, loadUpstream(fork, storage))
  const incoming = commits.flatMap(({ changes }) => changes)
  const local = forkChanges(fork, journal)
  const conflicts = incoming.flatMap((entry) => local
    .filter((localEntry) => commandsConflict(entry.command, localEntry.command))
    .map((localEntry) => ({ incoming: entry, local: localEntry })))
  return { commits, changeCount: incoming.length, conflicts }
}

const applyChanges = (workspace: Workspace, changes: readonly ChangeJournalEntry[]) => {
  const next = structuredClone(workspace)
  for (const { command } of changes) {
    if (!applyWorkspaceCommand(next, command).changed) {
      throw new Error('An incoming Source change could not be applied.')
    }
  }
  return next
}

export const pullFromSource = (
  fork: LocalRepository,
  workspace: Workspace,
  journal: readonly ChangeJournalEntry[],
  storage: RepositoryStoreStorage = localStorage,
) => {
  const preview = previewForkPull(fork, journal, storage)
  if (preview.conflicts.length) throw new Error('The pull has conflicts and was not applied.')
  if (!preview.commits.length) return preview

  const committedJournal = journal.slice(0, fork.trackedRevision)
  const pendingJournal = journal.slice(fork.trackedRevision)
  let nextRevision = committedJournal.length
  let parentCommitId = fork.commits.at(-1)?.id
  const importedCommits: LocalCommit[] = preview.commits.map((sourceCommit) => {
    const baseRevision = nextRevision
    const changes = sourceCommit.changes.map((entry): ChangeJournalEntry => ({
      ...structuredClone(entry),
      id: crypto.randomUUID(),
      revision: ++nextRevision,
    }))
    const commit: LocalCommit = {
      ...structuredClone(sourceCommit),
      id: crypto.randomUUID(),
      parentCommitId,
      baseRevision,
      changes,
      layer: 'source',
    }
    parentCommitId = commit.id
    return commit
  })
  const importedChanges = importedCommits.flatMap(({ changes }) => changes)
  const renumberedPending = pendingJournal.map((entry): ChangeJournalEntry => ({
    ...structuredClone(entry),
    revision: ++nextRevision,
  }))
  const nextWorkspace = applyChanges(workspace, preview.commits.flatMap(({ changes }) => changes))
  const nextRepository: LocalRepository = {
    ...structuredClone(fork),
    trackedRevision: committedJournal.length + importedChanges.length,
    baselineSnapshot: applyChanges(fork.baselineSnapshot, preview.commits.flatMap(({ changes }) => changes)),
    commits: [...fork.commits, ...importedCommits],
    upstream: {
      repositoryId: fork.upstream!.repositoryId,
      lastSynchronizedCommitId: preview.commits.at(-1)!.id,
    },
  }
  const nextJournal = [...committedJournal, ...importedChanges, ...renumberedPending]
  saveActiveRepositorySnapshot({
    workspace: nextWorkspace,
    journal: nextJournal,
    repository: nextRepository,
  }, storage)
  return preview
}
