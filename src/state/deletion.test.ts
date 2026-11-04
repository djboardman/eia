import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
import type { RecordType } from '../models/record-type'
import { applyWorkspaceCommand } from './commands'
import { dataTypeReferenceCount, recordTypeExternalReferenceCount } from './selectors'

const recordType = (definitionId: string): RecordType => ({
  definitionId,
  name: definitionId,
  kind: 'social',
  attributes: [],
  relationshipAttributes: [],
  children: [],
  subtypes: [],
})

describe('definition deletion', () => {
  it('deletes a record-type subtree and detects external references', () => {
    const workspace = createEmptyWorkspace()
    const parent = recordType('parent')
    const child = recordType('child')
    const referring = recordType('referring')
    parent.children.push(child)
    referring.relationshipAttributes.push({
      definitionId: 'relationship',
      recordTypeDefinitionId: 'child',
      attributeDefinitionId: '__record_type_id__',
    })
    workspace.recordTypes.categories.push({
      id: 'category',
      name: 'Category',
      recordTypes: [parent, referring],
    })

    expect(recordTypeExternalReferenceCount(workspace, parent)).toBe(1)
    expect(applyWorkspaceCommand(workspace, { type: 'recordType.delete', definitionId: 'parent' }).changed).toBe(true)
    expect(workspace.recordTypes.categories[0].recordTypes).toEqual([referring])
  })

  it('counts subtype usage and deletes an unused string subtype', () => {
    const workspace = createEmptyWorkspace()
    const subtype = { definitionId: 'iso-date', name: 'IsoDate', pattern: '', example: '', description: '' }
    workspace.dataTypes.stringSubtypes.push(subtype)
    const item = recordType('item')
    item.attributes.push({
      definitionId: 'date',
      name: 'date',
      dataTypeDefinitionId: subtype.definitionId,
      nullable: false,
    })
    workspace.recordTypes.categories.push({ id: 'category', name: 'Category', recordTypes: [item] })

    expect(dataTypeReferenceCount(workspace, subtype.definitionId)).toBe(1)
    item.attributes.length = 0
    expect(applyWorkspaceCommand(workspace, {
      type: 'stringSubtype.delete',
      definitionId: subtype.definitionId,
    }).changed).toBe(true)
    expect(workspace.dataTypes.stringSubtypes).toEqual([])
  })
})
