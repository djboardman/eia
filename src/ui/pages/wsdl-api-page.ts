import { ChevronRight, FileCode2 } from 'lucide'
import type { ApiDefinition, Workspace, WsdlApiModel, WsdlSchemaField } from '../../domain/workspace'
import { createLucideIcon } from '../icons'

type ApiEditorTab = 'overview' | 'operations' | 'contracts' | 'raw'

interface WsdlApiPageDependencies {
  workspace: Workspace
  content: HTMLElement
}

const appendText = (parent: HTMLElement, className: string, value: string) => {
  const element = document.createElement('span')
  element.className = className
  element.textContent = value
  parent.append(element)
  return element
}

const createEmptyState = (message: string) => {
  const empty = document.createElement('p')
  empty.className = 'editor-empty-state-compact'
  empty.textContent = message
  return empty
}

const createProperty = (label: string, value: string, technical = true) => {
  const property = document.createElement('div')
  property.className = 'api-property'
  appendText(property, 'api-property-label', label)
  appendText(property, technical ? 'api-property-value technical-name' : 'api-property-value', value || '—')
  return property
}

const createSection = (title: string) => {
  const section = document.createElement('section')
  section.className = 'editor-card'
  const heading = document.createElement('h2')
  heading.className = 'editor-card-title'
  heading.textContent = title
  section.append(heading)
  return section
}

const renderOverview = (api: ApiDefinition) => {
  const panel = document.createElement('div')
  panel.className = 'api-panel'
  const model = api.model
  const fieldCount = model.contracts.reduce((total, contract) => total + contract.fields.length, 0)
  const summary = createSection('Extraction summary')
  const stats = document.createElement('div')
  stats.className = 'api-stat-grid'
  const values: Array<[string, number]> = [
    ['Services', model.services.length],
    ['Endpoints', model.endpoints.length],
    ['Operations', model.operations.length],
    ['Messages', model.messages.length],
    ['Contracts', model.contracts.length],
    ['Fields', fieldCount],
  ]
  for (const [label, value] of values) {
    const stat = document.createElement('div')
    stat.className = 'api-stat'
    appendText(stat, 'api-stat-value', String(value))
    appendText(stat, 'api-stat-label', label)
    stats.append(stat)
  }
  summary.append(stats, createProperty('Target namespace', model.targetNamespace))

  const policies = document.createElement('div')
  policies.className = 'api-property'
  appendText(policies, 'api-property-label', 'Policy assertions')
  if (model.policies.length) {
    const list = document.createElement('div')
    list.className = 'api-badge-list'
    for (const policy of model.policies) appendText(list, 'api-badge technical-name', policy)
    policies.append(list)
  } else {
    appendText(policies, 'api-property-value', 'None captured')
  }
  summary.append(policies)

  const schema = createSection('Schema inventory')
  const schemaStats = document.createElement('div')
  schemaStats.className = 'api-stat-grid'
  for (const [label, value] of [
    ['Namespaces', model.schema.namespaces.length],
    ['Elements', model.schema.elements.length],
    ['Complex types', model.schema.complexTypes.length],
    ['Simple types', model.schema.simpleTypes.length],
  ] as Array<[string, number]>) {
    const stat = document.createElement('div')
    stat.className = 'api-stat'
    appendText(stat, 'api-stat-value', String(value))
    appendText(stat, 'api-stat-label', label)
    schemaStats.append(stat)
  }
  schema.append(schemaStats)
  panel.append(summary, schema)
  return panel
}

type WsdlOperation = WsdlApiModel['operations'][number]
type WsdlOperationBinding = WsdlOperation['bindings'][number]

const protocolLabel = (protocol: WsdlOperationBinding['protocol']) =>
  protocol === 'soap11' ? 'SOAP 1.1' : protocol === 'soap12' ? 'SOAP 1.2' : 'Unknown SOAP version'

const localPart = (name: string | undefined) => {
  if (!name) return undefined
  const expandedNameEnd = name.lastIndexOf('}')
  if (expandedNameEnd >= 0) return name.slice(expandedNameEnd + 1)
  return name.includes(':') ? name.slice(name.lastIndexOf(':') + 1) : name
}

const contentTypeFor = (protocol: WsdlOperationBinding['protocol'], soapAction?: string) => {
  if (protocol === 'soap12') {
    return `application/soap+xml; charset=utf-8${soapAction ? `; action="${soapAction}"` : ''}`
  }
  return 'text/xml; charset=utf-8'
}

const requestEnvelope = (
  model: WsdlApiModel,
  operation: WsdlOperation,
  protocol: WsdlOperationBinding['protocol'],
) => {
  const contract = model.contracts.find(({ operationName, direction }) =>
    operationName === operation.name && direction === 'input')
  const root = localPart(contract?.rootElement) ?? localPart(operation.inputMessage) ?? `${operation.name}Request`
  const envelopeNamespace = protocol === 'soap12'
    ? 'http://www.w3.org/2003/05/soap-envelope'
    : 'http://schemas.xmlsoap.org/soap/envelope/'
  const namespace = model.targetNamespace
  const namespaceDeclaration = namespace ? ` xmlns:tns="${namespace}"` : ''
  const qualifiedRoot = namespace ? `tns:${root}` : root
  return `<soapenv:Envelope xmlns:soapenv="${envelopeNamespace}"${namespaceDeclaration}>
  <soapenv:Header/>
  <soapenv:Body>
    <${qualifiedRoot}>
      <!-- Populate according to the input contract -->
    </${qualifiedRoot}>
  </soapenv:Body>
</soapenv:Envelope>`
}

const httpRequest = (model: WsdlApiModel, operation: WsdlOperation, binding: WsdlOperationBinding) => {
  const endpoint = model.endpoints.find((candidate) => candidate.binding === binding.binding)?.address
    ?? 'https://host/path'
  const host = endpoint.match(/^https?:\/\/([^/]+)/)?.[1] ?? 'host'
  const path = endpoint.replace(/^https?:\/\/[^/]+/, '') || '/'
  const headers = [
    `POST ${path} HTTP/1.1`,
    `Host: ${host}`,
    `Content-Type: ${contentTypeFor(binding.protocol, binding.soapAction)}`,
  ]
  if (binding.protocol !== 'soap12' && binding.soapAction) {
    headers.push(`SOAPAction: "${binding.soapAction}"`)
  }
  return `${headers.join('\n')}\n\n${requestEnvelope(model, operation, binding.protocol)}`
}

const createResponseTable = (
  model: WsdlApiModel,
  operation: WsdlOperation,
  protocol: WsdlOperationBinding['protocol'],
) => {
  const section = document.createElement('section')
  section.className = 'api-responses'
  const heading = document.createElement('h4')
  heading.className = 'api-call-guide-title'
  heading.textContent = 'Responses'
  const table = document.createElement('table')
  table.className = 'api-response-table'
  const head = document.createElement('thead')
  const headRow = document.createElement('tr')
  for (const label of ['Response', 'Meaning', 'Payload']) {
    const cell = document.createElement('th')
    cell.className = 'api-response-header'
    cell.scope = 'col'
    cell.textContent = label
    headRow.append(cell)
  }
  head.append(headRow)
  const body = document.createElement('tbody')
  const addRow = (response: string, meaning: string, payload: string) => {
    const row = document.createElement('tr')
    for (const [value, technical] of [[response, false], [meaning, false], [payload, true]] as const) {
      const cell = document.createElement('td')
      cell.className = technical ? 'api-response-cell technical-name' : 'api-response-cell'
      cell.textContent = value
      row.append(cell)
    }
    body.append(row)
  }
  const output = model.contracts.find(({ operationName, direction }) =>
    operationName === operation.name && direction === 'output')
  const faults = model.contracts.filter(({ operationName, direction }) =>
    operationName === operation.name && direction === 'fault')
  const faultPayload = faults
    .map((contract) => contract.rootElement ?? contract.message)
    .filter(Boolean)
    .join(', ') || 'SOAP Fault'
  if (protocol === 'soap12') {
    addRow(
      operation.oneWay ? '202 Accepted' : '200 OK',
      operation.oneWay
        ? 'The request was accepted and the operation defines no outbound SOAP envelope.'
        : 'The operation completed and returned its WSDL-defined output.',
      operation.oneWay ? 'None' : output?.rootElement ?? output?.message ?? 'SOAP response',
    )
    addRow('400 Bad Request', 'SOAP Sender fault: the request or message could not be processed as sent.', faultPayload)
    addRow('500 Internal Server Error', 'SOAP Receiver, VersionMismatch, MustUnderstand, or processing fault.', faultPayload)
  } else {
    addRow(
      operation.oneWay ? '2xx Success' : '200 OK',
      operation.oneWay
        ? 'The request was received, understood and accepted. This WSDL does not choose between 200 and 202.'
        : 'The operation completed and returned its WSDL-defined output.',
      operation.oneWay ? 'None' : output?.rootElement ?? output?.message ?? 'SOAP response',
    )
    addRow('500 Internal Server Error', 'A SOAP processing error occurred.', faultPayload)
  }
  table.append(head, body)
  section.append(heading, table)
  return section
}

const createDeveloperGuide = (model: WsdlApiModel, operation: WsdlOperation) => {
  const guide = document.createElement('section')
  guide.className = 'api-call-guide'
  const heading = document.createElement('h4')
  heading.className = 'api-call-guide-title'
  heading.textContent = 'How to call this operation'
  guide.append(heading)

  const bindings = operation.bindings.filter((binding, index, all) =>
    binding.protocol !== 'unknown'
    && all.findIndex((candidate) => candidate.protocol === binding.protocol) === index)
  if (!bindings.length) {
    guide.append(createEmptyState('No callable SOAP binding was captured for this operation.'))
    return guide
  }
  for (const binding of bindings) {
    const request = document.createElement('section')
    request.className = 'api-request-example'
    const version = document.createElement('h5')
    version.className = 'api-request-version'
    version.textContent = protocolLabel(binding.protocol)
    const example = document.createElement('pre')
    example.className = 'api-call-example'
    example.textContent = httpRequest(model, operation, binding)
    request.append(version, example, createResponseTable(model, operation, binding.protocol))
    guide.append(request)
  }
  return guide
}

const renderOperations = (model: WsdlApiModel) => {
  const panel = document.createElement('div')
  panel.className = 'api-panel'
  if (!model.operations.length) panel.append(createEmptyState('No operations were captured.'))
  for (const operation of model.operations) panel.append(createDeveloperGuide(model, operation))
  return panel
}

const fieldCardinality = (field: WsdlSchemaField) => `${field.minOccurs}..${field.maxOccurs}`

const createFieldRow = (field: WsdlSchemaField) => {
  const row = document.createElement('div')
  row.className = 'api-contract-field'
  const identity = document.createElement('div')
  identity.className = 'api-contract-field-identity'
  const path = appendText(identity, 'api-contract-path technical-name', field.path)
  path.title = field.qname
  const metadata = document.createElement('div')
  metadata.className = 'api-badge-list'
  appendText(metadata, 'api-badge', field.nodeKind)
  appendText(metadata, 'api-badge technical-name', fieldCardinality(field))
  if (field.nullable) appendText(metadata, 'api-badge', 'nullable')
  if (field.repeated) appendText(metadata, 'api-badge', 'repeated')
  if (field.compositor) appendText(metadata, 'api-badge', field.compositor)
  identity.append(metadata)

  const type = document.createElement('div')
  type.className = 'api-contract-type'
  appendText(type, 'api-property-label', 'Type')
  appendText(type, 'api-property-value technical-name', field.primitiveType ?? field.type ?? 'anonymous')

  const detail = document.createElement('div')
  detail.className = 'api-contract-detail'
  if (field.constraints.length) {
    const constraints = document.createElement('div')
    constraints.className = 'api-badge-list'
    for (const constraint of field.constraints) {
      appendText(constraints, 'api-badge technical-name', `${constraint.kind}=${constraint.value}`)
    }
    detail.append(constraints)
  }
  if (field.documentation) appendText(detail, 'api-contract-documentation', field.documentation)
  row.append(identity, type, detail)
  return row
}

const renderContracts = (model: WsdlApiModel) => {
  const panel = document.createElement('div')
  panel.className = 'api-panel'
  if (!model.contracts.length) {
    panel.append(createEmptyState('No contracts were captured.'))
    return panel
  }
  model.contracts.forEach((contract, index) => {
    const disclosure = document.createElement('details')
    disclosure.className = 'api-contract'
    disclosure.open = index === 0
    const summary = document.createElement('summary')
    summary.className = 'api-contract-summary'
    summary.append(createLucideIcon(ChevronRight, 'api-contract-chevron'))
    appendText(summary, 'api-direction-badge', contract.direction)
    const identity = document.createElement('span')
    identity.className = 'api-contract-identity'
    appendText(identity, 'api-contract-operation technical-name', contract.operationName)
    appendText(identity, 'api-contract-root technical-name', contract.rootElement ?? contract.message ?? 'Unresolved contract')
    summary.append(identity)
    appendText(summary, 'api-contract-count', `${contract.fields.length} fields`)
    const fields = document.createElement('div')
    fields.className = 'api-contract-fields'
    if (!contract.fields.length) fields.append(createEmptyState('No fields were resolved for this contract.'))
    for (const field of contract.fields) fields.append(createFieldRow(field))
    disclosure.append(summary, fields)
    panel.append(disclosure)
  })
  return panel
}

const renderRawWsdl = (api: ApiDefinition) => {
  const panel = document.createElement('div')
  panel.className = 'api-panel'
  const pre = document.createElement('pre')
  pre.className = 'api-raw-wsdl'
  pre.textContent = api.source.document
  panel.append(pre)
  return panel
}

export const createWsdlApiPage = ({ workspace, content }: WsdlApiPageDependencies) => {
  const activeTabs = new Map<string, ApiEditorTab>()

  const renderPage = (dataScopeDefinitionId: string, apiDefinitionId: string): boolean => {
    const dataScope = workspace.applications.dataScopeCollection.items
      .find(({ definitionId }) => definitionId === dataScopeDefinitionId)
    const api = dataScope?.categories
      .find((category) => category.kind === 'apis')
      ?.items.find(({ definitionId }) => definitionId === apiDefinitionId)
    if (!api) return false

    const activeTab = activeTabs.get(api.definitionId) ?? 'overview'
    content.replaceChildren()
    const page = document.createElement('article')
    page.className = 'api-editor'
    const header = document.createElement('header')
    header.className = 'api-editor-header'
    const eyebrow = document.createElement('p')
    eyebrow.className = 'designer-eyebrow'
    eyebrow.textContent = 'WSDL API'
    const titleLine = document.createElement('div')
    titleLine.className = 'api-title-line'
    titleLine.append(createLucideIcon(FileCode2, 'api-title-icon'))
    const heading = document.createElement('h1')
    heading.className = 'page-title technical-name'
    heading.textContent = api.name
    titleLine.append(heading)
    const metadata = document.createElement('p')
    metadata.className = 'api-source-metadata'
    metadata.append(`WSDL ${api.model.version} · `)
    appendText(metadata, 'technical-name', api.source.fileName)
    header.append(eyebrow, titleLine, metadata)

    const tabList = document.createElement('div')
    tabList.className = 'editor-tabs'
    tabList.setAttribute('role', 'tablist')
    const tabs: Array<[ApiEditorTab, string]> = [
      ['overview', 'Overview'],
      ['operations', 'Operations'],
      ['contracts', 'Contracts'],
      ['raw', 'Raw WSDL'],
    ]
    for (const [id, label] of tabs) {
      const button = document.createElement('button')
      button.className = 'editor-tab'
      button.type = 'button'
      button.textContent = label
      button.setAttribute('role', 'tab')
      button.setAttribute('aria-selected', String(id === activeTab))
      button.addEventListener('click', () => {
        activeTabs.set(api.definitionId, id)
        renderPage(dataScopeDefinitionId, apiDefinitionId)
      })
      tabList.append(button)
    }

    const panel = activeTab === 'overview'
      ? renderOverview(api)
      : activeTab === 'operations'
        ? renderOperations(api.model)
        : activeTab === 'contracts'
          ? renderContracts(api.model)
          : renderRawWsdl(api)
    panel.setAttribute('role', 'tabpanel')
    page.append(header, tabList, panel)
    content.append(page)
    return true
  }

  return renderPage
}
