import type {
  AttributeDefinition,
  Category,
  RecordType,
  RecordTypeKind,
  RelationshipAttributeDefinition,
} from '../domain/record-types'
import {
  createEmptyWorkspace,
  createDataScopeCategories,
  createMiddlewareCategories,
  createEmptyWsdlApiModel,
  dataScopeCollectionDefinitionId,
  rootRecordTypeDefinitionId,
  workspaceSchemaVersion,
  type DataScopeCategory,
  type MiddlewareCategory,
  type PipelineDataTypeReference,
  type PipelineTransformMapping,
  type StringDataTypeSubtype,
  type TopLevelDefinition,
  type Workspace,
  type WsdlApiModel,
} from '../domain/workspace'
import { dataTypeDefinitionIdForLegacyName } from '../domain/data-types'
import { parseWsdl } from '../integrations/wsdl/parser'
import { applyWorkspaceMigrationSteps } from './workspace-migration-steps'

type JsonObject = Record<string, unknown>
type StoredAttribute = Partial<AttributeDefinition> & { dataType?: string }

const isObject = (value: unknown): value is JsonObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const asArray = (value: unknown) => Array.isArray(value) ? value : []
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value : fallback
const recordTypeKinds: RecordTypeKind[] = ['social', 'physical', 'countsAs']

const normalizeTopLevels = (value: unknown): TopLevelDefinition[] => asArray(value)
  .filter(isObject)
  .map((level) => {
    const children = normalizeTopLevels(level.children)
    return {
      id: asString(level.id),
      label: asString(level.label),
      ...(children.length ? { children } : {}),
    }
  })
  .filter(({ id, label }) => Boolean(id && label))

const normalizeWsdlModel = (api: JsonObject, source: JsonObject): WsdlApiModel => {
  if (isObject(api.model)) {
    const hasExtractedContent = Boolean(
      asString(api.model.targetNamespace)
      || asArray(api.model.services).length
      || asArray(api.model.operations).length
      || asArray(api.model.contracts).length,
    )
    if (hasExtractedContent) return structuredClone(api.model) as unknown as WsdlApiModel
  }
  try {
    return parseWsdl(asString(source.document), asString(source.fileName)).model
  } catch {
    return createEmptyWsdlApiModel()
  }
}

const normalizeWsdlDefinitions = (value: unknown) => asArray(value).filter(isObject).map((api) => {
  const source = isObject(api.source) ? api.source : {}
  return {
    definitionId: asString(api.definitionId, crypto.randomUUID()),
    name: asString(api.name),
    source: {
      kind: 'wsdl' as const,
      fileName: asString(source.fileName),
      document: asString(source.document),
    },
    model: normalizeWsdlModel(api, source),
  }
}).filter(({ name, source }) => Boolean(name && source.document))

const normalizeDataScopeCategories = (dataScopeDefinitionId: string, value: unknown): DataScopeCategory[] => {
  const categories = asArray(value).filter(isObject)
  if (!categories.length) return createDataScopeCategories(dataScopeDefinitionId)

  return categories.map((category): DataScopeCategory => {
    if (category.kind === 'clients') {
      return {
        definitionId: asString(category.definitionId, `${dataScopeDefinitionId}:clients`),
        name: 'CLIENTs',
        kind: 'clients',
        items: normalizeWsdlDefinitions(category.items),
      }
    }
    return {
      definitionId: asString(category.definitionId, `${dataScopeDefinitionId}:apis`),
      name: 'APIs',
      kind: 'apis',
      items: normalizeWsdlDefinitions(category.items),
    }
  })
}

const normalizePipelineReference = (value: unknown): PipelineDataTypeReference | undefined => {
  if (!isObject(value)) return undefined
  if (value.kind === 'recordType') {
    const definitionId = asString(value.definitionId)
    return definitionId ? { kind: 'recordType', definitionId } : undefined
  }
  if (value.kind !== 'contract') return undefined
  const ownerKind = value.ownerKind === 'client' ? 'client' : 'api'
  const ownerDefinitionId = asString(value.ownerDefinitionId)
  const operationName = asString(value.operationName)
  const direction = ['input', 'output', 'fault'].includes(String(value.direction))
    ? value.direction as 'input' | 'output' | 'fault'
    : undefined
  if (!ownerDefinitionId || !operationName || !direction) return undefined
  return {
    kind: 'contract',
    ownerKind,
    ownerDefinitionId,
    operationName,
    direction,
    rootElement: asString(value.rootElement) || undefined,
    message: asString(value.message) || undefined,
  }
}

const normalizeTransformMappings = (value: unknown): PipelineTransformMapping[] => asArray(value)
  .filter(isObject)
  .map((loop) => ({
    definitionId: asString(loop.definitionId, crypto.randomUUID()),
    kind: loop.kind === 'object' || loop.kind === 'field' ? loop.kind : 'loop',
    sourcePath: asString(loop.sourcePath),
    targetPath: asString(loop.targetPath),
    mappings: normalizeTransformMappings(loop.mappings ?? loop.loops),
  }))

const normalizeMiddlewareCategories = (middlewareDefinitionId: string, value: unknown): MiddlewareCategory[] => {
  const categories = asArray(value).filter(isObject)
  if (!categories.length) return createMiddlewareCategories(middlewareDefinitionId)
  return createMiddlewareCategories(middlewareDefinitionId).map((fallback): MiddlewareCategory => {
    const stored = categories.find(({ kind }) => kind === fallback.kind)
    if (!stored) return fallback
    const definitionId = asString(stored.definitionId, fallback.definitionId)
    if (fallback.kind === 'pipelines') {
      return {
        ...fallback,
        definitionId,
        items: asArray(stored.items).filter(isObject).map((pipeline) => ({
          definitionId: asString(pipeline.definitionId, crypto.randomUUID()),
          name: asString(pipeline.name),
          source: normalizePipelineReference(pipeline.source),
          target: normalizePipelineReference(pipeline.target),
          transform: {
            mappings: normalizeTransformMappings(isObject(pipeline.transform)
              ? pipeline.transform.mappings ?? pipeline.transform.loops
              : undefined),
          },
        })).filter(({ name }) => Boolean(name)),
      }
    }
    return { ...fallback, definitionId, items: normalizeWsdlDefinitions(stored.items) }
  })
}

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
  value = applyWorkspaceMigrationSteps(value, version)
  if (!isObject(value)) throw new Error('Workspace migration produced invalid data.')
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
  const middleware = isObject(value.middleware) ? value.middleware : {}
  const storedDataScopeCollection = isObject(applications.dataScopeCollection)
    ? applications.dataScopeCollection
    : undefined
  const storedDataScopes = storedDataScopeCollection
    ? storedDataScopeCollection.items
    : applications.dataScopes
  const topLevels = normalizeTopLevels(value.topLevels)
  const normalizedTopLevels = topLevels.length ? topLevels : structuredClone(empty.topLevels)
  if (!normalizedTopLevels.some(({ id }) => id === 'middleware')) {
    const dataFlowsIndex = normalizedTopLevels.findIndex(({ id }) => id === 'data-flows')
    normalizedTopLevels.splice(dataFlowsIndex < 0 ? normalizedTopLevels.length : dataFlowsIndex, 0, {
      id: 'middleware',
      label: 'Middleware',
    })
  }

  return {
    schemaVersion: workspaceSchemaVersion,
    topLevels: normalizedTopLevels,
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
      dataScopeCollection: {
        definitionId: asString(storedDataScopeCollection?.definitionId, dataScopeCollectionDefinitionId),
        name: asString(storedDataScopeCollection?.name, 'Data Scopes'),
        items: asArray(storedDataScopes).filter(isObject).map((scope) => {
          const definitionId = asString(scope.definitionId, crypto.randomUUID())
          return {
            definitionId,
            name: asString(scope.name),
            categories: normalizeDataScopeCategories(definitionId, scope.categories),
          }
        }).filter(({ name }) => Boolean(name)),
      },
    },
    middleware: {
      items: asArray(middleware.items).filter(isObject).map((item) => {
        const definitionId = asString(item.definitionId, crypto.randomUUID())
        return {
          definitionId,
          name: asString(item.name),
          categories: normalizeMiddlewareCategories(definitionId, item.categories),
        }
      }).filter(({ name }) => Boolean(name)),
    },
    dataFlows: asArray(value.dataFlows),
  }
}
