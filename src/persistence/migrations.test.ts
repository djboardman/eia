import { describe, expect, it } from 'vitest'
import { migrateWorkspace } from './migrations'

const versionOneWorkspace = {
  schemaVersion: 1,
  topLevels: [],
  recordTypes: {
    root: { definitionId: '__record__', name: 'Record', attributes: [], relationshipAttributes: [] },
    categories: [{
      id: 'category',
      name: 'Category',
      recordTypes: [{
        definitionId: 'record-type',
        name: 'Entry',
        attributes: [
          { definitionId: 'date', name: 'date', dataType: 'IsoDate', nullable: false },
          { definitionId: 'amount', name: 'amount', dataType: 'number', nullable: true },
        ],
        relationshipAttributes: [],
      }],
    }],
  },
  dataTypes: {
    basic: ['string', 'number', 'boolean', 'object', 'array', 'null'],
    stringSubtypes: [{ definitionId: 'iso-date', name: 'IsoDate' }],
  },
  applications: { dataScopes: [] },
  dataFlows: [],
}

describe('workspace migrations', () => {
  it('migrates legacy type names to stable definition IDs', () => {
    const workspace = migrateWorkspace(versionOneWorkspace)
    const attributes = workspace.recordTypes.categories[0].recordTypes[0].attributes

    expect(workspace.schemaVersion).toBe(3)
    expect(workspace.recordTypes.categories[0].recordTypes[0].kind).toBe('social')
    expect(attributes.map(({ dataTypeDefinitionId }) => dataTypeDefinitionId)).toEqual(['iso-date', 'json:number'])
    expect(workspace.topLevels).toHaveLength(4)
  })

  it('rejects unsupported future versions and malformed files', () => {
    expect(() => migrateWorkspace({ schemaVersion: 99, recordTypes: {}, dataTypes: {} })).toThrow()
    expect(() => migrateWorkspace([])).toThrow()
  })
})
