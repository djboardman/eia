import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
import { createLocalRepository } from './local-repository'
import { loadRepositorySnapshot } from './repository-store'

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('repository store', () => {
  it('migrates the previous three-key repository layout to a snapshot', () => {
    const storage = createStorage()
    const workspace = createEmptyWorkspace()
    const repository = createLocalRepository(workspace, [])
    const prefix = `eia-repository:${repository.id}:`
    storage.setItem(`${prefix}eia-workspace`, JSON.stringify(workspace))
    storage.setItem(`${prefix}eia-change-journal`, '[]')
    storage.setItem(`${prefix}eia-local-repository`, JSON.stringify(repository))

    expect(loadRepositorySnapshot(repository.id, storage)).toMatchObject({
      repository: { id: repository.id },
      journal: [],
    })
    expect(storage.getItem(`eia-repository:${repository.id}:snapshot`)).not.toBeNull()
  })
})
