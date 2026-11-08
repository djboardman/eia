import { createDataScopeCategories, type Workspace } from '../../domain/workspace'
import { changed, unchanged } from './results'
import type { ApplicationCommand, WorkspaceCommandResult } from './types'

export const applyApplicationCommand = (workspace: Workspace, command: ApplicationCommand): WorkspaceCommandResult => {
  switch (command.type) {
    case 'dataScope.create':
      workspace.applications.dataScopeCollection.items.push({
        definitionId: command.definitionId,
        name: command.name,
        categories: createDataScopeCategories(command.definitionId),
      })
      return changed(command.definitionId)
    case 'dataScope.rename': {
      const scope = workspace.applications.dataScopeCollection.items.find(
        ({ definitionId }) => definitionId === command.definitionId,
      )
      if (!scope) return unchanged()
      scope.name = command.name
      return changed()
    }
    case 'dataScope.delete': {
      const scopes = workspace.applications.dataScopeCollection.items
      const index = scopes.findIndex(({ definitionId }) => definitionId === command.definitionId)
      if (index < 0) return unchanged()
      scopes.splice(index, 1)
      return changed()
    }
    case 'api.importWsdl': {
      const category = workspace.applications.dataScopeCollection.items
        .find(({ definitionId }) => definitionId === command.dataScopeDefinitionId)
        ?.categories.find(({ definitionId }) => definitionId === command.categoryDefinitionId)
      if (!category || category.kind !== 'apis') return unchanged()
      category.items.push({
        definitionId: command.definitionId,
        name: command.name,
        source: { kind: 'wsdl', fileName: command.fileName, document: command.document },
        model: structuredClone(command.model),
      })
      return changed(command.definitionId)
    }
  }
}
