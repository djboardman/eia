import type { Category, RecordType } from './record-types'
import { dataScopeCollectionDefinitionId, type DataScopeCollection } from './applications'
import type { StringDataTypeSubtype } from './data-types'
import type { MiddlewareDefinition } from './pipelines'

export * from './applications'
export * from './contracts'
export * from './data-types'
export * from './pipelines'
export * from './record-types'

export const workspaceSchemaVersion = 12 as const
export const rootRecordTypeDefinitionId = '__record__'
export const recordTypeIdAttributeDefinitionId = '__record_type_id__'
export interface TopLevelDefinition {
  id: string
  label: string
  children?: TopLevelDefinition[]
}

export interface Workspace {
  schemaVersion: typeof workspaceSchemaVersion
  topLevels: TopLevelDefinition[]
  recordTypes: {
    root: RecordType
    categories: Category[]
  }
  dataTypes: {
    basic: string[]
    stringSubtypes: StringDataTypeSubtype[]
  }
  applications: {
    dataScopeCollection: DataScopeCollection
  }
  middleware: {
    items: MiddlewareDefinition[]
  }
  dataFlows: unknown[]
}

export const defaultTopLevels: TopLevelDefinition[] = [
  {
    id: 'canonical-model',
    label: 'Canonical Model',
    children: [
      { id: 'record-types', label: 'Record Types' },
      { id: 'data-types', label: 'Data Types' },
      {
        id: 'serialized',
        label: 'Serialized',
        children: [
          {
            id: 'api-payloads',
            label: 'API Payloads',
            children: [
              { id: 'request-from-source', label: 'Request From Source' },
            ],
          },
          {
            id: 'middleware-canonical',
            label: 'Middleware Payloads',
            children: [
              { id: 'from-source', label: 'From Source' },
              { id: 'middleware-serialized', label: 'Middleware' },
              { id: 'to-target', label: 'To Target' },
            ],
          },
          {
            id: 'client-payloads',
            label: 'CLIENT Payloads',
            children: [
              { id: 'response-from-source', label: 'Response From Source' },
              { id: 'request-to-target', label: 'Request To Target' },
            ],
          },
        ],
      },
    ],
  },
  { id: 'applications', label: 'Applications' },
  { id: 'middleware', label: 'Middleware' },
  { id: 'data-flows', label: 'Data Flows' },
]

export const basicJsonDataTypes = ['string', 'number', 'boolean', 'object', 'array', 'null']

export const createRootRecordType = (): RecordType => ({
  definitionId: rootRecordTypeDefinitionId,
  name: 'Record',
  kind: 'social',
  attributes: [],
  relationshipAttributes: [],
  children: [],
  subtypes: [],
})

export const createEmptyWorkspace = (): Workspace => ({
  schemaVersion: workspaceSchemaVersion,
  topLevels: structuredClone(defaultTopLevels),
  recordTypes: {
    root: createRootRecordType(),
    categories: [],
  },
  dataTypes: {
    basic: [...basicJsonDataTypes],
    stringSubtypes: [],
  },
  applications: {
    dataScopeCollection: {
      definitionId: dataScopeCollectionDefinitionId,
      name: 'Data Scopes',
      items: [],
    },
  },
  middleware: { items: [] },
  dataFlows: [],
})
