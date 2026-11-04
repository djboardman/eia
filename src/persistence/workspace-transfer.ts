import type { Workspace } from '../domain/workspace'
import { migrateWorkspace } from './migrations'

export interface WorkspaceExport extends Workspace {
  exportedAt: string
}

export const createWorkspaceExport = (workspace: Workspace): WorkspaceExport => ({
  ...structuredClone(workspace),
  exportedAt: new Date().toISOString(),
})

export const parseWorkspaceImport = (value: unknown): Workspace => migrateWorkspace(value)

export const downloadWorkspaceExport = (workspace: Workspace) => {
  const data = createWorkspaceExport(workspace)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `eia-workspace-${data.exportedAt.slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}
