import type { Workspace } from '../domain/workspace'
import { applyApplicationCommand } from './commands/application-handler'
import { applyDataTypeCommand } from './commands/data-type-handler'
import { applyMiddlewareCommand } from './commands/middleware-handler'
import { applyRecordTypeCommand } from './commands/record-type-handler'
import { changed } from './commands/results'
import type {
  ApplicationCommand,
  DataTypeCommand,
  MiddlewareCommand,
  RecordTypeCommand,
  WorkspaceCommand,
  WorkspaceCommandResult,
} from './commands/types'

export type { RecordTypeParentKind, WorkspaceCommand, WorkspaceCommandResult } from './commands/types'

const recordTypeCommands = new Set([
  'category.create', 'category.rename', 'category.delete',
  'recordType.create', 'recordType.rename', 'recordType.setKind', 'recordType.delete',
  'attribute.add', 'attribute.update', 'attribute.delete', 'attribute.move',
  'relationshipAttribute.add', 'relationshipAttribute.update', 'relationshipAttribute.delete',
])

export const applyWorkspaceCommand = (
  workspace: Workspace,
  command: WorkspaceCommand,
): WorkspaceCommandResult => {
  if (recordTypeCommands.has(command.type)) return applyRecordTypeCommand(workspace, command as RecordTypeCommand)
  if (command.type.startsWith('stringSubtype.')) return applyDataTypeCommand(workspace, command as DataTypeCommand)
  if (command.type.startsWith('dataScope.') || command.type === 'api.importWsdl') {
    return applyApplicationCommand(workspace, command as ApplicationCommand)
  }
  if (command.type.startsWith('middleware.') || command.type.startsWith('pipeline.')) {
    return applyMiddlewareCommand(workspace, command as MiddlewareCommand)
  }
  if (command.type === 'workspace.replace') {
    Object.assign(workspace, structuredClone(command.workspace))
    return changed()
  }
  throw new Error(`Unsupported workspace command: ${String(command.type)}`)
}
