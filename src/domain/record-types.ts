export type AttributeDataType = string
export type RecordTypeKind = 'social' | 'physical' | 'countsAs'

export interface AttributeDefinition {
  definitionId: string
  name: string
  dataTypeDefinitionId: string
  nullable: boolean
}

export interface RelationshipAttributeDefinition {
  definitionId: string
  recordTypeDefinitionId: string
  role?: string
  attributeDefinitionId: string
}

export interface RecordType {
  definitionId: string
  name: string
  kind: RecordTypeKind
  attributes: AttributeDefinition[]
  relationshipAttributes: RelationshipAttributeDefinition[]
  children: RecordType[]
  subtypes: RecordType[]
}

export interface Category {
  id: string
  name: string
  recordTypes: RecordType[]
}
