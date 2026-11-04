import type { AttributeDefinition, RecordType, RecordTypeKind } from '../models/record-type'
import type { StringDataTypeSubtype, Workspace } from '../domain/workspace'
import { basicDataTypeDefinitionId } from '../domain/data-types'
import { findRecordType } from './selectors'

export type RecordTypeParentKind = 'category' | 'children' | 'subtypes'

type StringSubtypeChanges = Partial<Omit<StringDataTypeSubtype, 'definitionId'>>
type AttributeChanges = Partial<Pick<AttributeDefinition, 'name' | 'dataTypeDefinitionId' | 'nullable'>>

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

const changed = (definitionId?: string): WorkspaceCommandResult => ({ changed: true, definitionId })
const unchanged = (): WorkspaceCommandResult => ({ changed: false })

const deleteRecordType = (workspace: Workspace, definitionId: string) => {
  const removeFrom = (recordTypes: RecordType[]): boolean => {
    const index = recordTypes.findIndex((recordType) => recordType.definitionId === definitionId)
    if (index >= 0) {
      recordTypes.splice(index, 1)
      return true
    }
    return recordTypes.some((recordType) => removeFrom(recordType.children) || removeFrom(recordType.subtypes))
  }
  return workspace.recordTypes.categories.some(({ recordTypes }) => removeFrom(recordTypes))
}

export const applyWorkspaceCommand = (
  workspace: Workspace,
  command: WorkspaceCommand,
): WorkspaceCommandResult => {
  switch (command.type) {
    case 'category.create': {
      workspace.recordTypes.categories.push({ id: command.definitionId, name: command.name, recordTypes: [] })
      return changed(command.definitionId)
    }
    case 'category.rename': {
      const category = workspace.recordTypes.categories.find(({ id }) => id === command.definitionId)
      if (!category) return unchanged()
      category.name = command.name
      return changed()
    }
    case 'category.delete': {
      const index = workspace.recordTypes.categories.findIndex(({ id }) => id === command.definitionId)
      if (index < 0 || workspace.recordTypes.categories[index].recordTypes.length > 0) return unchanged()
      workspace.recordTypes.categories.splice(index, 1)
      return changed()
    }
    case 'recordType.create': {
      const recordType: RecordType = {
        definitionId: command.definitionId,
        name: command.name,
        kind: 'social',
        attributes: [],
        relationshipAttributes: [],
        children: [],
        subtypes: [],
      }
      if (command.parentKind === 'category') {
        const category = workspace.recordTypes.categories.find(({ id }) => id === command.parentId)
        if (!category) return unchanged()
        category.recordTypes.push(recordType)
      } else {
        const parent = findRecordType(workspace, command.parentId)
        if (!parent) return unchanged()
        parent[command.parentKind].push(recordType)
      }
      return changed(command.definitionId)
    }
    case 'recordType.rename': {
      const recordType = findRecordType(workspace, command.definitionId)
      if (!recordType) return unchanged()
      recordType.name = command.name
      return changed()
    }
    case 'recordType.setKind': {
      const recordType = findRecordType(workspace, command.definitionId)
      if (!recordType) return unchanged()
      recordType.kind = command.kind
      return changed()
    }
    case 'recordType.delete':
      return deleteRecordType(workspace, command.definitionId) ? changed() : unchanged()
    case 'stringSubtype.create': {
      workspace.dataTypes.stringSubtypes.push({
        definitionId: command.definitionId,
        name: command.name,
        pattern: '',
        example: '',
        description: '',
      })
      return changed(command.definitionId)
    }
    case 'stringSubtype.update': {
      const subtype = workspace.dataTypes.stringSubtypes.find(({ definitionId }) => definitionId === command.definitionId)
      if (!subtype) return unchanged()
      Object.assign(subtype, command.changes)
      return changed()
    }
    case 'stringSubtype.delete': {
      const index = workspace.dataTypes.stringSubtypes.findIndex(({ definitionId }) => definitionId === command.definitionId)
      if (index < 0) return unchanged()
      workspace.dataTypes.stringSubtypes.splice(index, 1)
      return changed()
    }
    case 'dataScope.create': {
      workspace.applications.dataScopes.push({ definitionId: command.definitionId, name: command.name })
      return changed(command.definitionId)
    }
    case 'dataScope.rename': {
      const scope = workspace.applications.dataScopes.find(({ definitionId }) => definitionId === command.definitionId)
      if (!scope) return unchanged()
      scope.name = command.name
      return changed()
    }
    case 'dataScope.delete': {
      const index = workspace.applications.dataScopes.findIndex(({ definitionId }) => definitionId === command.definitionId)
      if (index < 0) return unchanged()
      workspace.applications.dataScopes.splice(index, 1)
      return changed()
    }
    case 'attribute.add': {
      const recordType = findRecordType(workspace, command.recordTypeDefinitionId)
      if (!recordType) return unchanged()
      recordType.attributes.push({
        definitionId: command.definitionId,
        name: `attribute${recordType.attributes.length + 1}`,
        dataTypeDefinitionId: basicDataTypeDefinitionId('string'),
        nullable: true,
      })
      return changed(command.definitionId)
    }
    case 'attribute.update': {
      const attribute = findRecordType(workspace, command.recordTypeDefinitionId)
        ?.attributes.find(({ definitionId }) => definitionId === command.definitionId)
      if (!attribute) return unchanged()
      Object.assign(attribute, command.changes)
      return changed()
    }
    case 'attribute.delete': {
      const attributes = findRecordType(workspace, command.recordTypeDefinitionId)?.attributes
      const index = attributes?.findIndex(({ definitionId }) => definitionId === command.definitionId) ?? -1
      if (!attributes || index < 0) return unchanged()
      attributes.splice(index, 1)
      return changed()
    }
    case 'attribute.move': {
      const attributes = findRecordType(workspace, command.recordTypeDefinitionId)?.attributes
      if (!attributes) return unchanged()
      const from = attributes.findIndex(({ definitionId }) => definitionId === command.definitionId)
      const to = attributes.findIndex(({ definitionId }) => definitionId === command.beforeDefinitionId)
      if (from < 0 || to < 0) return unchanged()
      const [moved] = attributes.splice(from, 1)
      attributes.splice(to, 0, moved)
      return changed()
    }
    case 'relationshipAttribute.add': {
      const recordType = findRecordType(workspace, command.recordTypeDefinitionId)
      if (!recordType) return unchanged()
      recordType.relationshipAttributes.push({
        definitionId: command.definitionId,
        recordTypeDefinitionId: '',
        attributeDefinitionId: '',
      })
      return changed(command.definitionId)
    }
    case 'relationshipAttribute.update': {
      const relationship = findRecordType(workspace, command.recordTypeDefinitionId)
        ?.relationshipAttributes.find(({ definitionId }) => definitionId === command.definitionId)
      if (!relationship) return unchanged()
      Object.assign(relationship, command.changes)
      return changed()
    }
    case 'relationshipAttribute.delete': {
      const relationships = findRecordType(workspace, command.recordTypeDefinitionId)?.relationshipAttributes
      const index = relationships?.findIndex(({ definitionId }) => definitionId === command.definitionId) ?? -1
      if (!relationships || index < 0) return unchanged()
      relationships.splice(index, 1)
      return changed()
    }
    case 'workspace.replace':
      Object.assign(workspace, structuredClone(command.workspace))
      return changed()
  }
}
