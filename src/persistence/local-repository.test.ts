import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
import { applyWorkspaceCommand, type WorkspaceCommand } from '../state/commands'
import { appendChangeJournal, loadChangeJournal } from './change-journal'
import {
  commitLocalChanges,
  getPendingChanges,
  loadOrCreateLocalRepository,
  reconstructCommittedWorkspace,
} from './local-repository'

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('local repository', () => {
  it('commits pending changes and reconstructs the committed workspace', () => {
    const storage = createStorage()
    const workspace = createEmptyWorkspace()
    loadOrCreateLocalRepository(workspace, [], storage)
    const commands: WorkspaceCommand[] = [
      { type: 'category.create', definitionId: 'finance', name: 'Finance' },
      {
        type: 'recordType.create',
        definitionId: 'invoice',
        parentKind: 'category',
        parentId: 'finance',
        name: 'Invoice',
      },
    ]
    for (const command of commands) {
      applyWorkspaceCommand(workspace, command)
      appendChangeJournal(command, storage)
    }

    const beforeCommit = loadOrCreateLocalRepository(workspace, loadChangeJournal(storage), storage)
    expect(getPendingChanges(beforeCommit, loadChangeJournal(storage))).toHaveLength(2)
    const commit = commitLocalChanges(workspace, 'Add invoices', storage)
    const repository = loadOrCreateLocalRepository(workspace, loadChangeJournal(storage), storage)

    expect(commit.message).toBe('Add invoices')
    expect(commit.layer).toBe('source')
    expect(repository).toMatchObject({ name: 'EIA Model', type: 'source', activeLayer: 'source' })
    expect(getPendingChanges(repository, loadChangeJournal(storage))).toEqual([])
    expect(reconstructCommittedWorkspace(repository).recordTypes.categories[0].recordTypes[0].name).toBe('Invoice')
  })
})
