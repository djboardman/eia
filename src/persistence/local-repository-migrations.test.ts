import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
import { migrateLocalRepository } from './local-repository-migrations'

describe('local repository migrations', () => {
  it('migrates a version 1 repository to a source repository', () => {
    const workspace = createEmptyWorkspace()
    const repository = migrateLocalRepository({
      schemaVersion: 1,
      initialRevision: 0,
      trackedRevision: 0,
      initialSnapshot: workspace,
      baselineSnapshot: workspace,
      commits: [],
    })

    expect(repository).toMatchObject({
      schemaVersion: 2,
      name: 'EIA Model',
      type: 'source',
      activeLayer: 'source',
    })
    expect(repository.id).toBeTruthy()
  })

  it('requires fork repositories to identify their upstream', () => {
    const workspace = createEmptyWorkspace()
    expect(() => migrateLocalRepository({
      schemaVersion: 2,
      id: 'fork',
      name: 'Fork',
      type: 'fork',
      activeLayer: 'fork',
      initialRevision: 0,
      trackedRevision: 0,
      initialSnapshot: workspace,
      baselineSnapshot: workspace,
      commits: [],
    })).toThrow('upstream')
  })
})
