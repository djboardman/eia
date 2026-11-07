import { ChevronRight } from 'lucide'
import { createLucideIcon } from '../icons'

export interface ExplorerTreeItemView {
  rowContent: Node[]
  children?: HTMLUListElement
  stateKey?: string
  defaultOpen?: boolean
  selected?: boolean
}

const createExpander = (expandable: boolean) => {
  if (!expandable) {
    return Object.assign(document.createElement('span'), {
      className: 'explorer-tree-item-expander-spacer',
    })
  }
  return createLucideIcon(ChevronRight, 'explorer-tree-item-expander')
}

export const renderExplorerTreeItem = (
  view: ExplorerTreeItemView,
  openState: Map<string, boolean>,
) => {
  const item = document.createElement('li')
  item.className = 'explorer-tree-item'
  item.setAttribute('role', 'treeitem')
  item.setAttribute('aria-selected', String(Boolean(view.selected)))

  const expandable = Boolean(view.children)
  const container = expandable ? document.createElement('details') : undefined
  const row = expandable ? document.createElement('summary') : document.createElement('div')
  row.className = 'explorer-tree-item-row'
  if (view.selected) row.classList.add('explorer-tree-item-selected')
  row.append(createExpander(expandable), ...view.rowContent)

  if (!container) {
    item.append(row)
    return item
  }

  const stateKey = view.stateKey ?? ''
  container.open = openState.get(stateKey) ?? view.defaultOpen ?? false
  item.setAttribute('aria-expanded', String(container.open))
  container.addEventListener('toggle', () => {
    openState.set(stateKey, container.open)
    item.setAttribute('aria-expanded', String(container.open))
  })
  container.append(row, view.children!)
  item.append(container)
  return item
}
