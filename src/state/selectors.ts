import { recordTypeIdAttributeDefinitionId, rootRecordTypeDefinitionId, type Workspace } from '../domain/workspace'
import type { AttributeDefinition, RecordType, RelationshipAttributeDefinition } from '../domain/record-types'
import { basicDataTypeDefinitionId } from '../domain/data-types'

export interface RecordTypeContext {
  recordType: RecordType
  inheritedFrom: RecordType[]
  parentRecordType?: RecordType
}

export const findRecordTypeContext = (
  workspace: Workspace,
  definitionId: string,
): RecordTypeContext | undefined => {
  const root = workspace.recordTypes.root
  const findIn = (
    recordTypes: RecordType[],
    inheritedFrom: RecordType[],
    parentRecordType?: RecordType,
  ): RecordTypeContext | undefined => {
    for (const recordType of recordTypes) {
      if (recordType.definitionId === definitionId) return { recordType, inheritedFrom, parentRecordType }
      const child = findIn(recordType.children, [root], recordType)
      if (child) return child
      const subtype = findIn(recordType.subtypes, [...inheritedFrom, recordType], parentRecordType)
      if (subtype) return subtype
    }
    return undefined
  }
  if (definitionId === rootRecordTypeDefinitionId) return { recordType: root, inheritedFrom: [] }
  for (const category of workspace.recordTypes.categories) {
    const context = findIn(category.recordTypes, [root])
    if (context) return context
  }
  return undefined
}

export const findRecordType = (workspace: Workspace, definitionId: string) =>
  findRecordTypeContext(workspace, definitionId)?.recordType

export const getAllRecordTypes = (workspace: Workspace) => {
  const recordTypes: RecordType[] = [workspace.recordTypes.root]
  const visit = (items: RecordType[]) => {
    for (const item of items) {
      recordTypes.push(item)
      visit(item.children)
      visit(item.subtypes)
    }
  }
  for (const category of workspace.recordTypes.categories) visit(category.recordTypes)
  return recordTypes
}

export const resolveRelationshipAttribute = (
  workspace: Workspace,
  relationship: RelationshipAttributeDefinition,
): AttributeDefinition | undefined => {
  const sourceRecordType = findRecordType(workspace, relationship.recordTypeDefinitionId)
  const sourceAttribute = relationship.attributeDefinitionId === recordTypeIdAttributeDefinitionId
    ? {
        definitionId: recordTypeIdAttributeDefinitionId,
        name: 'id',
        dataTypeDefinitionId: basicDataTypeDefinitionId('string'),
        nullable: false,
      }
    : sourceRecordType?.attributes.find(({ definitionId }) => definitionId === relationship.attributeDefinitionId)
  if (!sourceRecordType || !sourceAttribute) return undefined
  return {
    ...sourceAttribute,
    definitionId: relationship.definitionId,
    name: sourceAttribute.name,
  }
}

export const resolvedAttributesFor = (workspace: Workspace, recordType: RecordType) => [
  ...recordType.attributes,
  ...recordType.relationshipAttributes.flatMap((relationship) => {
    const attribute = resolveRelationshipAttribute(workspace, relationship)
    return attribute ? [attribute] : []
  }),
]

export const lowestSubtypeRecordTypes = (recordType: RecordType): RecordType[] =>
  recordType.subtypes.length === 0
    ? [recordType]
    : recordType.subtypes.flatMap(lowestSubtypeRecordTypes)

export const relationshipReferenceCount = (workspace: Workspace, attributeDefinitionId: string) =>
  getAllRecordTypes(workspace).reduce(
    (count, recordType) => count + recordType.relationshipAttributes.filter(
      (relationship) => relationship.attributeDefinitionId === attributeDefinitionId,
    ).length,
    0,
  )

export const recordTypeExternalReferenceCount = (workspace: Workspace, recordType: RecordType) => {
  const subtreeIds = new Set<string>()
  const collect = (item: RecordType) => {
    subtreeIds.add(item.definitionId)
    item.children.forEach(collect)
    item.subtypes.forEach(collect)
  }
  collect(recordType)
  return getAllRecordTypes(workspace).reduce((count, item) => {
    if (subtreeIds.has(item.definitionId)) return count
    return count + item.relationshipAttributes.filter(
      ({ recordTypeDefinitionId }) => subtreeIds.has(recordTypeDefinitionId),
    ).length
  }, 0)
}

export const dataTypeReferenceCount = (workspace: Workspace, dataTypeDefinitionId: string) =>
  getAllRecordTypes(workspace).reduce(
    (count, recordType) => count + recordType.attributes.filter(
      (attribute) => attribute.dataTypeDefinitionId === dataTypeDefinitionId,
    ).length,
    0,
  )
