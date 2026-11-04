import { describe, expect, it } from 'vitest'
import { appendChangeJournal, loadChangeJournal } from './change-journal'

const createStorage = () => {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe('change journal persistence', () => {
  it('appends commands without replacing earlier entries', () => {
    const storage = createStorage()
    appendChangeJournal({ type: 'category.create', definitionId: 'one', name: 'One' }, storage)
    appendChangeJournal({ type: 'category.rename', definitionId: 'one', name: 'Renamed' }, storage)

    const entries = loadChangeJournal(storage)
    expect(entries).toHaveLength(2)
    expect(entries.map(({ revision }) => revision)).toEqual([1, 2])
    expect(entries.map(({ command }) => command.type)).toEqual(['category.create', 'category.rename'])
  })
})
