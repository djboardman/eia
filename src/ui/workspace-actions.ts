import { Download, Upload } from 'lucide'
import type { Workspace } from '../domain/workspace'
import { downloadWorkspaceExport, parseWorkspaceImport } from '../persistence/workspace-transfer'
import { createLucideIcon } from './icons'

export const createWorkspaceActions = (
  workspace: Workspace,
  replaceWorkspace: (workspace: Workspace) => void,
) => {
  const actions = document.createElement('div')
  actions.className = 'workspace-actions'
  const importInput = document.createElement('input')
  importInput.type = 'file'
  importInput.accept = 'application/json,.json'
  importInput.hidden = true
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0]
    if (!file) return
    try {
      const importedWorkspace = parseWorkspaceImport(JSON.parse(await file.text()))
      if (window.confirm('Import this workspace and replace the current data?')) replaceWorkspace(importedWorkspace)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Could not import the workspace.')
    } finally {
      importInput.value = ''
    }
  })

  const importButton = document.createElement('button')
  importButton.className = 'workspace-action-button'
  importButton.type = 'button'
  importButton.append(createLucideIcon(Upload, 'tree-action-icon'), 'Import')
  importButton.addEventListener('click', () => importInput.click())

  const exportButton = document.createElement('button')
  exportButton.className = 'workspace-action-button'
  exportButton.type = 'button'
  exportButton.append(createLucideIcon(Download, 'tree-action-icon'), 'Export')
  exportButton.addEventListener('click', () => downloadWorkspaceExport(workspace))

  actions.append(importButton, exportButton, importInput)
  return actions
}
