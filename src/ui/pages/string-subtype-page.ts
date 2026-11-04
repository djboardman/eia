import type { Workspace, StringDataTypeSubtype } from '../../domain/workspace'
import type { WorkspaceDispatcher } from '../../state/dispatcher'
import { toUpperCamelCase, upperCamelCaseNamePattern } from '../name-format'

interface StringSubtypePageDependencies {
  workspace: Workspace
  content: HTMLElement
  navigation: HTMLElement
  dispatch: WorkspaceDispatcher
}

export const createStringSubtypePage = ({
  workspace,
  content,
  navigation,
  dispatch,
}: StringSubtypePageDependencies) => {
const renderStringDataTypeSubtype = (subtype: StringDataTypeSubtype) => {
  content.replaceChildren()

  const header = document.createElement('header')
  header.className = 'designer-header'
  const titleGroup = document.createElement('div')
  const eyebrow = document.createElement('p')
  eyebrow.className = 'designer-eyebrow'
  eyebrow.textContent = 'String subtype'
  const heading = document.createElement('h1')
  heading.className = 'page-title technical-name'
  heading.textContent = subtype.name
  titleGroup.append(eyebrow, heading)
  header.append(titleGroup)

  const form = document.createElement('form')
  form.className = 'data-type-form'
  form.addEventListener('submit', (event) => event.preventDefault())

  const createField = (labelText: string, control: HTMLElement) => {
    const field = document.createElement('label')
    field.className = 'data-type-field'
    const label = document.createElement('span')
    label.className = 'data-type-label'
    label.textContent = labelText
    field.append(label, control)
    return field
  }

  const name = document.createElement('input')
  name.className = 'data-type-input technical-name'
  name.value = subtype.name
  name.required = true
  name.pattern = '[A-Z][A-Za-z0-9]*'
  name.title = 'Use UpperCamelCase, for example IsoDate'
  name.setAttribute('aria-label', 'Type name')
  name.addEventListener('change', () => {
    const nextName = toUpperCamelCase(name.value)
    if (!nextName || !upperCamelCaseNamePattern.test(nextName)) {
      name.value = subtype.name
      name.setCustomValidity('Use UpperCamelCase and start with a letter.')
      name.reportValidity()
      name.setCustomValidity('')
      return
    }
    dispatch({
      type: 'stringSubtype.update',
      definitionId: subtype.definitionId,
      changes: { name: nextName },
    }, false)
    name.value = nextName
    heading.textContent = nextName
    const treeLabel = navigation.querySelector<HTMLButtonElement>(`[data-data-type-id="${subtype.definitionId}"]`)
    if (treeLabel) treeLabel.textContent = nextName
  })

  const pattern = document.createElement('input')
  pattern.className = 'data-type-input technical-name'
  pattern.value = subtype.pattern
  pattern.placeholder = 'For example: ^[A-Z]{3}$'
  pattern.setAttribute('aria-label', 'Regular expression pattern')
  pattern.addEventListener('input', () => {
    dispatch({
      type: 'stringSubtype.update',
      definitionId: subtype.definitionId,
      changes: { pattern: pattern.value },
    }, false)
  })

  const description = document.createElement('textarea')
  description.className = 'data-type-input data-type-textarea'
  description.value = subtype.description
  description.rows = 5
  description.setAttribute('aria-label', 'Description')
  description.addEventListener('input', () => {
    dispatch({
      type: 'stringSubtype.update',
      definitionId: subtype.definitionId,
      changes: { description: description.value },
    }, false)
  })

  const example = document.createElement('input')
  example.className = 'data-type-input technical-name'
  example.value = subtype.example
  example.placeholder = 'For example: 2026-11-03'
  example.setAttribute('aria-label', 'Example string')
  example.addEventListener('input', () => {
    dispatch({
      type: 'stringSubtype.update',
      definitionId: subtype.definitionId,
      changes: { example: example.value },
    }, false)
  })

  form.append(
    createField('Type name', name),
    createField('Regex pattern', pattern),
    createField('Example string', example),
    createField('Description', description),
  )
  content.append(header, form)
}


  return (definitionId: string) => {
    const subtype = workspace.dataTypes.stringSubtypes.find((item) => item.definitionId === definitionId)
    if (!subtype) return false
    renderStringDataTypeSubtype(subtype)
    return true
  }
}

