import type { Workspace } from '../domain/workspace'
import { downloadWorkspaceExport, parseWorkspaceImport } from '../persistence/workspace-transfer'
import type { CommandRegistry } from './command-registry'
import { browserFeedback } from './feedback'

export const registerWorkspaceTransferCommands = (
  commands: CommandRegistry,
  workspace: Workspace,
  replaceWorkspace: (workspace: Workspace) => void,
) => {
  const importInput = document.createElement('input')
  importInput.type = 'file'
  importInput.accept = 'application/json,.json'
  importInput.hidden = true
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0]
    if (!file) return
    try {
      const importedWorkspace = parseWorkspaceImport(JSON.parse(await file.text()))
      if (browserFeedback.confirm('Import this workspace and replace the current data?')) replaceWorkspace(importedWorkspace)
    } catch (error) {
      browserFeedback.error(error instanceof Error ? error.message : 'Could not import the workspace.')
    } finally {
      importInput.value = ''
    }
  })

  commands.register({ id: 'workspace.import', label: 'Import', execute: () => importInput.click() })
  commands.register({ id: 'workspace.export', label: 'Export', execute: () => downloadWorkspaceExport(workspace) })
  return importInput
}
