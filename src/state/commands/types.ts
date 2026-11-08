import type { AttributeDefinition, RecordType, RecordTypeKind } from '../../domain/record-types'
import type {
  PipelineDataTypeReference,
  PipelineTransformMapping,
  StringDataTypeSubtype,
  Workspace,
  WsdlApiModel,
} from '../../domain/workspace'

export type RecordTypeParentKind = 'category' | 'children' | 'subtypes'
type StringSubtypeChanges = Partial<Omit<StringDataTypeSubtype, 'definitionId'>>
type AttributeChanges = Partial<Pick<AttributeDefinition, 'name' | 'dataTypeDefinitionId' | 'nullable'>>
type PipelineChanges = Partial<{
  source: PipelineDataTypeReference | undefined
  target: PipelineDataTypeReference | undefined
  transform: { mappings: PipelineTransformMapping[] }
}>

export type WorkspaceCommand =
  | { type: 'category.create'; definitionId: string; name: string }
  | { type: 'category.rename'; definitionId: string; name: string }
  | { type: 'category.delete'; definitionId: string }
  | { type: 'recordType.create'; definitionId: string; parentKind: RecordTypeParentKind; parentId: string; name: string }
  | { type: 'recordType.rename'; definitionId: string; name: string }
  | { type: 'recordType.setKind'; definitionId: string; kind: RecordTypeKind }
  | { type: 'recordType.delete'; definitionId: string }
  | { type: 'stringSubtype.create'; definitionId: string; name: string }
  | { type: 'stringSubtype.update'; definitionId: string; changes: StringSubtypeChanges }
  | { type: 'stringSubtype.delete'; definitionId: string }
  | { type: 'dataScope.create'; definitionId: string; name: string }
  | { type: 'dataScope.rename'; definitionId: string; name: string }
  | { type: 'dataScope.delete'; definitionId: string }
  | { type: 'middleware.create'; definitionId: string; name: string }
  | { type: 'middleware.rename'; definitionId: string; name: string }
  | { type: 'middleware.delete'; definitionId: string }
  | { type: 'pipeline.create'; middlewareDefinitionId: string; definitionId: string; name: string }
  | { type: 'pipeline.rename'; definitionId: string; name: string }
  | { type: 'pipeline.update'; definitionId: string; changes: PipelineChanges }
  | { type: 'pipeline.delete'; definitionId: string }
  | {
      type: 'api.importWsdl'
      dataScopeDefinitionId: string
      categoryDefinitionId: string
      definitionId: string
      name: string
      fileName: string
      document: string
      model: WsdlApiModel
    }
  | { type: 'attribute.add'; recordTypeDefinitionId: string; definitionId: string }
  | { type: 'attribute.update'; recordTypeDefinitionId: string; definitionId: string; changes: AttributeChanges }
  | { type: 'attribute.delete'; recordTypeDefinitionId: string; definitionId: string }
  | { type: 'attribute.move'; recordTypeDefinitionId: string; definitionId: string; beforeDefinitionId: string }
  | { type: 'relationshipAttribute.add'; recordTypeDefinitionId: string; definitionId: string }
  | {
      type: 'relationshipAttribute.update'
      recordTypeDefinitionId: string
      definitionId: string
      changes: Partial<Pick<
        RecordType['relationshipAttributes'][number],
        'recordTypeDefinitionId' | 'attributeDefinitionId' | 'role'
      >>
    }
  | { type: 'relationshipAttribute.delete'; recordTypeDefinitionId: string; definitionId: string }
  | { type: 'workspace.replace'; workspace: Workspace }

export interface WorkspaceCommandResult {
  changed: boolean
  definitionId?: string
}

export type RecordTypeCommand = Extract<WorkspaceCommand, {
  type: 'category.create' | 'category.rename' | 'category.delete'
    | 'recordType.create' | 'recordType.rename' | 'recordType.setKind' | 'recordType.delete'
    | 'attribute.add' | 'attribute.update' | 'attribute.delete' | 'attribute.move'
    | 'relationshipAttribute.add' | 'relationshipAttribute.update' | 'relationshipAttribute.delete'
}>
export type DataTypeCommand = Extract<WorkspaceCommand, { type: `stringSubtype.${string}` }>
export type ApplicationCommand = Extract<WorkspaceCommand, { type: `dataScope.${string}` | 'api.importWsdl' }>
export type MiddlewareCommand = Extract<WorkspaceCommand, { type: `middleware.${string}` | `pipeline.${string}` }>
