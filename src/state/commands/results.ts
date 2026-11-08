import type { WorkspaceCommandResult } from './types'

export const changed = (definitionId?: string): WorkspaceCommandResult => ({ changed: true, definitionId })
export const unchanged = (): WorkspaceCommandResult => ({ changed: false })
