import { Search } from 'lucide'
import { createLucideIcon } from './icons'

export interface HierarchySelectorItem {
  id: string
  label: string
  selectable?: boolean
  children?: HierarchySelectorItem[]
}

interface HierarchySelectorOptions {
  title: string
  items: HierarchySelectorItem[]
  selectedId?: string
  searchPlaceholder?: string
  onSelect: (item: HierarchySelectorItem) => void
}

interface FlatHierarchySelectorItem {
  item: HierarchySelectorItem
  depth: number
  context: string
}

export const flattenHierarchySelectorItems = (
  items: HierarchySelectorItem[],
  depth = 0,
  ancestors: string[] = [],
): FlatHierarchySelectorItem[] => items.flatMap((item) => {
  const context = [...ancestors, item.label].join(' ')
  return [
    { item, depth, context },
    ...flattenHierarchySelectorItems(item.children ?? [], depth + 1, [...ancestors, item.label]),
  ]
})

export const openHierarchySelectorDialog = ({
  title,
  items,
  selectedId,
  searchPlaceholder = 'Search hierarchy',
  onSelect,
}: HierarchySelectorOptions) => {
  const dialog = document.createElement('dialog')
  dialog.className = 'hierarchy-selector-dialog'

  const content = document.createElement('div')
  content.className = 'hierarchy-selector-content'
  const header = document.createElement('header')
  header.className = 'hierarchy-selector-header'
  const heading = document.createElement('h2')
  heading.className = 'hierarchy-selector-title'
  heading.textContent = title
  header.append(heading)

  const searchField = document.createElement('label')
  searchField.className = 'hierarchy-selector-search'
  searchField.append(createLucideIcon(Search, 'ui-icon-compact'))
  const search = document.createElement('input')
  search.className = 'ui-text-input hierarchy-selector-search-input'
  search.type = 'search'
  search.placeholder = searchPlaceholder
  search.setAttribute('aria-label', searchPlaceholder)
  searchField.append(search)

  const results = document.createElement('div')
  results.className = 'hierarchy-selector-results'
  results.setAttribute('role', 'tree')
  const flatItems = flattenHierarchySelectorItems(items)
  let pendingItem = flatItems.find(({ item }) => item.id === selectedId)?.item

  const footer = document.createElement('footer')
  footer.className = 'hierarchy-selector-footer'
  const cancel = document.createElement('button')
  cancel.className = 'ui-button-secondary'
  cancel.type = 'button'
  cancel.textContent = 'Cancel'
  cancel.addEventListener('click', () => dialog.close())
  const confirm = document.createElement('button')
  confirm.className = 'ui-button-primary'
  confirm.type = 'button'
  confirm.textContent = 'OK'
  confirm.disabled = !pendingItem
  confirm.addEventListener('click', () => {
    if (!pendingItem) return
    onSelect(pendingItem)
    dialog.close()
  })
  footer.append(cancel, confirm)

  const renderResults = () => {
    results.replaceChildren()
    const query = search.value.trim().toLocaleLowerCase()
    const visible = query
      ? flatItems.filter(({ context }) => context.toLocaleLowerCase().includes(query))
      : flatItems
    for (const { item, depth } of visible) {
      const row = document.createElement(item.selectable === false ? 'div' : 'button')
      row.className = item.selectable === false
        ? 'hierarchy-selector-row hierarchy-selector-row-group'
        : 'hierarchy-selector-row'
      row.style.setProperty('--hierarchy-depth', String(depth))
      row.setAttribute('role', 'treeitem')
      row.setAttribute('aria-level', String(depth + 1))
      const label = document.createElement('span')
      label.className = 'hierarchy-selector-row-label'
      label.textContent = item.label
      row.append(label)
      if (item.selectable !== false) {
        const button = row as HTMLButtonElement
        button.type = 'button'
        const selected = item.id === pendingItem?.id
        button.setAttribute('aria-selected', String(selected))
        button.addEventListener('click', () => {
          pendingItem = item
          confirm.disabled = false
          renderResults()
        })
      }
      results.append(row)
    }
    if (visible.length === 0) {
      const empty = document.createElement('p')
      empty.className = 'editor-empty-state-centered'
      empty.textContent = 'No matching items.'
      results.append(empty)
    }
  }

  search.addEventListener('input', renderResults)
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  dialog.addEventListener('close', () => dialog.remove())
  content.append(header, searchField, results, footer)
  dialog.append(content)
  document.body.append(dialog)
  renderResults()
  dialog.showModal()
  search.focus()
}
