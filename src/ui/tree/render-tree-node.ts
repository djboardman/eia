import { ChevronRight, createElement as createIcon } from 'lucide'

export interface TreeNodeView {
  itemClassName?: string
  rowClassName: string
  rowContent: Node[]
  children?: HTMLElement
  stateKey?: string
  defaultOpen?: boolean
  selected?: boolean
}

const createMarker = (expandable: boolean) => {
  if (!expandable) return Object.assign(document.createElement('span'), { className: 'tree-chevron-spacer' })
  return createIcon(ChevronRight, {
    'aria-hidden': 'true',
    class: 'tree-chevron',
    height: 16,
    width: 16,
    'stroke-width': 1.75,
  })
}

export const renderTreeNode = (view: TreeNodeView, openState: Map<string, boolean>) => {
  const item = document.createElement('li')
  item.className = `tree-node${view.itemClassName ? ` ${view.itemClassName}` : ''}`
  const expandable = Boolean(view.children)
  const container = expandable ? document.createElement('details') : undefined
  const row = expandable ? document.createElement('summary') : document.createElement('div')
  row.className = view.rowClassName
  if (view.selected) row.classList.add('tree-selected')
  row.append(createMarker(expandable), ...view.rowContent)

  if (!container) {
    item.append(row)
    return item
  }

  const stateKey = view.stateKey ?? ''
  container.open = openState.get(stateKey) ?? view.defaultOpen ?? false
  container.addEventListener('toggle', () => openState.set(stateKey, container.open))
  container.append(row, view.children!)
  item.append(container)
  return item
}
