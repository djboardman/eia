import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
import { basicDataTypeDefinitionId } from '../domain/data-types'
import type { RecordType } from '../domain/record-types'
import {
  findRecordTypeContext,
  resolveRelationshipAttribute,
} from './selectors'

const recordType = (definitionId: string, name: string): RecordType => ({
  definitionId,
  name,
  kind: 'social',
  attributes: [],
  relationshipAttributes: [],
  children: [],
  subtypes: [],
})

describe('record type selectors', () => {
  it('resolves implicit Record inheritance and explicit subtype inheritance', () => {
    const workspace = createEmptyWorkspace()
    const parent = recordType('parent', 'Parent')
    const subtype = recordType('subtype', 'Subtype')
    parent.subtypes.push(subtype)
    workspace.recordTypes.categories.push({ id: 'category', name: 'Category', recordTypes: [parent] })

    expect(findRecordTypeContext(workspace, 'parent')?.inheritedFrom).toEqual([workspace.recordTypes.root])
    expect(findRecordTypeContext(workspace, 'subtype')?.inheritedFrom).toEqual([workspace.recordTypes.root, parent])
  })

  it('identifies the immediate parent of a child record type', () => {
    const workspace = createEmptyWorkspace()
    const parent = recordType('parent', 'Parent')
    const child = recordType('child', 'Child')
    parent.children.push(child)
    workspace.recordTypes.categories.push({ id: 'category', name: 'Category', recordTypes: [parent] })

    expect(findRecordTypeContext(workspace, 'child')?.parentRecordType).toBe(parent)
  })

  it('resolves relationship source attributes without serialization naming', () => {
    const workspace = createEmptyWorkspace()
    const source = recordType('source', 'Account')
    source.attributes.push({
      definitionId: 'code',
      name: 'code',
      dataTypeDefinitionId: basicDataTypeDefinitionId('string'),
      nullable: false,
    })
    workspace.recordTypes.categories.push({ id: 'category', name: 'Category', recordTypes: [source] })
    const resolved = resolveRelationshipAttribute(workspace, {
      definitionId: 'relationship',
      recordTypeDefinitionId: 'source',
      role: 'credit',
      attributeDefinitionId: 'code',
    })

    expect(resolved?.name).toBe('code')
    expect(resolved?.dataTypeDefinitionId).toBe('json:string')
  })
})
