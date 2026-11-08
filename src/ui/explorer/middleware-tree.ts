import { Boxes, Route, Server, SquareArrowOutUpRight, Workflow } from 'lucide'
import { createLucideIcon } from '../icons'
import { routes } from '../routes'
import { renderExplorerTreeItem } from './render-explorer-tree-item'
import type { ExplorerFeatureContext } from './types'

export const renderMiddlewareTree = (context: ExplorerFeatureContext) => {
  const { workspace, nodeEditor, hierarchyOpenState, dispatch, startEditing } = context
  const middlewareList = document.createElement('ul')
  middlewareList.className = 'explorer-tree-item-children'
  middlewareList.setAttribute('role', 'group')

  for (const middleware of workspace.middleware.items) {
    const categoryList = document.createElement('ul')
    categoryList.className = 'explorer-tree-item-children'
    categoryList.setAttribute('role', 'group')
    for (const category of middleware.categories) {
      const pipelineChildren = document.createElement('ul')
      pipelineChildren.className = 'explorer-tree-item-children'
      pipelineChildren.setAttribute('role', 'group')
      if (category.kind === 'pipelines') {
        for (const pipeline of category.items) {
          const route = routes.pipeline(middleware.definitionId, pipeline.definitionId)
          const rowContent: Node[] = [createLucideIcon(Route, 'explorer-tree-item-icon-data-scope')]
          if (nodeEditor?.kind === 'pipeline' && nodeEditor.mode === 'rename' && nodeEditor.id === pipeline.definitionId) {
            rowContent.push(context.createInlineEditor('Rename pipeline', pipeline.name, true))
          } else {
            const link = document.createElement('a')
            link.className = 'explorer-tree-item-label-technical'
            link.href = route
            link.textContent = pipeline.name
            link.addEventListener('click', (event) => event.stopPropagation())
            const actions = document.createElement('span')
            actions.className = 'explorer-tree-item-actions'
            actions.append(context.createMoreControl([
              {
                label: 'Rename',
                action: () => startEditing({
                  kind: 'pipeline', mode: 'rename', id: pipeline.definitionId,
                  parentId: middleware.definitionId, value: pipeline.name,
                }),
              },
              {
                label: 'Delete', danger: true, confirm: `Delete pipeline “${pipeline.name}”?`,
                action: () => dispatch({ type: 'pipeline.delete', definitionId: pipeline.definitionId }),
              },
            ]))
            rowContent.push(link, actions)
          }
          pipelineChildren.append(renderExplorerTreeItem({
            rowContent,
            selected: window.location.hash === route,
          }, hierarchyOpenState))
        }
        if (nodeEditor?.kind === 'pipeline' && nodeEditor.mode === 'create'
          && nodeEditor.parentId === middleware.definitionId) {
          const editorItem = document.createElement('li')
          editorItem.className = 'explorer-tree-item explorer-tree-editor-row'
          editorItem.setAttribute('role', 'treeitem')
          editorItem.append(
            Object.assign(document.createElement('span'), { className: 'explorer-tree-item-expander-spacer' }),
            createLucideIcon(Route, 'explorer-tree-item-icon-data-scope'),
            context.createInlineEditor('New pipeline', '', true),
          )
          pipelineChildren.append(editorItem)
        }
      }
      const icon = category.kind === 'apis' ? Server : category.kind === 'clients' ? SquareArrowOutUpRight : Workflow
      const label = document.createElement('span')
      label.className = 'explorer-tree-item-label'
      label.textContent = category.name
      const actions = document.createElement('span')
      actions.className = 'explorer-tree-item-actions'
      if (category.kind === 'pipelines') {
        actions.append(context.createAddControl([{
          label: 'Pipeline',
          action: () => startEditing({ kind: 'pipeline', mode: 'create', parentId: middleware.definitionId }),
        }]))
      }
      categoryList.append(renderExplorerTreeItem({
        rowContent: [createLucideIcon(icon, 'explorer-tree-item-icon-data-scope'), label, actions],
        children: category.kind === 'pipelines' ? pipelineChildren : undefined,
        stateKey: `middleware:${middleware.definitionId}:${category.kind}`,
        defaultOpen: category.kind === 'pipelines',
      }, hierarchyOpenState))
    }

    const rowContent: Node[] = [createLucideIcon(Boxes, 'explorer-tree-item-icon-data-scope')]
    if (nodeEditor?.kind === 'middleware' && nodeEditor.mode === 'rename' && nodeEditor.id === middleware.definitionId) {
      rowContent.push(context.createInlineEditor('Rename middleware', middleware.name, true))
    } else {
      const label = document.createElement('span')
      label.className = 'explorer-tree-item-label-technical'
      label.textContent = middleware.name
      const actions = document.createElement('span')
      actions.className = 'explorer-tree-item-actions'
      actions.append(context.createMoreControl([
        {
          label: 'Rename',
          action: () => startEditing({
            kind: 'middleware', mode: 'rename', id: middleware.definitionId, value: middleware.name,
          }),
        },
        {
          label: 'Delete', danger: true, confirm: `Delete middleware “${middleware.name}”?`,
          action: () => dispatch({ type: 'middleware.delete', definitionId: middleware.definitionId }),
        },
      ]))
      rowContent.push(label, actions)
    }
    middlewareList.append(renderExplorerTreeItem({
      rowContent,
      children: categoryList,
      stateKey: `middleware:${middleware.definitionId}`,
      defaultOpen: true,
    }, hierarchyOpenState))
  }

  if (nodeEditor?.kind === 'middleware' && nodeEditor.mode === 'create') {
    const editorItem = document.createElement('li')
    editorItem.className = 'explorer-tree-item explorer-tree-editor-row'
    editorItem.setAttribute('role', 'treeitem')
    editorItem.append(
      Object.assign(document.createElement('span'), { className: 'explorer-tree-item-expander-spacer' }),
      createLucideIcon(Boxes, 'explorer-tree-item-icon-data-scope'),
      context.createInlineEditor('New middleware', '', true),
    )
    middlewareList.append(editorItem)
  }

  return middlewareList
}
