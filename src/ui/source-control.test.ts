import { describe, expect, it } from 'vitest'
import type { ChangeJournalEntry } from '../domain/change-journal'
import { createEmptyWorkspace } from '../domain/workspace'
import { describeJournalEntries, groupJournalEntries } from './source-control'

const entry = (revision: number, command: ChangeJournalEntry['command']): ChangeJournalEntry => ({
  id: String(revision),
  revision,
  timestamp: '2026-11-04T00:00:00.000Z',
  command,
})

describe('source control grouping', () => {
  it('groups journal entries by workspace area', () => {
    const groups = groupJournalEntries([
      entry(1, { type: 'category.create', definitionId: 'finance', name: 'Finance' }),
      entry(2, { type: 'stringSubtype.create', definitionId: 'date', name: 'IsoDate' }),
      entry(3, { type: 'dataScope.create', definitionId: 'sap', name: 'SAP' }),
    ])

    expect([...groups.keys()]).toEqual(['Record Types', 'Data Types', 'Applications'])
  })

  it('describes changes using entity names instead of identifiers', () => {
    const workspace = createEmptyWorkspace()
    workspace.recordTypes.categories.push({
      id: 'finance-id',
      name: 'Finance',
      recordTypes: [{
        definitionId: 'invoice-id',
        name: 'Invoice',
        kind: 'social',
        attributes: [{ definitionId: 'amount-id', name: 'amount', dataTypeDefinitionId: 'json:number', nullable: false }],
        relationshipAttributes: [],
        children: [],
        subtypes: [],
      }],
    })
    const change = entry(1, {
      type: 'attribute.update',
      recordTypeDefinitionId: 'invoice-id',
      definitionId: 'amount-id',
      changes: { nullable: true },
    })

    expect(describeJournalEntries(workspace, [change]).get(change.id)).toBe('Update amount on Invoice')
  })
})
