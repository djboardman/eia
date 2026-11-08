import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../../domain/workspace'
import type { RecordType } from '../../domain/record-types'
import { choicesAtLevel, selectableNodesForReference } from './transform-selection'

const recordType = (definitionId: string, name: string): RecordType => ({
  definitionId,
  name,
  kind: 'social',
  attributes: [],
  relationshipAttributes: [],
  children: [],
  subtypes: [],
})

describe('pipeline transform selection', () => {
  it('builds level-aware record type choices', () => {
    const workspace = createEmptyWorkspace()
    const entry = recordType('entry', 'Entry')
    entry.attributes.push({
      definitionId: 'lines', name: 'lines', dataTypeDefinitionId: 'json:array', nullable: true,
    })
    entry.children.push(recordType('item', 'Item'))
    workspace.recordTypes.categories.push({ id: 'finance', name: 'Finance', recordTypes: [entry] })

    const nodes = selectableNodesForReference(workspace, { kind: 'recordType', definitionId: 'entry' })

    expect(choicesAtLevel(nodes, undefined, 'array').map(({ path }) => path)).toEqual(['data[]', 'included[]'])
    expect(choicesAtLevel(nodes, 'data', 'object').map(({ path }) => path)).toEqual(['data.attributes'])
    expect(choicesAtLevel(nodes, 'data.attributes', 'array').map(({ path }) => path)).toEqual([
      'data.attributes.lines',
    ])
  })
})
