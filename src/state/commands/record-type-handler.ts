import { basicDataTypeDefinitionId } from '../../domain/data-types'
import type { RecordType } from '../../domain/record-types'
import type { Workspace } from '../../domain/workspace'
import { findRecordType } from '../selectors'
import { changed, unchanged } from './results'
import type { RecordTypeCommand, WorkspaceCommandResult } from './types'

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

export const applyRecordTypeCommand = (workspace: Workspace, command: RecordTypeCommand): WorkspaceCommandResult => {
  switch (command.type) {
    case 'category.create':
      workspace.recordTypes.categories.push({ id: command.definitionId, name: command.name, recordTypes: [] })
      return changed(command.definitionId)
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
  }
}
