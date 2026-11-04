import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
import { applyWorkspaceCommand, type WorkspaceCommand } from '../state/commands'
import { appendChangeJournal, loadChangeJournal } from './change-journal'
import { commitLocalChanges, createLocalRepository, loadOrCreateLocalRepository } from './local-repository'
import { createFork, initializeRepositoryCatalog, switchRepository } from './repository-catalog'
import { previewForkPull, pullFromSource } from './repository-sync'

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => { values.delete(key) },
  }
}

const setup = () => {
  const storage = createStorage()
  const workspace = createEmptyWorkspace()
  const source = createLocalRepository(workspace, [])
  storage.setItem('eia-workspace', JSON.stringify(workspace))
  storage.setItem('eia-change-journal', '[]')
  storage.setItem('eia-local-repository', JSON.stringify(source))
  initializeRepositoryCatalog(source, storage)
  const fork = createFork(source, workspace, [], 'Customer', storage)
  return { storage, workspace, source, fork }
}

const commitSourceCategory = (
  storage: ReturnType<typeof createStorage>,
  sourceId: string,
  command: WorkspaceCommand,
) => {
  switchRepository(sourceId, storage)
  const workspace = JSON.parse(storage.getItem('eia-workspace')!)
  applyWorkspaceCommand(workspace, command)
  storage.setItem('eia-workspace', JSON.stringify(workspace))
  appendChangeJournal(command, storage)
  return commitLocalChanges(workspace, 'Add Finance', storage)
}

describe('fork pull', () => {
  it('previews and applies new Source commits to a Fork', () => {
    const { storage, source, fork } = setup()
    const command: WorkspaceCommand = { type: 'category.create', definitionId: 'finance', name: 'Finance' }
    const sourceCommit = commitSourceCategory(storage, source.id, command)
    switchRepository(fork.id, storage)
    const forkWorkspace = JSON.parse(storage.getItem('eia-workspace')!)
    const forkJournal = loadChangeJournal(storage)
    const activeFork = loadOrCreateLocalRepository(forkWorkspace, forkJournal, storage)

    expect(previewForkPull(activeFork, forkJournal, storage)).toMatchObject({ changeCount: 1, conflicts: [] })
    pullFromSource(activeFork, forkWorkspace, forkJournal, storage)

    expect(JSON.parse(storage.getItem('eia-workspace')!).recordTypes.categories[0].name).toBe('Finance')
    expect(JSON.parse(storage.getItem('eia-local-repository')!).upstream.lastSynchronizedCommitId).toBe(sourceCommit.id)
    expect(() => loadOrCreateLocalRepository(
      JSON.parse(storage.getItem('eia-workspace')!),
      loadChangeJournal(storage),
      storage,
    )).not.toThrow()
  })

  it('reports overlapping changes and leaves the Fork unchanged', () => {
    const { storage, source, fork } = setup()
    const command: WorkspaceCommand = { type: 'category.create', definitionId: 'finance', name: 'Finance' }
    commitSourceCategory(storage, source.id, command)
    switchRepository(fork.id, storage)
    const forkWorkspace = JSON.parse(storage.getItem('eia-workspace')!)
    applyWorkspaceCommand(forkWorkspace, command)
    storage.setItem('eia-workspace', JSON.stringify(forkWorkspace))
    appendChangeJournal(command, storage)
    const forkJournal = loadChangeJournal(storage)
    const activeFork = loadOrCreateLocalRepository(forkWorkspace, forkJournal, storage)
    const before = storage.getItem('eia-workspace')

    expect(previewForkPull(activeFork, forkJournal, storage).conflicts).toHaveLength(1)
    expect(() => pullFromSource(activeFork, forkWorkspace, forkJournal, storage)).toThrow('conflicts')
    expect(storage.getItem('eia-workspace')).toBe(before)
  })
})
