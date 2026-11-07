import { MoreHorizontal } from 'lucide'
import type { CommandRegistry } from './command-registry'
import { createLucideIcon } from './icons'

interface SidebarViewHeaderOptions {
  title: string
  commandIds: string[]
  commands: CommandRegistry
  count?: number
}

export const createSidebarViewHeader = ({ title, commandIds, commands, count }: SidebarViewHeaderOptions) => {
  const header = document.createElement('header')
  header.className = 'wb-sidebar-view-header'

  const heading = document.createElement('h2')
  heading.className = 'wb-sidebar-view-title'
  heading.textContent = title

  const actions = document.createElement('div')
  actions.className = 'wb-sidebar-view-actions'
  if (count) {
    const badge = document.createElement('span')
    badge.className = 'wb-sidebar-view-count'
    badge.textContent = count > 99 ? '99+' : String(count)
    badge.setAttribute('aria-label', `${count} pending change${count === 1 ? '' : 's'}`)
    actions.append(badge)
  }
  const container = document.createElement('div')
  container.className = 'wb-sidebar-view-menu-container'

  const trigger = document.createElement('button')
  trigger.className = 'wb-sidebar-view-menu-trigger'
  trigger.type = 'button'
  trigger.title = `${title} actions`
  trigger.setAttribute('aria-label', `${title} actions`)
  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', 'false')
  trigger.append(createLucideIcon(MoreHorizontal, 'ui-icon-compact'))

  const menu = document.createElement('div')
  menu.className = 'wb-sidebar-view-menu'
  menu.setAttribute('role', 'menu')
  menu.hidden = true

  const closeMenu = () => {
    menu.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
  }

  for (const commandId of commandIds) {
    const command = commands.get(commandId)
    if (!command) continue
    const item = document.createElement('button')
    item.className = 'wb-sidebar-view-menu-item'
    item.type = 'button'
    item.textContent = command.label
    item.setAttribute('role', 'menuitem')
    item.addEventListener('click', () => {
      closeMenu()
      commands.execute(commandId)
    })
    menu.append(item)
  }

  trigger.addEventListener('click', () => {
    menu.hidden = !menu.hidden
    trigger.setAttribute('aria-expanded', String(!menu.hidden))
    if (!menu.hidden) menu.querySelector<HTMLButtonElement>('button')?.focus()
  })
  container.addEventListener('focusout', (event) => {
    if (event.relatedTarget instanceof Node && container.contains(event.relatedTarget)) return
    closeMenu()
  })
  container.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return
    closeMenu()
    trigger.focus()
  })

  container.append(trigger, menu)
  actions.append(container)
  header.append(heading, actions)
  return header
}
