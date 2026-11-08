import type { ChangeJournalEntry } from '../../domain/change-journal'
import type { Workspace } from '../../domain/workspace'
import { findRecordType, getAllRecordTypes, resolveRelationshipAttribute } from '../selectors'
import type { WorkspaceCommand } from './types'

export type ChangeGroup = 'Record Types' | 'Data Types' | 'Applications' | 'Middleware' | 'Workspace'

const groupForCommand = (command: WorkspaceCommand): ChangeGroup => {
  if (command.type.startsWith('stringSubtype.')) return 'Data Types'
  if (command.type.startsWith('dataScope.') || command.type.startsWith('api.')) return 'Applications'
  if (command.type.startsWith('middleware.') || command.type.startsWith('pipeline.')) return 'Middleware'
  if (command.type === 'workspace.replace') return 'Workspace'
  return 'Record Types'
}

export const groupJournalEntries = (entries: readonly ChangeJournalEntry[]) => {
  const groups = new Map<ChangeGroup, ChangeJournalEntry[]>()
  for (const entry of entries) {
    const group = groupForCommand(entry.command)
    groups.set(group, [...(groups.get(group) ?? []), entry])
  }
  return groups
}

interface ChangeNames {
  categories: Map<string, string>
  recordTypes: Map<string, string>
  stringSubtypes: Map<string, string>
  dataScopes: Map<string, string>
  middleware: Map<string, string>
  pipelines: Map<string, string>
  apis: Map<string, string>
  attributes: Map<string, string>
  relationships: Map<string, string>
}

const collectChangeNames = (workspace: Workspace, entries: readonly ChangeJournalEntry[]): ChangeNames => {
  const names: ChangeNames = {
    categories: new Map(workspace.recordTypes.categories.map(({ id, name }) => [id, name])),
    recordTypes: new Map(),
    stringSubtypes: new Map(workspace.dataTypes.stringSubtypes.map(({ definitionId, name }) => [definitionId, name])),
    dataScopes: new Map(workspace.applications.dataScopeCollection.items.map(
      ({ definitionId, name }) => [definitionId, name],
    )),
    middleware: new Map(workspace.middleware.items.map(({ definitionId, name }) => [definitionId, name])),
    pipelines: new Map(workspace.middleware.items.flatMap(({ categories }) => categories.flatMap((category) =>
      category.kind === 'pipelines'
        ? category.items.map(({ definitionId, name }) => [definitionId, name] as const)
        : []))),
    apis: new Map(workspace.applications.dataScopeCollection.items.flatMap(({ categories }) => categories
      .filter((category) => category.kind === 'apis')
      .flatMap(({ items }) => items.map(({ definitionId, name }) => [definitionId, name] as const)))),
    attributes: new Map(),
    relationships: new Map(),
  }
  for (const recordType of getAllRecordTypes(workspace)) {
    names.recordTypes.set(recordType.definitionId, recordType.name)
    for (const attribute of recordType.attributes) names.attributes.set(attribute.definitionId, attribute.name)
    for (const relationship of recordType.relationshipAttributes) {
      const sourceRecordType = findRecordType(workspace, relationship.recordTypeDefinitionId)
      const sourceAttribute = resolveRelationshipAttribute(workspace, relationship)
      names.relationships.set(
        relationship.definitionId,
        sourceRecordType && sourceAttribute
          ? [sourceRecordType.name, relationship.role?.trim(), sourceAttribute.name].filter(Boolean).join(' · ')
          : 'relationship attribute',
      )
    }
  }
  for (const { command } of entries) {
    if (command.type === 'category.create' || command.type === 'category.rename') {
      names.categories.set(command.definitionId, command.name)
    } else if (command.type === 'recordType.create' || command.type === 'recordType.rename') {
      names.recordTypes.set(command.definitionId, command.name)
    } else if (command.type === 'stringSubtype.create') {
      names.stringSubtypes.set(command.definitionId, command.name)
    } else if (command.type === 'stringSubtype.update' && command.changes.name) {
      names.stringSubtypes.set(command.definitionId, command.changes.name)
    } else if (command.type === 'dataScope.create' || command.type === 'dataScope.rename') {
      names.dataScopes.set(command.definitionId, command.name)
    } else if (command.type === 'middleware.create' || command.type === 'middleware.rename') {
      names.middleware.set(command.definitionId, command.name)
    } else if (command.type === 'pipeline.create' || command.type === 'pipeline.rename') {
      names.pipelines.set(command.definitionId, command.name)
    } else if (command.type === 'api.importWsdl') {
      names.apis.set(command.definitionId, command.name)
    } else if (command.type === 'attribute.update' && command.changes.name) {
      names.attributes.set(command.definitionId, command.changes.name)
    }
  }
  return names
}

const commandLabel = (command: WorkspaceCommand, names: ChangeNames) => {
  const recordType = 'recordTypeDefinitionId' in command
    ? names.recordTypes.get(command.recordTypeDefinitionId)
    : undefined
  const onRecordType = recordType ? ` on ${recordType}` : ''
  switch (command.type) {
    case 'category.create': return `Add category ${command.name}`
    case 'category.rename': return `Rename category to ${command.name}`
    case 'category.delete': return `Delete category ${names.categories.get(command.definitionId) ?? ''}`.trim()
    case 'recordType.create': return `Add record type ${command.name}`
    case 'recordType.rename': return `Rename record type to ${command.name}`
    case 'recordType.setKind': return `Set ${names.recordTypes.get(command.definitionId) ?? 'record type'} to ${command.kind}`
    case 'recordType.delete': return `Delete record type ${names.recordTypes.get(command.definitionId) ?? ''}`.trim()
    case 'stringSubtype.create': return `Add string subtype ${command.name}`
    case 'stringSubtype.update': return `Update string subtype ${names.stringSubtypes.get(command.definitionId) ?? ''}`.trim()
    case 'stringSubtype.delete': return `Delete string subtype ${names.stringSubtypes.get(command.definitionId) ?? ''}`.trim()
    case 'dataScope.create': return `Add data scope ${command.name}`
    case 'dataScope.rename': return `Rename data scope to ${command.name}`
    case 'dataScope.delete': return `Delete data scope ${names.dataScopes.get(command.definitionId) ?? ''}`.trim()
    case 'middleware.create': return `Add middleware ${command.name}`
    case 'middleware.rename': return `Rename middleware to ${command.name}`
    case 'middleware.delete': return `Delete middleware ${names.middleware.get(command.definitionId) ?? ''}`.trim()
    case 'pipeline.create': return `Add pipeline ${command.name}`
    case 'pipeline.rename': return `Rename pipeline to ${command.name}`
    case 'pipeline.update': return `Update pipeline ${names.pipelines.get(command.definitionId) ?? ''}`.trim()
    case 'pipeline.delete': return `Delete pipeline ${names.pipelines.get(command.definitionId) ?? ''}`.trim()
    case 'api.importWsdl': return `Import API ${names.apis.get(command.definitionId) ?? command.name}`
    case 'attribute.add': return `Add attribute ${names.attributes.get(command.definitionId) ?? ''}${onRecordType}`.trim()
    case 'attribute.update': return `Update ${names.attributes.get(command.definitionId) ?? 'attribute'}${onRecordType}`
    case 'attribute.delete': return `Delete ${names.attributes.get(command.definitionId) ?? 'attribute'}${onRecordType}`
    case 'attribute.move': return `Move ${names.attributes.get(command.definitionId) ?? 'attribute'}${onRecordType}`
    case 'relationshipAttribute.add': return `Add ${names.relationships.get(command.definitionId) ?? 'relationship attribute'}${onRecordType}`
    case 'relationshipAttribute.update': return `Update ${names.relationships.get(command.definitionId) ?? 'relationship attribute'}${onRecordType}`
    case 'relationshipAttribute.delete': return `Delete ${names.relationships.get(command.definitionId) ?? 'relationship attribute'}${onRecordType}`
    case 'workspace.replace': return 'Replace workspace from import'
  }
}

export const describeJournalEntries = (workspace: Workspace, entries: readonly ChangeJournalEntry[]) => {
  const names = collectChangeNames(workspace, entries)
  return new Map(entries.map((entry) => [entry.id, commandLabel(entry.command, names)]))
}
