import type { Category } from '../models/category'
import type { RecordType } from '../models/record-type'

export const workspaceSchemaVersion = 9 as const
export const rootRecordTypeDefinitionId = '__record__'
export const recordTypeIdAttributeDefinitionId = '__record_type_id__'
export const dataScopeCollectionDefinitionId = '__data_scopes__'

export interface DataScope {
  definitionId: string
  name: string
  categories: DataScopeCategory[]
}

export interface ApiDefinition {
  definitionId: string
  name: string
  source: {
    kind: 'wsdl'
    fileName: string
    document: string
  }
  model: WsdlApiModel
}

export interface WsdlConstraint {
  kind: string
  value: string
}

export interface WsdlSchemaField {
  path: string
  name: string
  qname: string
  nodeKind: 'element' | 'attribute'
  type?: string
  primitiveType?: string
  minOccurs: number
  maxOccurs: number | 'unbounded'
  required: boolean
  nullable: boolean
  repeated: boolean
  compositor?: 'sequence' | 'choice' | 'all'
  defaultValue?: string
  fixedValue?: string
  documentation?: string
  constraints: WsdlConstraint[]
}

export interface WsdlContract {
  operationName: string
  direction: 'input' | 'output' | 'fault'
  message?: string
  rootElement?: string
  fields: WsdlSchemaField[]
}

export interface WsdlApiModel {
  version: '1.1' | '2.0'
  targetNamespace: string
  services: Array<{ name: string }>
  endpoints: Array<{
    serviceName: string
    portName: string
    binding: string
    protocol: 'soap11' | 'soap12' | 'unknown'
    address: string
  }>
  bindings: Array<{
    name: string
    interface: string
    protocol: 'soap11' | 'soap12' | 'unknown'
    transport?: string
    style?: string
  }>
  operations: Array<{
    name: string
    interface: string
    inputMessage?: string
    outputMessage?: string
    faults: string[]
    oneWay: boolean
    bindings: Array<{
      binding: string
      protocol: 'soap11' | 'soap12' | 'unknown'
      soapAction?: string
      style?: string
      bodyUse?: string
    }>
  }>
  messages: Array<{
    name: string
    parts: Array<{ name: string; element?: string; type?: string }>
  }>
  policies: string[]
  schema: {
    namespaces: string[]
    elements: Array<{ qname: string; type?: string; documentation?: string }>
    complexTypes: Array<{ qname: string; base?: string; documentation?: string }>
    simpleTypes: Array<{
      qname: string
      base?: string
      primitiveType?: string
      documentation?: string
      constraints: WsdlConstraint[]
    }>
  }
  contracts: WsdlContract[]
}

export const createEmptyWsdlApiModel = (): WsdlApiModel => ({
  version: '1.1',
  targetNamespace: '',
  services: [],
  endpoints: [],
  bindings: [],
  operations: [],
  messages: [],
  policies: [],
  schema: { namespaces: [], elements: [], complexTypes: [], simpleTypes: [] },
  contracts: [],
})

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

export interface MiddlewareDefinition {
  definitionId: string
  name: string
  categories: MiddlewareCategory[]
}

export interface MiddlewareApiCategory {
  definitionId: string
  name: 'APIs'
  kind: 'apis'
  items: ApiDefinition[]
}

export interface MiddlewareClientCategory {
  definitionId: string
  name: 'CLIENTs'
  kind: 'clients'
  items: ApiDefinition[]
}

export type PipelineDataTypeReference =
  | { kind: 'recordType'; definitionId: string }
  | {
      kind: 'contract'
      ownerKind: 'api' | 'client'
      ownerDefinitionId: string
      operationName: string
      direction: WsdlContract['direction']
      rootElement?: string
      message?: string
    }

export type PipelineTransformMappingKind = 'loop' | 'object' | 'field'

export interface PipelineTransformMapping {
  definitionId: string
  kind: PipelineTransformMappingKind
  sourcePath: string
  targetPath: string
  mappings: PipelineTransformMapping[]
}

export interface PipelineDefinition {
  definitionId: string
  name: string
  source?: PipelineDataTypeReference
  target?: PipelineDataTypeReference
  transform: {
    mappings: PipelineTransformMapping[]
  }
}

export interface MiddlewarePipelineCategory {
  definitionId: string
  name: 'PIPELINES'
  kind: 'pipelines'
  items: PipelineDefinition[]
}

export type MiddlewareCategory = MiddlewareApiCategory | MiddlewareClientCategory | MiddlewarePipelineCategory

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
    dataScopeCollection: DataScopeCollection
  }
  middleware: {
    items: MiddlewareDefinition[]
  }
  dataFlows: unknown[]
}

export const defaultTopLevels: TopLevelDefinition[] = [
  { id: 'record-types', label: 'Record Types' },
  { id: 'data-types', label: 'Data Types' },
  { id: 'applications', label: 'Applications' },
  { id: 'middleware', label: 'Middleware' },
  { id: 'data-flows', label: 'Data Flows' },
]

export const basicJsonDataTypes = ['string', 'number', 'boolean', 'object', 'array', 'null']

export const createDataScopeCategories = (dataScopeDefinitionId: string): DataScopeCategory[] => [
  { definitionId: `${dataScopeDefinitionId}:apis`, name: 'APIs', kind: 'apis', items: [] },
  { definitionId: `${dataScopeDefinitionId}:clients`, name: 'CLIENTs', kind: 'clients', items: [] },
]

export const createMiddlewareCategories = (middlewareDefinitionId: string): MiddlewareCategory[] => [
  { definitionId: `${middlewareDefinitionId}:apis`, name: 'APIs', kind: 'apis', items: [] },
  { definitionId: `${middlewareDefinitionId}:clients`, name: 'CLIENTs', kind: 'clients', items: [] },
  { definitionId: `${middlewareDefinitionId}:pipelines`, name: 'PIPELINES', kind: 'pipelines', items: [] },
]

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
