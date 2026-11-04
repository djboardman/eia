import type { Category } from '../models/category'
import type { RecordType } from '../models/record-type'

export const workspaceSchemaVersion = 3 as const
export const rootRecordTypeDefinitionId = '__record__'
export const recordTypeIdAttributeDefinitionId = '__record_type_id__'

export interface DataScope {
  definitionId: string
  name: string
}

export interface StringDataTypeSubtype {
  definitionId: string
  name: string
  pattern: string
  example: string
  description: string
}

export interface TopLevelDefinition {
  id: string
  label: string
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
    dataScopes: DataScope[]
  }
  dataFlows: unknown[]
}

export const defaultTopLevels: TopLevelDefinition[] = [
  { id: 'record-types', label: 'Record Types' },
  { id: 'data-types', label: 'Data Types' },
  { id: 'applications', label: 'Applications' },
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
    dataScopes: [],
  },
  dataFlows: [],
})
