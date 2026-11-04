import { describe, expect, it } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
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
})
