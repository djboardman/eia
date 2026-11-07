interface RouterDependencies {
  content: HTMLElement
  renderNavigation: () => void
  renderRecordTypes: () => void
  renderStringSubtype: (definitionId: string) => boolean
  renderRecordType: (definitionId: string) => boolean
  renderWsdlApi: (dataScopeDefinitionId: string, apiDefinitionId: string) => boolean
  renderPipeline: (middlewareDefinitionId: string, pipelineDefinitionId: string) => boolean
}

export const createRouter = ({
  content,
  renderNavigation,
  renderRecordTypes,
  renderStringSubtype,
  renderRecordType,
  renderWsdlApi,
  renderPipeline,
}: RouterDependencies) => () => {
  const route = window.location.hash || '#record-types'
  renderNavigation()
  if (route === '#record-types') return renderRecordTypes()

  const stringSubtypeMatch = route.match(/^#data-types\/string\/(.+)$/)
  if (stringSubtypeMatch && renderStringSubtype(stringSubtypeMatch[1])) return

  const recordTypeMatch = route.match(/^#record-types\/record-type\/(.+)$/)
  if (recordTypeMatch && renderRecordType(recordTypeMatch[1])) return

  const wsdlApiMatch = route.match(/^#applications\/data-scope\/([^/]+)\/api\/([^/]+)$/)
  if (wsdlApiMatch && renderWsdlApi(wsdlApiMatch[1], wsdlApiMatch[2])) return

  const pipelineMatch = route.match(/^#middleware\/([^/]+)\/pipeline\/([^/]+)$/)
  if (pipelineMatch && renderPipeline(pipelineMatch[1], pipelineMatch[2])) return
  content.replaceChildren()
}
