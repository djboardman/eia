import type { Category } from '../models/category'
import {
  createEmptyWorkspace,
  createDataScopeCategories,
  rootRecordTypeDefinitionId,
  type DataScope,
  type TopLevelDefinition,
  type Workspace,
} from '../domain/workspace'
import { migrateWorkspace, normalizeRecordType, normalizeStringSubtypes } from './migrations'

const workspaceStorageKey = 'eia-workspace'
const legacyKeys = {
  categories: 'eia-record-type-categories',
  rootRecord: 'eia-root-record-type',
  stringSubtypes: 'eia-string-data-type-subtypes',
  topLevels: 'eia-workspace-top-levels',
  dataScopes: 'eia-application-data-scopes',
} as const

const parse = (key: string): unknown => {
  const stored = localStorage.getItem(key)
  if (!stored) return undefined
  try {
    return JSON.parse(stored)
  } catch {
    return undefined
  }
}

const loadLegacyWorkspace = (): Workspace => {
  const workspace = createEmptyWorkspace()
  workspace.dataTypes.stringSubtypes = normalizeStringSubtypes(parse(legacyKeys.stringSubtypes))
  const categories = parse(legacyKeys.categories)
  if (Array.isArray(categories)) {
    workspace.recordTypes.categories = categories
      .filter((category): category is { id: string; name: string; recordTypes: unknown[] } => (
        Boolean(category) && typeof category === 'object' && Array.isArray(category.recordTypes)
      ))
      .map((category): Category => ({
        id: category.id,
        name: category.name,
        recordTypes: category.recordTypes.map((recordType) => normalizeRecordType(
          recordType,
          workspace.dataTypes.stringSubtypes,
        )),
      }))
  }

  const root = parse(legacyKeys.rootRecord)
  if (root) workspace.recordTypes.root = normalizeRecordType(root, workspace.dataTypes.stringSubtypes)
  workspace.recordTypes.root.definitionId = rootRecordTypeDefinitionId
  workspace.recordTypes.root.name = 'Record'
  workspace.recordTypes.root.children = []
  workspace.recordTypes.root.subtypes = []

  const topLevels = parse(legacyKeys.topLevels)
  if (Array.isArray(topLevels)) workspace.topLevels = topLevels as TopLevelDefinition[]
  const dataScopes = parse(legacyKeys.dataScopes)
  if (Array.isArray(dataScopes)) {
    workspace.applications.dataScopeCollection.items = (dataScopes as DataScope[]).map((scope) => ({
      ...scope,
      categories: createDataScopeCategories(scope.definitionId),
    }))
  }
  return workspace
}

export const saveWorkspace = (workspace: Workspace) => {
  localStorage.setItem(workspaceStorageKey, JSON.stringify(workspace))
}

export const loadWorkspace = (): Workspace => {
  const stored = parse(workspaceStorageKey)
  let workspace: Workspace
  try {
    workspace = stored ? migrateWorkspace(stored) : loadLegacyWorkspace()
  } catch {
    workspace = loadLegacyWorkspace()
  }
  saveWorkspace(workspace)
  Object.values(legacyKeys).forEach((key) => localStorage.removeItem(key))
  return workspace
}
