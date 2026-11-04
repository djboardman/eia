import type { ChangeJournalEntry } from '../domain/change-journal'
import type { WorkspaceCommand } from '../state/commands'
import { parseWorkspaceCommand } from '../state/command-validation'

const changeJournalStorageKey = 'eia-change-journal'
type JournalStorage = Pick<Storage, 'getItem' | 'setItem'>

export const parseChangeJournal = (value: unknown, firstRevision = 1): ChangeJournalEntry[] => {
  if (!Array.isArray(value)) throw new Error('Invalid change journal.')
  const ids = new Set<string>()
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Invalid change journal entry.')
    const entry = item as Record<string, unknown>
    if (typeof entry.id !== 'string' || !entry.id || ids.has(entry.id)) throw new Error('Invalid change journal entry ID.')
    ids.add(entry.id)
    if (entry.revision !== firstRevision + index) throw new Error(`Invalid change journal revision at position ${index + 1}.`)
    if (typeof entry.timestamp !== 'string' || Number.isNaN(Date.parse(entry.timestamp))) {
      throw new Error(`Invalid change journal timestamp at revision ${index + 1}.`)
    }
    return {
      id: entry.id,
      revision: entry.revision,
      timestamp: entry.timestamp,
      command: parseWorkspaceCommand(entry.command),
    }
  })
}

const readEntries = (storage: JournalStorage): ChangeJournalEntry[] => {
  const stored = storage.getItem(changeJournalStorageKey)
  if (!stored) return []
  const value: unknown = JSON.parse(stored)
  return parseChangeJournal(value)
}

export const loadChangeJournal = (storage: JournalStorage = localStorage): readonly ChangeJournalEntry[] =>
  readEntries(storage)

export const appendChangeJournal = (
  command: WorkspaceCommand,
  storage: JournalStorage = localStorage,
): ChangeJournalEntry => {
  const entries = readEntries(storage)
  const entry: ChangeJournalEntry = {
    id: crypto.randomUUID(),
    revision: entries.length + 1,
    timestamp: new Date().toISOString(),
    command: structuredClone(command),
  }
  entries.push(entry)
  storage.setItem(changeJournalStorageKey, JSON.stringify(entries))
  return entry
}
