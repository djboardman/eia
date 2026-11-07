import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace, createEmptyWsdlApiModel } from '../domain/workspace'
import { applyWorkspaceCommand, type WorkspaceCommand } from './commands'

describe('workspace commands', () => {
  it('applies stable identifiers supplied by replayable create commands', () => {
    const workspace = createEmptyWorkspace()
    const commands: WorkspaceCommand[] = [
      { type: 'category.create', definitionId: 'finance', name: 'Finance' },
      {
        type: 'recordType.create',
        definitionId: 'journal-entry',
        parentKind: 'category',
        parentId: 'finance',
        name: 'JournalEntry',
      },
      { type: 'attribute.add', recordTypeDefinitionId: 'journal-entry', definitionId: 'amount' },
    ]

    for (const command of commands) expect(applyWorkspaceCommand(workspace, command).changed).toBe(true)

    expect(workspace.recordTypes.categories[0].recordTypes[0]).toMatchObject({
      definitionId: 'journal-entry',
      attributes: [{ definitionId: 'amount' }],
    })
  })

  it('replaces the workspace without retaining references to the import value', () => {
    const workspace = createEmptyWorkspace()
    const replacement = createEmptyWorkspace()
    replacement.topLevels[0].label = 'Types'

    applyWorkspaceCommand(workspace, { type: 'workspace.replace', workspace: replacement })
    replacement.topLevels[0].label = 'Changed elsewhere'

    expect(workspace.topLevels[0].label).toBe('Types')
  })

  it('imports a WSDL API into an APIs category', () => {
    const workspace = createEmptyWorkspace()
    applyWorkspaceCommand(workspace, { type: 'dataScope.create', definitionId: 'sap', name: 'S/4HANA' })

    const result = applyWorkspaceCommand(workspace, {
      type: 'api.importWsdl',
      dataScopeDefinitionId: 'sap',
      categoryDefinitionId: 'sap:apis',
      definitionId: 'journal-api',
      name: 'JournalEntryBulkCreation',
      fileName: 'journal.wsdl',
      document: '<definitions />',
      model: createEmptyWsdlApiModel(),
    })

    expect(result.changed).toBe(true)
    expect(workspace.applications.dataScopeCollection.items[0].categories[0]).toMatchObject({
      items: [{
        definitionId: 'journal-api',
        name: 'JournalEntryBulkCreation',
        source: { kind: 'wsdl', fileName: 'journal.wsdl' },
        model: createEmptyWsdlApiModel(),
      }],
    })
  })

  it('creates middleware with its fixed categories', () => {
    const workspace = createEmptyWorkspace()

    const result = applyWorkspaceCommand(workspace, {
      type: 'middleware.create',
      definitionId: 'integration-suite',
      name: 'Integration Suite',
    })

    expect(result.changed).toBe(true)
    expect(workspace.middleware.items[0]).toEqual({
      definitionId: 'integration-suite',
      name: 'Integration Suite',
      categories: [
        { definitionId: 'integration-suite:apis', name: 'APIs', kind: 'apis', items: [] },
        { definitionId: 'integration-suite:clients', name: 'CLIENTs', kind: 'clients', items: [] },
        { definitionId: 'integration-suite:pipelines', name: 'PIPELINES', kind: 'pipelines', items: [] },
      ],
    })
  })

  it('creates and configures a pipeline', () => {
    const workspace = createEmptyWorkspace()
    applyWorkspaceCommand(workspace, {
      type: 'middleware.create', definitionId: 'middleware', name: 'Middleware',
    })
    applyWorkspaceCommand(workspace, {
      type: 'pipeline.create', middlewareDefinitionId: 'middleware', definitionId: 'pipeline', name: 'Customer Sync',
    })
    applyWorkspaceCommand(workspace, {
      type: 'pipeline.update',
      definitionId: 'pipeline',
      changes: {
        source: { kind: 'recordType', definitionId: '__record__' },
        target: {
          kind: 'contract', ownerKind: 'api', ownerDefinitionId: 'api', operationName: 'Create', direction: 'input',
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
      },
    })

    const pipelines = workspace.middleware.items[0].categories.find(({ kind }) => kind === 'pipelines')
    expect(pipelines?.items[0]).toMatchObject({
      definitionId: 'pipeline',
      name: 'Customer Sync',
      source: { kind: 'recordType', definitionId: '__record__' },
      target: { kind: 'contract', ownerDefinitionId: 'api', operationName: 'Create' },
      transform: { mappings: [{ definitionId: 'items-loop', mappings: [{ definitionId: 'tax-loop' }] }] },
    })
  })
})
