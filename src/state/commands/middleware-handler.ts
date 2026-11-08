import { createMiddlewareCategories, type MiddlewarePipelineCategory, type Workspace } from '../../domain/workspace'
import { changed, unchanged } from './results'
import type { MiddlewareCommand, WorkspaceCommandResult } from './types'

const findPipelineCategory = (workspace: Workspace, middlewareDefinitionId: string) => workspace.middleware.items
  .find(({ definitionId }) => definitionId === middlewareDefinitionId)
  ?.categories.find((candidate): candidate is MiddlewarePipelineCategory => candidate.kind === 'pipelines')

const findPipeline = (workspace: Workspace, definitionId: string) => workspace.middleware.items
  .flatMap(({ categories }) => categories.flatMap((category) => category.kind === 'pipelines' ? category.items : []))
  .find((pipeline) => pipeline.definitionId === definitionId)

export const applyMiddlewareCommand = (workspace: Workspace, command: MiddlewareCommand): WorkspaceCommandResult => {
  switch (command.type) {
    case 'middleware.create':
      workspace.middleware.items.push({
        definitionId: command.definitionId,
        name: command.name,
        categories: createMiddlewareCategories(command.definitionId),
      })
      return changed(command.definitionId)
    case 'middleware.rename': {
      const middleware = workspace.middleware.items.find(({ definitionId }) => definitionId === command.definitionId)
      if (!middleware) return unchanged()
      middleware.name = command.name
      return changed()
    }
    case 'middleware.delete': {
      const index = workspace.middleware.items.findIndex(({ definitionId }) => definitionId === command.definitionId)
      if (index < 0) return unchanged()
      workspace.middleware.items.splice(index, 1)
      return changed()
    }
    case 'pipeline.create': {
      const category = findPipelineCategory(workspace, command.middlewareDefinitionId)
      if (!category) return unchanged()
      category.items.push({ definitionId: command.definitionId, name: command.name, transform: { mappings: [] } })
      return changed(command.definitionId)
    }
    case 'pipeline.rename': {
      const pipeline = findPipeline(workspace, command.definitionId)
      if (!pipeline) return unchanged()
      pipeline.name = command.name
      return changed()
    }
    case 'pipeline.update': {
      const pipeline = findPipeline(workspace, command.definitionId)
      if (!pipeline) return unchanged()
      Object.assign(pipeline, command.changes)
      return changed()
    }
    case 'pipeline.delete':
      for (const middleware of workspace.middleware.items) {
        const category = middleware.categories.find((candidate): candidate is MiddlewarePipelineCategory =>
          candidate.kind === 'pipelines')
        if (!category) continue
        const index = category.items.findIndex(({ definitionId }) => definitionId === command.definitionId)
        if (index >= 0) {
          category.items.splice(index, 1)
          return changed()
        }
      }
      return unchanged()
  }
}
