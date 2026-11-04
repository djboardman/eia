import type { LocalRepository } from '../domain/local-repository'
import type { ChangeJournalEntry } from '../domain/change-journal'
import type { Workspace } from '../domain/workspace'
import {
  activateRepository,
  archiveActiveRepository,
  saveRepositorySnapshot,
  type RepositorySnapshot,
  type RepositoryStoreStorage,
} from './repository-store'
import {
  repositoryCatalogSchemaVersion,
  type RepositoryCatalog,
  type RepositorySummary,
} from '../domain/repository-catalog'

const catalogStorageKey = 'eia-repository-catalog'
type CatalogStorage = RepositoryStoreStorage

const summaryFor = (repository: LocalRepository): RepositorySummary => ({
  id: repository.id,
  name: repository.name,
  type: repository.type,
})

const saveCatalog = (catalog: RepositoryCatalog, storage: CatalogStorage) => {
  storage.setItem(catalogStorageKey, JSON.stringify(catalog))
}

const parseCatalog = (value: unknown): RepositoryCatalog => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid repository catalog.')
  const catalog = value as Record<string, unknown>
  if (catalog.schemaVersion !== repositoryCatalogSchemaVersion) throw new Error('Unsupported repository catalog version.')
  if (typeof catalog.activeRepositoryId !== 'string' || !catalog.activeRepositoryId) {
    throw new Error('Invalid active repository ID.')
  }
  if (!Array.isArray(catalog.repositories)) throw new Error('Invalid repository catalog entries.')
  const repositories = catalog.repositories.map((value): RepositorySummary => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid repository summary.')
    const repository = value as Record<string, unknown>
    if (typeof repository.id !== 'string' || !repository.id || typeof repository.name !== 'string' || !repository.name) {
      throw new Error('Invalid repository summary identity.')
    }
    if (repository.type !== 'source' && repository.type !== 'fork') throw new Error('Invalid repository summary type.')
    return { id: repository.id, name: repository.name, type: repository.type }
  })
  if (!repositories.some(({ id }) => id === catalog.activeRepositoryId)) {
    throw new Error('Active repository is missing from the catalog.')
  }
  return {
    schemaVersion: repositoryCatalogSchemaVersion,
    activeRepositoryId: catalog.activeRepositoryId,
    repositories,
  }
}

export const loadRepositoryCatalog = (storage: CatalogStorage = localStorage): RepositoryCatalog | undefined => {
  const stored = storage.getItem(catalogStorageKey)
  return stored ? parseCatalog(JSON.parse(stored)) : undefined
}

export const initializeRepositoryCatalog = (
  repository: LocalRepository,
  storage: CatalogStorage = localStorage,
): RepositoryCatalog => {
  const existing = loadRepositoryCatalog(storage)
  const summary = summaryFor(repository)
  const catalog: RepositoryCatalog = existing
    ? {
        ...existing,
        repositories: existing.repositories.some(({ id }) => id === repository.id)
          ? existing.repositories.map((item) => item.id === repository.id ? summary : item)
          : [...existing.repositories, summary],
      }
    : {
        schemaVersion: repositoryCatalogSchemaVersion,
        activeRepositoryId: repository.id,
        repositories: [summary],
      }
  if (catalog.activeRepositoryId !== repository.id) throw new Error('Loaded repository does not match the active catalog entry.')
  archiveActiveRepository(repository.id, storage)
  saveCatalog(catalog, storage)
  return catalog
}

export const registerRepository = (
  catalog: RepositoryCatalog,
  snapshot: RepositorySnapshot,
  storage: CatalogStorage = localStorage,
) => {
  const { repository } = snapshot
  if (catalog.repositories.some(({ id }) => id === repository.id)) throw new Error('Repository is already registered.')
  saveRepositorySnapshot(snapshot, storage)
  const next = { ...catalog, repositories: [...catalog.repositories, summaryFor(repository)] }
  saveCatalog(next, storage)
  return next
}

export const createFork = (
  source: LocalRepository,
  workspace: Workspace,
  journal: readonly ChangeJournalEntry[],
  name: string,
  storage: CatalogStorage = localStorage,
) => {
  if (source.type !== 'source') throw new Error('Only a Source repository can be forked.')
  const forkName = name.trim()
  if (!forkName) throw new Error('A fork name is required.')
  const catalog = loadRepositoryCatalog(storage)
  if (!catalog) throw new Error('Repository catalog has not been initialized.')
  const fork: LocalRepository = {
    ...structuredClone(source),
    id: crypto.randomUUID(),
    name: forkName,
    type: 'fork',
    activeLayer: 'fork',
    upstream: {
      repositoryId: source.id,
      lastSynchronizedCommitId: source.commits.at(-1)?.id,
    },
  }
  registerRepository(catalog, { repository: fork, workspace, journal: [...journal] }, storage)
  switchRepository(fork.id, storage)
  return fork
}

export const switchRepository = (repositoryId: string, storage: CatalogStorage = localStorage) => {
  const catalog = loadRepositoryCatalog(storage)
  if (!catalog) throw new Error('Repository catalog has not been initialized.')
  if (repositoryId === catalog.activeRepositoryId) return catalog
  if (!catalog.repositories.some(({ id }) => id === repositoryId)) throw new Error('Repository is not registered.')
  archiveActiveRepository(catalog.activeRepositoryId, storage)
  activateRepository(repositoryId, storage)
  const next = { ...catalog, activeRepositoryId: repositoryId }
  saveCatalog(next, storage)
  return next
}
