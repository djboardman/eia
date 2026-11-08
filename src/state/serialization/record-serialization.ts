import type { RecordType, RelationshipAttributeDefinition } from '../../domain/record-types'
import type { Workspace } from '../../domain/workspace'
import {
  findRecordType,
  lowestSubtypeRecordTypes,
  resolveRelationshipAttribute,
} from '../selectors'

export const recordSerializationPaths = {
  dataObject: 'data',
  dataArray: 'data[]',
  field: (dataPath: string, name: string) => `${dataPath}.${name}`,
  attributes: (dataPath: string) => `${dataPath}.attributes`,
  attribute: (dataPath: string, name: string) => `${dataPath}.attributes.${name}`,
  included: 'included[]',
} as const

export const serializedRelationshipAttributeName = (
  recordTypeName: string,
  role: string | undefined,
  attributeName: string,
) => {
  const normalizedRole = role?.trim()
  const roleAttributeName = normalizedRole
    ? `${normalizedRole}${attributeName.charAt(0).toUpperCase()}${attributeName.slice(1)}`
    : attributeName
  return `${recordTypeName}_${roleAttributeName}`
}

export const serializeRelationshipAttribute = (
  workspace: Workspace,
  relationship: RelationshipAttributeDefinition,
) => {
  const sourceRecordType = findRecordType(workspace, relationship.recordTypeDefinitionId)
  const sourceAttribute = resolveRelationshipAttribute(workspace, relationship)
  if (!sourceRecordType || !sourceAttribute) return undefined
  return {
    ...sourceAttribute,
    name: serializedRelationshipAttributeName(sourceRecordType.name, relationship.role, sourceAttribute.name),
  }
}

export const serializedAttributesFor = (workspace: Workspace, recordType: RecordType) => [
  ...recordType.attributes,
  ...recordType.relationshipAttributes.flatMap((relationship) => {
    const attribute = serializeRelationshipAttribute(workspace, relationship)
    return attribute ? [attribute] : []
  }),
]

export const childRecordTypesForSerialization = (recordType: RecordType) => recordType.children.flatMap((child) =>
  lowestSubtypeRecordTypes(child).map((included) => ({
    recordType: included,
    relationship: included === child ? 'child' as const : 'subtype' as const,
  })),
)

export const allChildRecordTypesForSerialization = (recordType: RecordType): RecordType[] => {
  const direct = childRecordTypesForSerialization(recordType).map(({ recordType: included }) => included)
  return [...new Map(direct
    .flatMap((included) => [included, ...allChildRecordTypesForSerialization(included)])
    .map((included) => [included.definitionId, included])).values()]
}
