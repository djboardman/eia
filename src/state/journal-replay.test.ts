import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
import type { ChangeJournalEntry } from '../domain/change-journal'
import { replayChangeJournal } from './journal-replay'

const entry = (
  revision: number,
  command: ChangeJournalEntry['command'],
): ChangeJournalEntry => ({
  id: `change-${revision}`,
  revision,
  timestamp: `2026-11-04T00:00:0${revision}.000Z`,
  command,
})

describe('change journal replay', () => {
  it('reconstructs a workspace without mutating the base snapshot', () => {
    const base = createEmptyWorkspace()
    const replayed = replayChangeJournal(base, [
      entry(1, { type: 'category.create', definitionId: 'finance', name: 'Finance' }),
      entry(2, {
        type: 'recordType.create',
        definitionId: 'journal-entry',
        parentKind: 'category',
        parentId: 'finance',
        name: 'JournalEntry',
      }),
      entry(3, { type: 'attribute.add', recordTypeDefinitionId: 'journal-entry', definitionId: 'amount' }),
    ])

    expect(base.recordTypes.categories).toEqual([])
    expect(replayed.recordTypes.categories[0].recordTypes[0]).toMatchObject({
      definitionId: 'journal-entry',
      attributes: [{ definitionId: 'amount' }],
    })
  })

  it('rejects gaps and commands that cannot be applied', () => {
    const base = createEmptyWorkspace()
    expect(() => replayChangeJournal(base, [
      entry(2, { type: 'category.create', definitionId: 'finance', name: 'Finance' }),
    ])).toThrow('revision')
    expect(() => replayChangeJournal(base, [
      entry(1, { type: 'category.delete', definitionId: 'missing' }),
    ])).toThrow('Could not replay')
  })

  it('rejects invalid command payloads', () => {
    const invalid = entry(1, {
      type: 'attribute.update',
      recordTypeDefinitionId: 'record',
      definitionId: 'attribute',
      changes: { nullable: true },
    })
    invalid.command = { ...invalid.command, changes: { nullable: 'yes' } } as unknown as typeof invalid.command

    expect(() => replayChangeJournal(createEmptyWorkspace(), [invalid])).toThrow('nullable')
  })
})
