import { migrateWorkspace } from '../persistence/migrations'
import type { WorkspaceCommand } from './commands'

type JsonObject = Record<string, unknown>

const isObject = (value: unknown): value is JsonObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const requireString = (value: unknown, field: string) => {
  if (typeof value !== 'string' || !value) throw new Error(`Command ${field} must be a non-empty string.`)
}

function requireObject(value: unknown, field: string): asserts value is JsonObject {
  if (!isObject(value)) throw new Error(`Command ${field} must be an object.`)
}

const requireAllowedKeys = (value: JsonObject, allowed: string[]) => {
  const unexpected = Object.keys(value).find((key) => !allowed.includes(key))
  if (unexpected) throw new Error(`Command changes contains unsupported field: ${unexpected}.`)
}

const requireOptionalString = (value: JsonObject, field: string) => {
  if (value[field] !== undefined && typeof value[field] !== 'string') {
    throw new Error(`Command changes.${field} must be a string.`)
  }
}

export const parseWorkspaceCommand = (value: unknown): WorkspaceCommand => {
  if (!isObject(value)) throw new Error('Change journal command must be an object.')
  requireString(value.type, 'type')

  switch (value.type) {
    case 'category.create':
      requireString(value.definitionId, 'definitionId')
      requireString(value.name, 'name')
      break
    case 'category.rename':
    case 'recordType.rename':
    case 'stringSubtype.update':
    case 'dataScope.rename':
      requireString(value.definitionId, 'definitionId')
      if (value.type === 'stringSubtype.update') {
        requireObject(value.changes, 'changes')
        requireAllowedKeys(value.changes, ['name', 'pattern', 'example', 'description'])
        for (const field of ['name', 'pattern', 'example', 'description']) requireOptionalString(value.changes, field)
      } else requireString(value.name, 'name')
      break
    case 'category.delete':
    case 'recordType.delete':
    case 'stringSubtype.delete':
    case 'dataScope.delete':
      requireString(value.definitionId, 'definitionId')
      break
    case 'recordType.create':
      requireString(value.definitionId, 'definitionId')
      requireString(value.parentId, 'parentId')
      requireString(value.name, 'name')
      if (!['category', 'children', 'subtypes'].includes(String(value.parentKind))) {
        throw new Error('Command parentKind is invalid.')
      }
      break
    case 'recordType.setKind':
      requireString(value.definitionId, 'definitionId')
      if (!['social', 'physical', 'countsAs'].includes(String(value.kind))) {
        throw new Error('Command kind is invalid.')
      }
      break
    case 'stringSubtype.create':
    case 'dataScope.create':
      requireString(value.definitionId, 'definitionId')
      requireString(value.name, 'name')
      break
    case 'attribute.add':
    case 'attribute.delete':
    case 'relationshipAttribute.add':
    case 'relationshipAttribute.delete':
      requireString(value.recordTypeDefinitionId, 'recordTypeDefinitionId')
      requireString(value.definitionId, 'definitionId')
      break
    case 'attribute.update':
      requireString(value.recordTypeDefinitionId, 'recordTypeDefinitionId')
      requireString(value.definitionId, 'definitionId')
      requireObject(value.changes, 'changes')
      requireAllowedKeys(value.changes, ['name', 'dataTypeDefinitionId', 'nullable'])
      requireOptionalString(value.changes, 'name')
      requireOptionalString(value.changes, 'dataTypeDefinitionId')
      if (value.changes.nullable !== undefined && typeof value.changes.nullable !== 'boolean') {
        throw new Error('Command changes.nullable must be a boolean.')
      }
      break
    case 'relationshipAttribute.update':
      requireString(value.recordTypeDefinitionId, 'recordTypeDefinitionId')
      requireString(value.definitionId, 'definitionId')
      requireObject(value.changes, 'changes')
      requireAllowedKeys(value.changes, ['recordTypeDefinitionId', 'attributeDefinitionId', 'role'])
      requireOptionalString(value.changes, 'recordTypeDefinitionId')
      requireOptionalString(value.changes, 'attributeDefinitionId')
      requireOptionalString(value.changes, 'role')
      break
    case 'attribute.move':
      requireString(value.recordTypeDefinitionId, 'recordTypeDefinitionId')
      requireString(value.definitionId, 'definitionId')
      requireString(value.beforeDefinitionId, 'beforeDefinitionId')
      break
    case 'workspace.replace':
      return { type: 'workspace.replace', workspace: migrateWorkspace(value.workspace) }
    default:
      throw new Error(`Unsupported workspace command: ${String(value.type)}.`)
  }

  return structuredClone(value) as WorkspaceCommand
}
