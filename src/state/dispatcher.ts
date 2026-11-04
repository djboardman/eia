import type { Workspace } from '../domain/workspace'
import { applyWorkspaceCommand, type WorkspaceCommand } from './commands'

interface WorkspaceDispatcherDependencies {
  appendChange: (command: WorkspaceCommand) => unknown
  persist: (workspace: Workspace) => void
  render: () => void
}

export const createWorkspaceDispatcher = (
  workspace: Workspace,
  dependencies: WorkspaceDispatcherDependencies,
) => (command: WorkspaceCommand, renderAfter = true) => {
  const result = applyWorkspaceCommand(workspace, command)
  if (result.changed) {
    dependencies.appendChange(command)
    dependencies.persist(workspace)
  }
  if (renderAfter) dependencies.render()
  return result
}

export type WorkspaceDispatcher = ReturnType<typeof createWorkspaceDispatcher>
