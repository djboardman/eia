import type { ApiDefinition } from './contracts'

export const dataScopeCollectionDefinitionId = '__data_scopes__'

export interface DataScope {
  definitionId: string
  name: string
  categories: DataScopeCategory[]
}

export interface ApiDataScopeCategory {
  definitionId: string
  name: 'APIs'
  kind: 'apis'
  items: ApiDefinition[]
}

export interface ClientDataScopeCategory {
  definitionId: string
  name: 'CLIENTs'
  kind: 'clients'
  items: ApiDefinition[]
}

export type DataScopeCategory = ApiDataScopeCategory | ClientDataScopeCategory

export interface DataScopeCollection {
  definitionId: string
  name: string
  items: DataScope[]
}

export const createDataScopeCategories = (dataScopeDefinitionId: string): DataScopeCategory[] => [
  { definitionId: `${dataScopeDefinitionId}:apis`, name: 'APIs', kind: 'apis', items: [] },
  { definitionId: `${dataScopeDefinitionId}:clients`, name: 'CLIENTs', kind: 'clients', items: [] },
]
