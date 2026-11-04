interface RouterDependencies {
  content: HTMLElement
  renderNavigation: () => void
  renderRecordTypes: () => void
  renderStringSubtype: (definitionId: string) => boolean
  renderRecordType: (definitionId: string) => boolean
}

export const createRouter = ({
  content,
  renderNavigation,
  renderRecordTypes,
  renderStringSubtype,
  renderRecordType,
}: RouterDependencies) => () => {
  const route = window.location.hash || '#record-types'
  renderNavigation()
  if (route === '#record-types') return renderRecordTypes()

  const stringSubtypeMatch = route.match(/^#data-types\/string\/(.+)$/)
  if (stringSubtypeMatch && renderStringSubtype(stringSubtypeMatch[1])) return

  const recordTypeMatch = route.match(/^#record-types\/record-type\/(.+)$/)
  if (recordTypeMatch && renderRecordType(recordTypeMatch[1])) return
  content.replaceChildren()
}
