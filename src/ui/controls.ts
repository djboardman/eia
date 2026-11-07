import { MoreHorizontal, Plus, Trash2, type IconNode } from 'lucide'
import { createLucideIcon } from './icons'

export const createInlineEditor = (
  label: string,
  value: string,
  technical: boolean,
  finish: (commit: boolean, value?: string) => void,
) => {
  const input = document.createElement('input')
  input.className = technical ? 'explorer-tree-editor-input technical-name' : 'explorer-tree-editor-input'
  input.value = value
  input.setAttribute('aria-label', label)
  input.addEventListener('click', (event) => event.stopPropagation())
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      finish(true, input.value)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      finish(false)
    }
  })
  input.addEventListener('blur', () => finish(true, input.value))
  requestAnimationFrame(() => {
    input.focus()
    input.select()
  })
  return input
}

export const createTreeAction = (
  label: string,
  icon: IconNode | HTMLElement,
  action: () => void,
) => {
  const button = document.createElement('button')
  button.className = 'explorer-tree-action'
  button.type = 'button'
  button.title = label
  button.setAttribute('aria-label', label)
  button.append(icon instanceof HTMLElement ? icon : createLucideIcon(icon, 'explorer-tree-action-icon'))
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    action()
  })
  return button
}

export interface TreeMenuAction {
  label: string
  action: () => void
  blockedMessage?: string
  confirm?: string
  danger?: boolean
}

const createTreeMenuControl = (
  label: string,
  icon: IconNode,
  actions: TreeMenuAction[],
  directWhenSingle: boolean,
) => {
  if (directWhenSingle && actions.length === 1) {
    return createTreeAction(actions[0].label, icon, actions[0].action)
  }

  const container = document.createElement('span')
  container.className = 'explorer-tree-menu-container'
  const trigger = createTreeAction(label, icon, () => {
    menu.hidden = !menu.hidden
    trigger.setAttribute('aria-expanded', String(!menu.hidden))
    if (!menu.hidden) menu.querySelector<HTMLButtonElement>('button')?.focus()
  })
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', 'false')

  const menu = document.createElement('span')
  menu.className = 'explorer-tree-menu'
  menu.setAttribute('role', 'menu')
  menu.hidden = true
  for (const item of actions) {
    const button = document.createElement('button')
    button.className = item.danger
      ? 'explorer-tree-menu-item explorer-tree-menu-item-danger'
      : 'explorer-tree-menu-item'
    button.type = 'button'
    button.textContent = item.label
    button.setAttribute('role', 'menuitem')
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      menu.hidden = true
      trigger.setAttribute('aria-expanded', 'false')
      if (item.blockedMessage) {
        window.alert(item.blockedMessage)
        return
      }
      if (!item.confirm || window.confirm(item.confirm)) item.action()
    })
    menu.append(button)
  }
  container.addEventListener('focusout', (event) => {
    if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return
    menu.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
  })
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    menu.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
    trigger.focus()
  })
  container.append(trigger, menu)
  return container
}

export const createTreeAddControl = (actions: TreeMenuAction[]) =>
  createTreeMenuControl('Add', Plus, actions, true)

export const createTreeMoreControl = (actions: TreeMenuAction[]) =>
  createTreeMenuControl('More actions', MoreHorizontal, actions, false)

export const createToggleButton = (label: string, active: boolean, action: () => void) => {
  const button = document.createElement('button')
  button.className = 'schema-toggle'
  button.type = 'button'
  button.textContent = label
  button.setAttribute('aria-pressed', String(active))
  button.addEventListener('click', action)
  return button
}

export const createDeleteButton = (label: string, action: () => void, blockedMessage?: string) => {
  const button = document.createElement('button')
  button.className = 'tree-action attribute-delete-action'
  button.type = 'button'
  button.title = `Delete ${label}`
  button.setAttribute('aria-label', `Delete ${label}`)
  button.append(createLucideIcon(Trash2, 'tree-action-icon'))
  button.addEventListener('click', (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (blockedMessage) {
      window.alert(blockedMessage)
      return
    }
    if (window.confirm(`Delete ${label}?`)) action()
  })
  return button
}
