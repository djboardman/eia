import { Settings, X } from 'lucide'
import { createLucideIcon } from './icons'

export type ThemeName = 'light' | 'dark'

const themeStorageKey = 'eia-theme'

const loadTheme = (): ThemeName => localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light'

const applyTheme = (theme: ThemeName) => {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(themeStorageKey, theme)
}

export const initializeTheme = () => applyTheme(loadTheme())

export const createThemeSettings = (activityBar: HTMLElement) => {
  const spacer = document.createElement('div')
  spacer.className = 'activity-bar-spacer'

  const button = document.createElement('button')
  button.className = 'activity-button'
  button.type = 'button'
  button.title = 'Settings'
  button.setAttribute('aria-label', 'Settings')
  button.append(createLucideIcon(Settings, 'activity-icon'))

  const dialog = document.createElement('dialog')
  dialog.className = 'theme-settings-dialog'
  dialog.setAttribute('aria-labelledby', 'theme-settings-title')

  const content = document.createElement('div')
  content.className = 'theme-settings-content'
  const header = document.createElement('header')
  header.className = 'theme-settings-header'
  const title = document.createElement('h2')
  title.id = 'theme-settings-title'
  title.className = 'theme-settings-title'
  title.textContent = 'Settings'
  const close = document.createElement('button')
  close.className = 'tree-action'
  close.type = 'button'
  close.title = 'Close settings'
  close.setAttribute('aria-label', 'Close settings')
  close.append(createLucideIcon(X, 'tree-action-icon'))
  close.addEventListener('click', () => dialog.close())
  header.append(title, close)

  const field = document.createElement('label')
  field.className = 'theme-settings-field'
  const label = document.createElement('span')
  label.className = 'theme-settings-label'
  label.textContent = 'Colour theme'
  const select = document.createElement('select')
  select.className = 'ui-select-control'
  select.setAttribute('aria-label', 'Colour theme')
  for (const [value, optionLabel] of [['light', 'Light'], ['dark', 'Dark']] as const) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = optionLabel
    select.append(option)
  }
  select.value = loadTheme()
  select.addEventListener('change', () => applyTheme(select.value as ThemeName))
  field.append(label, select)
  content.append(header, field)
  dialog.append(content)
  document.body.append(dialog)

  button.addEventListener('click', () => dialog.showModal())
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  activityBar.append(spacer, button)
}
