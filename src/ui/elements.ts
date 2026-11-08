export type ButtonVariant = 'primary' | 'secondary'

export const createButton = (
  label: string,
  variant: ButtonVariant,
  action?: () => void,
) => {
  const button = document.createElement('button')
  button.className = variant === 'primary' ? 'ui-button-primary' : 'ui-button-secondary'
  button.type = 'button'
  button.textContent = label
  if (action) button.addEventListener('click', action)
  return button
}

export const createLabelledField = (labelText: string, control: HTMLElement) => {
  const field = document.createElement('label')
  field.className = 'data-type-field'
  const label = document.createElement('span')
  label.className = 'data-type-label'
  label.textContent = labelText
  field.append(label, control)
  return field
}

export const createEmptyState = (message: string) => {
  const empty = document.createElement('p')
  empty.className = 'editor-empty-state-compact'
  empty.textContent = message
  return empty
}

export interface TabDefinition<T extends string> { id: T; label: string }

export const createTabList = <T extends string>(
  tabs: readonly TabDefinition<T>[],
  active: T,
  select: (id: T) => void,
) => {
  const list = document.createElement('div')
  list.className = 'editor-tabs'
  list.setAttribute('role', 'tablist')
  for (const definition of tabs) {
    const tab = document.createElement('button')
    tab.className = 'editor-tab'
    tab.type = 'button'
    tab.textContent = definition.label
    tab.setAttribute('role', 'tab')
    tab.setAttribute('aria-selected', String(active === definition.id))
    tab.addEventListener('click', () => select(definition.id))
    list.append(tab)
  }
  return list
}
