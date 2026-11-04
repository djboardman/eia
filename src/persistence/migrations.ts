import type { Category } from '../models/category'
import type {
  AttributeDefinition,
  RecordType,
  RecordTypeKind,
  RelationshipAttributeDefinition,
} from '../models/record-type'
import {
  createEmptyWorkspace,
  rootRecordTypeDefinitionId,
  workspaceSchemaVersion,
  type StringDataTypeSubtype,
  type Workspace,
} from '../domain/workspace'
import { dataTypeDefinitionIdForLegacyName } from '../domain/data-types'

type JsonObject = Record<string, unknown>
type StoredAttribute = Partial<AttributeDefinition> & { dataType?: string }

const isObject = (value: unknown): value is JsonObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const asArray = (value: unknown) => Array.isArray(value) ? value : []
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const recordTypeKinds: RecordTypeKind[] = ['social', 'physical', 'countsAs']

export const normalizeStringSubtypes = (value: unknown): StringDataTypeSubtype[] => asArray(value)
  .filter(isObject)
  .map((subtype) => ({
    definitionId: asString(subtype.definitionId, crypto.randomUUID()),
    name: asString(subtype.name),
    pattern: asString(subtype.pattern),
    example: asString(subtype.example),
    description: asString(subtype.description),
  }))
  .filter(({ name }) => Boolean(name))

export const normalizeRecordType = (
  value: unknown,
  stringSubtypes: StringDataTypeSubtype[] = [],
): RecordType => {
  if (!isObject(value)) throw new Error('Invalid record type.')
  const attributes = asArray(value.attributes).filter(isObject).map((attribute): AttributeDefinition => {
    const stored = attribute as StoredAttribute
    return {
      definitionId: asString(stored.definitionId, crypto.randomUUID()),
      name: asString(stored.name),
      dataTypeDefinitionId: asString(stored.dataTypeDefinitionId) || dataTypeDefinitionIdForLegacyName(
        asString(stored.dataType, 'string'),
        stringSubtypes,
      ),
      nullable: typeof stored.nullable === 'boolean' ? stored.nullable : true,
    }
  })
  const relationships = asArray(value.relationshipAttributes).filter(isObject).map(
    (relationship): RelationshipAttributeDefinition => ({
      definitionId: asString(relationship.definitionId, crypto.randomUUID()),
      recordTypeDefinitionId: asString(relationship.recordTypeDefinitionId),
      role: asString(relationship.role) || undefined,
      attributeDefinitionId: asString(relationship.attributeDefinitionId),
    }),
  )
  return {
    definitionId: asString(value.definitionId) || asString(value.id, crypto.randomUUID()),
    name: asString(value.name),
    kind: recordTypeKinds.includes(value.kind as RecordTypeKind) ? value.kind as RecordTypeKind : 'social',
    attributes,
    relationshipAttributes: relationships,
    children: asArray(value.children).map((child) => normalizeRecordType(child, stringSubtypes)),
    subtypes: asArray(value.subtypes).map((subtype) => normalizeRecordType(subtype, stringSubtypes)),
  }
}

export const migrateWorkspace = (value: unknown): Workspace => {
  if (!isObject(value)) throw new Error('Workspace must be a JSON object.')
  const version = Number(value.schemaVersion ?? 1)
  if (version < 1 || version > workspaceSchemaVersion) throw new Error(`Unsupported workspace schema version: ${version}.`)
  if (!isObject(value.recordTypes) || !isObject(value.dataTypes)) throw new Error('Workspace recordTypes and dataTypes are required.')

  const empty = createEmptyWorkspace()
  const stringSubtypes = normalizeStringSubtypes(value.dataTypes.stringSubtypes)
  const categories: Category[] = asArray(value.recordTypes.categories).filter(isObject).map((category) => ({
    id: asString(category.id, crypto.randomUUID()),
    name: asString(category.name),
    recordTypes: asArray(category.recordTypes).map((recordType) => normalizeRecordType(recordType, stringSubtypes)),
  }))
  const root = normalizeRecordType(value.recordTypes.root ?? empty.recordTypes.root, stringSubtypes)
  const applications = isObject(value.applications) ? value.applications : {}
  const topLevels = asArray(value.topLevels).filter(isObject).map((level) => ({
    id: asString(level.id),
    label: asString(level.label),
  })).filter(({ id, label }) => Boolean(id && label))

  return {
    schemaVersion: workspaceSchemaVersion,
    topLevels: topLevels.length ? topLevels : empty.topLevels,
    recordTypes: {
      root: { ...root, definitionId: rootRecordTypeDefinitionId, name: 'Record', children: [], subtypes: [] },
      categories,
    },
    dataTypes: {
      basic: asArray(value.dataTypes.basic).filter((item): item is string => typeof item === 'string').length
        ? asArray(value.dataTypes.basic).filter((item): item is string => typeof item === 'string')
        : empty.dataTypes.basic,
      stringSubtypes,
    },
    applications: {
      dataScopes: asArray(applications.dataScopes).filter(isObject).map((scope) => ({
        definitionId: asString(scope.definitionId, crypto.randomUUID()),
        name: asString(scope.name),
      })).filter(({ name }) => Boolean(name)),
    },
    dataFlows: asArray(value.dataFlows),
  }
}
