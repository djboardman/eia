import { createEmptyWsdlApiModel } from '../domain/workspace'
import { migrateWorkspace } from '../persistence/migrations'
import { parseWsdl } from '../ui/wsdl-import'
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

const requireTransformMappings = (value: unknown) => {
  if (!Array.isArray(value)) throw new Error('Command changes.transform.mappings must be an array.')
  for (const mapping of value) {
    requireObject(mapping, 'changes.transform.mapping')
    requireString(mapping.definitionId, 'mapping.definitionId')
    if (!['loop', 'object', 'field'].includes(String(mapping.kind))) {
      throw new Error('Command transform mapping kind is invalid.')
    }
    if (typeof mapping.sourcePath !== 'string' || typeof mapping.targetPath !== 'string') {
      throw new Error('Command transform mapping paths must be strings.')
    }
    requireTransformMappings(mapping.mappings)
  }
}

const normalizeTransformMappings = (value: unknown): JsonObject[] => Array.isArray(value)
  ? value.filter(isObject).map((mapping) => ({
      definitionId: mapping.definitionId,
      kind: ['loop', 'object', 'field'].includes(String(mapping.kind)) ? mapping.kind : 'loop',
      sourcePath: mapping.sourcePath,
      targetPath: mapping.targetPath,
      mappings: normalizeTransformMappings(mapping.mappings ?? mapping.loops),
    }))
  : []

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
    case 'middleware.rename':
    case 'pipeline.rename':
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
    case 'middleware.delete':
    case 'pipeline.delete':
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
    case 'middleware.create':
      requireString(value.definitionId, 'definitionId')
      requireString(value.name, 'name')
      break
    case 'pipeline.create':
      requireString(value.middlewareDefinitionId, 'middlewareDefinitionId')
      requireString(value.definitionId, 'definitionId')
      requireString(value.name, 'name')
      break
    case 'pipeline.update':
      requireString(value.definitionId, 'definitionId')
      requireObject(value.changes, 'changes')
      requireAllowedKeys(value.changes, ['source', 'target', 'transform'])
      for (const field of ['source', 'target']) {
        const reference = value.changes[field]
        if (reference === undefined) continue
        requireObject(reference, `changes.${field}`)
        if (reference.kind === 'recordType') {
          requireString(reference.definitionId, `${field}.definitionId`)
        } else if (reference.kind === 'contract') {
          requireString(reference.ownerKind, `${field}.ownerKind`)
          requireString(reference.ownerDefinitionId, `${field}.ownerDefinitionId`)
          requireString(reference.operationName, `${field}.operationName`)
          requireString(reference.direction, `${field}.direction`)
        } else throw new Error(`Command changes.${field}.kind is invalid.`)
      }
      if (value.changes.transform !== undefined) {
        requireObject(value.changes.transform, 'changes.transform')
        const mappings = normalizeTransformMappings(
          value.changes.transform.mappings ?? value.changes.transform.loops,
        )
        requireTransformMappings(mappings)
        return {
          ...structuredClone(value),
          changes: {
            ...structuredClone(value.changes),
            transform: { mappings },
          },
        } as unknown as WorkspaceCommand
      }
      break
    case 'api.importWsdl':
      requireString(value.dataScopeDefinitionId, 'dataScopeDefinitionId')
      requireString(value.categoryDefinitionId, 'categoryDefinitionId')
      requireString(value.definitionId, 'definitionId')
      requireString(value.name, 'name')
      requireString(value.fileName, 'fileName')
      requireString(value.document, 'document')
      if (value.model === undefined) {
        let model = createEmptyWsdlApiModel()
        try {
          model = parseWsdl(String(value.document), String(value.fileName)).model
        } catch {
          // Preserve legacy journal entries even if their original WSDL is no longer parseable.
        }
        return {
          ...structuredClone(value),
          model,
        } as WorkspaceCommand
      }
      requireObject(value.model, 'model')
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
