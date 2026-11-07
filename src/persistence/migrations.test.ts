import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
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
  applications: { dataScopes: [{ definitionId: 's4hana', name: 'S/4HANA' }] },
  dataFlows: [],
}

describe('workspace migrations', () => {
  it('migrates legacy type names to stable definition IDs', () => {
    const workspace = migrateWorkspace(versionOneWorkspace)
    const attributes = workspace.recordTypes.categories[0].recordTypes[0].attributes

    expect(workspace.schemaVersion).toBe(9)
    expect(workspace.recordTypes.categories[0].recordTypes[0].kind).toBe('social')
    expect(attributes.map(({ dataTypeDefinitionId }) => dataTypeDefinitionId)).toEqual(['iso-date', 'json:number'])
    expect(workspace.topLevels).toHaveLength(5)
    expect(workspace.topLevels[3]).toEqual({ id: 'middleware', label: 'Middleware' })
    expect(workspace.applications.dataScopeCollection).toEqual({
      definitionId: '__data_scopes__',
      name: 'Data Scopes',
      items: [{
        definitionId: 's4hana',
        name: 'S/4HANA',
        categories: [
          { definitionId: 's4hana:apis', name: 'APIs', kind: 'apis', items: [] },
          { definitionId: 's4hana:clients', name: 'CLIENTs', kind: 'clients', items: [] },
        ],
      }],
    })
    expect(workspace.middleware).toEqual({ items: [] })
  })

  it('rejects unsupported future versions and malformed files', () => {
    expect(() => migrateWorkspace({ schemaVersion: 99, recordTypes: {}, dataTypes: {} })).toThrow()
    expect(() => migrateWorkspace([])).toThrow()
  })

  it('preserves pipeline data type references', () => {
    const stored = createEmptyWorkspace()
    stored.middleware.items.push({
      definitionId: 'middleware',
      name: 'Middleware',
      categories: [
        { definitionId: 'middleware:apis', name: 'APIs', kind: 'apis', items: [] },
        { definitionId: 'middleware:clients', name: 'CLIENTs', kind: 'clients', items: [] },
        {
          definitionId: 'middleware:pipelines',
          name: 'PIPELINES',
          kind: 'pipelines',
          items: [{
            definitionId: 'pipeline',
            name: 'Sync',
            source: { kind: 'recordType', definitionId: '__record__' },
            target: {
              kind: 'contract',
              ownerKind: 'api',
              ownerDefinitionId: 'api',
              operationName: 'Create',
              direction: 'input',
            },
            transform: {
              mappings: [{
                definitionId: 'items-loop',
                kind: 'loop',
                sourcePath: 'children.JournalEntryItem',
                targetPath: 'JournalEntry/Item',
                mappings: [{
                  definitionId: 'tax-loop', kind: 'loop', sourcePath: 'taxes', targetPath: 'ProductTaxItem', mappings: [],
                }],
              }],
            },
          }],
        },
      ],
    })

    expect(migrateWorkspace(stored).middleware.items[0].categories[2]).toEqual(stored.middleware.items[0].categories[2])
  })
})
