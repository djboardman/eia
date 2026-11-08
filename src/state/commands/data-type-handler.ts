import type { Workspace } from '../../domain/workspace'
import { changed, unchanged } from './results'
import type { DataTypeCommand, WorkspaceCommandResult } from './types'

export const applyDataTypeCommand = (workspace: Workspace, command: DataTypeCommand): WorkspaceCommandResult => {
  switch (command.type) {
    case 'stringSubtype.create':
      workspace.dataTypes.stringSubtypes.push({
        definitionId: command.definitionId,
        name: command.name,
        pattern: '',
        example: '',
        description: '',
      })
      return changed(command.definitionId)
    case 'stringSubtype.update': {
      const subtype = workspace.dataTypes.stringSubtypes.find(({ definitionId }) => definitionId === command.definitionId)
      if (!subtype) return unchanged()
      Object.assign(subtype, command.changes)
      return changed()
    }
    case 'stringSubtype.delete': {
      const index = workspace.dataTypes.stringSubtypes.findIndex(({ definitionId }) => definitionId === command.definitionId)
      if (index < 0) return unchanged()
      workspace.dataTypes.stringSubtypes.splice(index, 1)
      return changed()
    }
  }
}
