import type { Workspace } from '../../domain/workspace'
import { createRecordTypeIcon } from '../icons'

export const renderRecordTypesPage = (content: HTMLElement, workspace: Workspace) => {
  content.replaceChildren()
  const header = document.createElement('header')
  header.className = 'page-header'
  const heading = document.createElement('h1')
  heading.className = 'page-title'
  heading.textContent = 'Record Types'
  header.append(heading)

  const categoryList = document.createElement('div')
  categoryList.className = 'category-list'
  if (workspace.recordTypes.categories.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'empty-state'
    empty.textContent = 'No categories yet.'
    categoryList.append(empty)
  }
  for (const category of workspace.recordTypes.categories) {
    const section = document.createElement('section')
    section.className = 'category-card'
    const categoryHeading = document.createElement('h2')
    categoryHeading.className = 'section-title'
    categoryHeading.textContent = category.name
    section.append(categoryHeading)
    const typeList = document.createElement('ul')
    typeList.className = 'record-types'
    for (const recordType of category.recordTypes) {
      const item = document.createElement('li')
      item.className = 'record-type-row'
      const name = document.createElement('span')
      name.textContent = recordType.name
      item.append(createRecordTypeIcon('root'), name)
      typeList.append(item)
    }
    if (category.recordTypes.length === 0) {
      const emptyItem = document.createElement('li')
      emptyItem.className = 'empty-state'
      emptyItem.textContent = 'No record types yet.'
      typeList.append(emptyItem)
    }
    section.append(typeList)
    categoryList.append(section)
  }
  content.append(header, categoryList)
}
