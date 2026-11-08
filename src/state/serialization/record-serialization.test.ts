import { describe, expect, it } from 'vitest'
import type { RecordType } from '../../domain/record-types'
import {
  allChildRecordTypesForSerialization,
  childRecordTypesForSerialization,
  recordSerializationPaths,
  serializedRelationshipAttributeName,
} from './record-serialization'

const recordType = (definitionId: string): RecordType => ({
  definitionId,
  name: definitionId,
  kind: 'social',
  attributes: [],
  relationshipAttributes: [],
  children: [],
  subtypes: [],
})

describe('record serialization adapter', () => {
  it('maps child types to the lowest subtype used in included serialization', () => {
    const parent = recordType('parent')
    const child = recordType('child')
    const subtype = recordType('subtype')
    const leaf = recordType('leaf')
    subtype.subtypes.push(leaf)
    child.subtypes.push(subtype)
    parent.children.push(child)

    expect(childRecordTypesForSerialization(parent)).toEqual([
      { recordType: leaf, relationship: 'subtype' },
    ])
  })

  it('exposes nested serialized child types without duplicates', () => {
    const parent = recordType('parent')
    const child = recordType('child')
    const grandchild = recordType('grandchild')
    child.children.push(grandchild)
    parent.children.push(child)

    expect(allChildRecordTypesForSerialization(parent)).toEqual([child, grandchild])
  })

  it('owns the serialized record paths', () => {
    expect(recordSerializationPaths.field('data', 'id')).toBe('data.id')
    expect(recordSerializationPaths.attributes('data')).toBe('data.attributes')
    expect(recordSerializationPaths.attribute('data', 'amount')).toBe('data.attributes.amount')
    expect(recordSerializationPaths.included).toBe('included[]')
  })

  it('owns relationship attribute naming', () => {
    expect(serializedRelationshipAttributeName('Account', undefined, 'code')).toBe('Account_code')
    expect(serializedRelationshipAttributeName('Account', 'credit', 'code')).toBe('Account_creditCode')
  })
})
