import type { RepositoryType } from './local-repository'

export const repositoryCatalogSchemaVersion = 1 as const

export interface RepositorySummary {
  id: string
  name: string
  type: RepositoryType
}

export interface RepositoryCatalog {
  schemaVersion: typeof repositoryCatalogSchemaVersion
  activeRepositoryId: string
  repositories: RepositorySummary[]
}
