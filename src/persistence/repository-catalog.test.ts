import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
import { createLocalRepository } from './local-repository'
import {
  createFork,
  initializeRepositoryCatalog,
  loadRepositoryCatalog,
  registerRepository,
  switchRepository,
} from './repository-catalog'

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  }
}

describe('repository catalog', () => {
  it('forks a source and switches to the independent fork', () => {
    const storage = createStorage()
    const workspace = createEmptyWorkspace()
    const source = createLocalRepository(workspace, [])
    storage.setItem('eia-workspace', JSON.stringify(workspace))
    storage.setItem('eia-change-journal', '[]')
    storage.setItem('eia-local-repository', JSON.stringify(source))
    initializeRepositoryCatalog(source, storage)

    const fork = createFork(source, workspace, [], 'Customer Model', storage)

    expect(fork).toMatchObject({
      name: 'Customer Model',
      type: 'fork',
      activeLayer: 'fork',
      upstream: { repositoryId: source.id },
    })
    expect(fork.id).not.toBe(source.id)
    expect(loadRepositoryCatalog(storage)).toMatchObject({ activeRepositoryId: fork.id })
    expect(JSON.parse(storage.getItem('eia-local-repository') ?? '{}')).toMatchObject({ id: fork.id })
  })

  it('isolates repository state and switches the active repository', () => {
    const storage = createStorage()
    const sourceWorkspace = createEmptyWorkspace()
    const source = createLocalRepository(sourceWorkspace, [])
    storage.setItem('eia-workspace', JSON.stringify(sourceWorkspace))
    storage.setItem('eia-change-journal', '[]')
    storage.setItem('eia-local-repository', JSON.stringify(source))
    let catalog = initializeRepositoryCatalog(source, storage)

    const forkWorkspace = createEmptyWorkspace()
    forkWorkspace.topLevels[0].label = 'Fork Record Types'
    const fork = {
      ...createLocalRepository(forkWorkspace, []),
      name: 'Customer Fork',
      type: 'fork' as const,
      activeLayer: 'fork' as const,
      upstream: { repositoryId: source.id },
    }
    catalog = registerRepository(catalog, { repository: fork, workspace: forkWorkspace, journal: [] }, storage)
    switchRepository(fork.id, storage)

    expect(loadRepositoryCatalog(storage)).toMatchObject({ activeRepositoryId: fork.id })
    expect(JSON.parse(storage.getItem('eia-workspace') ?? '{}').topLevels[0].label).toBe('Fork Record Types')
    expect(catalog.repositories).toHaveLength(2)
  })
})
