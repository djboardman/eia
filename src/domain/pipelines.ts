import type { ApiDefinition, WsdlContract } from './contracts'

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
  transform: { mappings: PipelineTransformMapping[] }
}

export interface MiddlewarePipelineCategory {
  definitionId: string
  name: 'PIPELINES'
  kind: 'pipelines'
  items: PipelineDefinition[]
}

export type MiddlewareCategory = MiddlewareApiCategory | MiddlewareClientCategory | MiddlewarePipelineCategory

export const createMiddlewareCategories = (middlewareDefinitionId: string): MiddlewareCategory[] => [
  { definitionId: `${middlewareDefinitionId}:apis`, name: 'APIs', kind: 'apis', items: [] },
  { definitionId: `${middlewareDefinitionId}:clients`, name: 'CLIENTs', kind: 'clients', items: [] },
  { definitionId: `${middlewareDefinitionId}:pipelines`, name: 'PIPELINES', kind: 'pipelines', items: [] },
]
