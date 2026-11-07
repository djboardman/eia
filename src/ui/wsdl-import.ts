import type {
  WsdlApiModel,
  WsdlConstraint,
  WsdlContract,
  WsdlSchemaField,
} from '../domain/workspace'

export interface WsdlImport {
  name: string
  document: string
  model: WsdlApiModel
}

const WSDL_11 = 'http://schemas.xmlsoap.org/wsdl/'
const WSDL_20 = 'http://www.w3.org/ns/wsdl'
const XSD = 'http://www.w3.org/2001/XMLSchema'
const SOAP_11 = 'http://schemas.xmlsoap.org/wsdl/soap/'
const SOAP_12 = 'http://schemas.xmlsoap.org/wsdl/soap12/'

const fileNameWithoutExtension = (fileName: string) => fileName.replace(/\.wsdl$/i, '')
const elements = (value: HTMLCollectionOf<Element> | NodeListOf<Element>) => Array.from(value)
const children = (element: Element, namespace: string, localName: string) =>
  elements(element.children).filter((candidate) => candidate.namespaceURI === namespace && candidate.localName === localName)
const child = (element: Element, namespace: string, localName: string) => children(element, namespace, localName)[0]
const documentation = (element: Element) => {
  const value = elements(element.getElementsByTagNameNS('*', 'documentation'))[0]?.textContent
    ?.replace(/\s+/g, ' ').trim()
  return value || undefined
}
const expandedName = (value: string | null, context: Element, fallbackNamespace = '') => {
  if (!value) return undefined
  const separator = value.indexOf(':')
  const prefix = separator >= 0 ? value.slice(0, separator) : null
  const localName = separator >= 0 ? value.slice(separator + 1) : value
  const namespace = context.lookupNamespaceURI(prefix) ?? fallbackNamespace
  return namespace ? `{${namespace}}${localName}` : localName
}
const localNameOf = (expanded: string) => expanded.replace(/^\{[^}]*\}/, '')
const namespaceOf = (expanded: string) => expanded.match(/^\{([^}]*)\}/)?.[1] ?? ''
const qname = (namespace: string, name: string) => namespace ? `{${namespace}}${name}` : name
const occurrence = (value: string | null, fallback: number): number | 'unbounded' =>
  value === 'unbounded' ? 'unbounded' : value === null ? fallback : Number(value)

interface SchemaIndex {
  elements: Map<string, Element>
  complexTypes: Map<string, Element>
  simpleTypes: Map<string, Element>
}

const primitiveType = (type: string | undefined, simpleTypes: Map<string, Element>): string | undefined => {
  if (!type) return undefined
  if (namespaceOf(type) === XSD) return localNameOf(type)
  const simpleType = simpleTypes.get(type)
  const restriction = simpleType && child(simpleType, XSD, 'restriction')
  if (!restriction) return undefined
  return primitiveType(expandedName(restriction.getAttribute('base'), restriction), simpleTypes)
}

const constraintsFor = (
  simpleType: Element | undefined,
  simpleTypes: Map<string, Element>,
  seen = new Set<Element>(),
): WsdlConstraint[] => {
  if (!simpleType || seen.has(simpleType)) return []
  seen.add(simpleType)
  const restriction = child(simpleType, XSD, 'restriction')
  if (!restriction) return []
  const base = expandedName(restriction.getAttribute('base'), restriction)
  const inherited = base ? constraintsFor(simpleTypes.get(base), simpleTypes, seen) : []
  const supported = new Set([
    'enumeration', 'pattern', 'length', 'minLength', 'maxLength', 'totalDigits', 'fractionDigits',
    'minInclusive', 'maxInclusive', 'minExclusive', 'maxExclusive', 'whiteSpace',
  ])
  return [
    ...inherited,
    ...elements(restriction.children)
      .filter((constraint) => constraint.namespaceURI === XSD && supported.has(constraint.localName))
      .map((constraint) => ({ kind: constraint.localName, value: constraint.getAttribute('value') ?? '' })),
  ]
}

const createSchemaIndex = (xml: XMLDocument): SchemaIndex => {
  const index: SchemaIndex = { elements: new Map(), complexTypes: new Map(), simpleTypes: new Map() }
  for (const schema of elements(xml.getElementsByTagNameNS(XSD, 'schema'))) {
    const namespace = schema.getAttribute('targetNamespace') ?? ''
    for (const declaration of elements(schema.children)) {
      const name = declaration.getAttribute('name')
      if (!name || declaration.namespaceURI !== XSD) continue
      const key = qname(namespace, name)
      if (declaration.localName === 'element') index.elements.set(key, declaration)
      if (declaration.localName === 'complexType') index.complexTypes.set(key, declaration)
      if (declaration.localName === 'simpleType') index.simpleTypes.set(key, declaration)
    }
  }
  return index
}

const complexTypeBase = (complexType: Element) => {
  const content = child(complexType, XSD, 'complexContent') ?? child(complexType, XSD, 'simpleContent')
  const derivation = content && (child(content, XSD, 'extension') ?? child(content, XSD, 'restriction'))
  return derivation ? expandedName(derivation.getAttribute('base'), derivation) : undefined
}

const schemaElement = (element: Element) => {
  let current: Element | null = element
  while (current && !(current.namespaceURI === XSD && current.localName === 'schema')) current = current.parentElement
  return current
}

const elementNamespace = (element: Element, targetNamespace: string) => {
  if (element.parentElement?.namespaceURI === XSD && element.parentElement.localName === 'schema') return targetNamespace
  const form = element.getAttribute('form') ?? schemaElement(element)?.getAttribute('elementFormDefault')
  return form === 'qualified' ? targetNamespace : ''
}

const simpleContentBase = (complexType: Element | undefined) => {
  if (!complexType) return undefined
  const content = child(complexType, XSD, 'simpleContent')
  const derivation = content && (child(content, XSD, 'extension') ?? child(content, XSD, 'restriction'))
  return derivation ? expandedName(derivation.getAttribute('base'), derivation) : undefined
}

const flattenRootElement = (rootName: string, index: SchemaIndex): WsdlSchemaField[] => {
  const root = index.elements.get(rootName)
  if (!root) return []
  const fields: WsdlSchemaField[] = []

  const flattenComplexType = (
    complexType: Element,
    path: string,
    namespace: string,
    visitedTypes: Set<string>,
  ) => {
    const content = child(complexType, XSD, 'complexContent') ?? child(complexType, XSD, 'simpleContent')
    const derivation = content && (child(content, XSD, 'extension') ?? child(content, XSD, 'restriction'))
    const base = derivation ? expandedName(derivation.getAttribute('base'), derivation, namespace) : undefined
    if (base && index.complexTypes.has(base) && !visitedTypes.has(base)) {
      flattenComplexType(index.complexTypes.get(base)!, path, namespaceOf(base), new Set(visitedTypes).add(base))
    }
    const container = derivation ?? complexType
    for (const particleName of ['sequence', 'choice', 'all']) {
      const particle = child(container, XSD, particleName)
      if (particle) flattenParticle(particle, path, namespace, visitedTypes)
    }
    flattenAttributes(container, path, namespace)
  }

  const flattenElement = (
    source: Element,
    namespace: string,
    path: string,
    compositor: WsdlSchemaField['compositor'] | undefined,
    inheritedRepeated: boolean,
    visitedTypes: Set<string>,
    occurrenceSource = source,
  ) => {
    const reference = expandedName(source.getAttribute('ref'), source, namespace)
    const declaration = reference ? index.elements.get(reference) ?? source : source
    const effectiveNamespace = reference ? namespaceOf(reference) : elementNamespace(declaration, namespace)
    const name = reference ? localNameOf(reference) : declaration.getAttribute('name') ?? 'anonymous'
    const currentPath = path ? `${path}/${name}` : name
    const minOccurs = occurrence(occurrenceSource.getAttribute('minOccurs'), 1) as number
    const maxOccurs = occurrence(occurrenceSource.getAttribute('maxOccurs'), 1)
    const type = expandedName(declaration.getAttribute('type'), declaration, effectiveNamespace)
    const inlineSimpleType = child(declaration, XSD, 'simpleType')
    const resolvedSimpleType = inlineSimpleType ?? (type ? index.simpleTypes.get(type) : undefined)
    const inlineRestriction = inlineSimpleType && child(inlineSimpleType, XSD, 'restriction')
    const inlineComplexType = child(declaration, XSD, 'complexType')
    const complexType = inlineComplexType ?? (type ? index.complexTypes.get(type) : undefined)
    const contentBase = simpleContentBase(complexType)
    fields.push({
      path: currentPath,
      name,
      qname: qname(effectiveNamespace, name),
      nodeKind: 'element',
      type,
      primitiveType: inlineRestriction
        ? primitiveType(expandedName(inlineRestriction.getAttribute('base'), inlineRestriction), index.simpleTypes)
        : primitiveType(type, index.simpleTypes) ?? primitiveType(contentBase, index.simpleTypes),
      minOccurs,
      maxOccurs,
      required: minOccurs > 0 && compositor !== 'choice',
      nullable: declaration.getAttribute('nillable') === 'true',
      repeated: inheritedRepeated || maxOccurs === 'unbounded' || maxOccurs > 1,
      compositor,
      defaultValue: declaration.getAttribute('default') ?? undefined,
      fixedValue: declaration.getAttribute('fixed') ?? undefined,
      documentation: documentation(declaration),
      constraints: constraintsFor(
        resolvedSimpleType ?? (contentBase ? index.simpleTypes.get(contentBase) : undefined),
        index.simpleTypes,
      ),
    })
    if (!complexType) return
    const typeKey = type ?? `${currentPath}:anonymous`
    if (visitedTypes.has(typeKey)) return
    flattenComplexType(complexType, currentPath, effectiveNamespace, new Set(visitedTypes).add(typeKey))
  }

  const flattenParticle = (
    particle: Element,
    path: string,
    namespace: string,
    visitedTypes: Set<string>,
    parentRepeated = false,
  ) => {
    const compositor = particle.localName as WsdlSchemaField['compositor']
    const particleMax = occurrence(particle.getAttribute('maxOccurs'), 1)
    const repeated = parentRepeated || particleMax === 'unbounded' || particleMax > 1
    for (const member of elements(particle.children)) {
      if (member.namespaceURI !== XSD) continue
      if (member.localName === 'element') {
        flattenElement(member, namespace, path, compositor, repeated, visitedTypes)
      } else if (['sequence', 'choice', 'all'].includes(member.localName)) {
        flattenParticle(member, path, namespace, visitedTypes, repeated)
      } else if (member.localName === 'any') {
        const minOccurs = occurrence(member.getAttribute('minOccurs'), 1) as number
        const maxOccurs = occurrence(member.getAttribute('maxOccurs'), 1)
        fields.push({
          path: `${path}/*`, name: '*', qname: '*', nodeKind: 'element', minOccurs, maxOccurs,
          required: minOccurs > 0 && compositor !== 'choice', nullable: true,
          repeated: repeated || maxOccurs === 'unbounded' || maxOccurs > 1,
          compositor, constraints: [],
        })
      }
    }
  }

  const flattenAttributes = (container: Element, path: string, namespace: string) => {
    for (const attribute of children(container, XSD, 'attribute')) {
      const reference = expandedName(attribute.getAttribute('ref'), attribute, namespace)
      const name = reference ? localNameOf(reference) : attribute.getAttribute('name') ?? 'anonymous'
      const type = expandedName(attribute.getAttribute('type'), attribute, namespace)
      const inlineSimpleType = child(attribute, XSD, 'simpleType')
      const inlineRestriction = inlineSimpleType && child(inlineSimpleType, XSD, 'restriction')
      fields.push({
        path: `${path}/@${name}`,
        name,
        qname: reference ?? qname(namespace, name),
        nodeKind: 'attribute',
        type,
        primitiveType: inlineRestriction
          ? primitiveType(expandedName(inlineRestriction.getAttribute('base'), inlineRestriction), index.simpleTypes)
          : primitiveType(type, index.simpleTypes),
        minOccurs: attribute.getAttribute('use') === 'required' ? 1 : 0,
        maxOccurs: 1,
        required: attribute.getAttribute('use') === 'required',
        nullable: false,
        repeated: false,
        defaultValue: attribute.getAttribute('default') ?? undefined,
        fixedValue: attribute.getAttribute('fixed') ?? undefined,
        documentation: documentation(attribute),
        constraints: constraintsFor(inlineSimpleType ?? (type ? index.simpleTypes.get(type) : undefined), index.simpleTypes),
      })
    }
  }

  flattenElement(root, namespaceOf(rootName), '', undefined, false, new Set())
  return fields
}

const parseModel = (xml: XMLDocument): WsdlApiModel => {
  const root = xml.documentElement
  const version = root.namespaceURI === WSDL_20 ? '2.0' as const : '1.1' as const
  const wsdlNamespace = version === '2.0' ? WSDL_20 : WSDL_11
  const targetNamespace = root.getAttribute('targetNamespace') ?? ''
  const schemaIndex = createSchemaIndex(xml)
  const services = elements(xml.getElementsByTagNameNS(wsdlNamespace, 'service')).map((service) => ({
    name: qname(targetNamespace, service.getAttribute('name') ?? ''),
  }))
  const bindings = elements(xml.getElementsByTagNameNS(wsdlNamespace, 'binding')).map((binding) => {
    const soapBinding = child(binding, SOAP_11, 'binding') ?? child(binding, SOAP_12, 'binding')
    return {
      name: qname(targetNamespace, binding.getAttribute('name') ?? ''),
      interface: expandedName(binding.getAttribute(version === '1.1' ? 'type' : 'interface'), binding, targetNamespace) ?? '',
      protocol: soapBinding?.namespaceURI === SOAP_11
        ? 'soap11' as const
        : soapBinding?.namespaceURI === SOAP_12 ? 'soap12' as const : 'unknown' as const,
      transport: soapBinding?.getAttribute('transport') ?? undefined,
      style: soapBinding?.getAttribute('style') ?? undefined,
    }
  })
  const bindingByName = new Map(bindings.map((binding) => [binding.name, binding]))
  const endpoints = elements(xml.getElementsByTagNameNS(wsdlNamespace, version === '1.1' ? 'port' : 'endpoint'))
    .map((port) => {
      const bindingName = expandedName(port.getAttribute('binding'), port, targetNamespace) ?? ''
      return {
        serviceName: qname(targetNamespace, port.parentElement?.getAttribute('name') ?? ''),
        portName: port.getAttribute('name') ?? '',
        binding: bindingName,
        protocol: bindingByName.get(bindingName)?.protocol ?? 'unknown' as const,
        address: child(port, SOAP_11, 'address')?.getAttribute('location')
          ?? child(port, SOAP_12, 'address')?.getAttribute('location')
          ?? port.getAttribute('address')
          ?? '',
      }
    })
  const messages = elements(xml.getElementsByTagNameNS(wsdlNamespace, 'message')).map((message) => ({
    name: qname(targetNamespace, message.getAttribute('name') ?? ''),
    parts: children(message, wsdlNamespace, 'part').map((part) => ({
      name: part.getAttribute('name') ?? '',
      element: expandedName(part.getAttribute('element'), part, targetNamespace),
      type: expandedName(part.getAttribute('type'), part, targetNamespace),
    })),
  }))
  const messageByName = new Map(messages.map((message) => [message.name, message]))
  const bindingElements = new Map(elements(xml.getElementsByTagNameNS(wsdlNamespace, 'binding')).map((binding) => [
    qname(targetNamespace, binding.getAttribute('name') ?? ''), binding,
  ]))
  const interfaceElements = elements(xml.getElementsByTagNameNS(
    wsdlNamespace,
    version === '1.1' ? 'portType' : 'interface',
  ))
  const operations = interfaceElements.flatMap((interfaceElement) => {
    const interfaceName = qname(targetNamespace, interfaceElement.getAttribute('name') ?? '')
    return children(interfaceElement, wsdlNamespace, 'operation').map((operation) => {
      const name = operation.getAttribute('name') ?? ''
      const input = child(operation, wsdlNamespace, 'input')
      const output = child(operation, wsdlNamespace, 'output')
      const inputMessage = expandedName(input?.getAttribute(version === '1.1' ? 'message' : 'element') ?? null, input ?? operation, targetNamespace)
      const outputMessage = expandedName(output?.getAttribute(version === '1.1' ? 'message' : 'element') ?? null, output ?? operation, targetNamespace)
      const faults = children(operation, wsdlNamespace, 'fault').map((fault) =>
        expandedName(fault.getAttribute(version === '1.1' ? 'message' : 'element'), fault, targetNamespace) ?? '')
      const operationBindings = bindings.filter((binding) => binding.interface === interfaceName).map((binding) => {
        const bindingElement = bindingElements.get(binding.name)
        const bindingOperation = bindingElement && children(bindingElement, wsdlNamespace, 'operation')
          .find((candidate) => candidate.getAttribute('name') === name)
        const soapOperation = bindingOperation && (
          child(bindingOperation, SOAP_11, 'operation') ?? child(bindingOperation, SOAP_12, 'operation')
        )
        const bindingInput = bindingOperation && child(bindingOperation, wsdlNamespace, 'input')
        const body = bindingInput && child(bindingInput, binding.protocol === 'soap12' ? SOAP_12 : SOAP_11, 'body')
        return {
          binding: binding.name,
          protocol: binding.protocol,
          soapAction: soapOperation?.getAttribute('soapAction') ?? undefined,
          style: soapOperation?.getAttribute('style') ?? binding.style,
          bodyUse: body?.getAttribute('use') ?? undefined,
        }
      })
      return { name, interface: interfaceName, inputMessage, outputMessage, faults, oneWay: !output, bindings: operationBindings }
    })
  })

  const contracts: WsdlContract[] = []
  for (const operation of operations) {
    const addContract = (direction: WsdlContract['direction'], messageName: string | undefined) => {
      if (!messageName) return
      const message = messageByName.get(messageName)
      if (!message && version === '2.0') {
        contracts.push({ operationName: operation.name, direction, rootElement: messageName, fields: flattenRootElement(messageName, schemaIndex) })
        return
      }
      for (const part of message?.parts ?? []) {
        contracts.push({
          operationName: operation.name,
          direction,
          message: messageName,
          rootElement: part.element,
          fields: part.element ? flattenRootElement(part.element, schemaIndex) : [],
        })
      }
    }
    addContract('input', operation.inputMessage)
    addContract('output', operation.outputMessage)
    for (const fault of operation.faults) addContract('fault', fault)
  }

  const policyContainers = elements(xml.getElementsByTagName('*')).filter((element) => element.localName === 'Policy')
  const policies = [...new Set(policyContainers.flatMap((policy) => elements(policy.getElementsByTagName('*'))
    .map((assertion) => assertion.localName)
    .filter((name) => !['Policy', 'ExactlyOne', 'All', 'PolicyReference'].includes(name))))]

  return {
    version,
    targetNamespace,
    services,
    endpoints,
    bindings,
    operations,
    messages,
    policies,
    schema: {
      namespaces: [...new Set(elements(xml.getElementsByTagNameNS(XSD, 'schema'))
        .map((schema) => schema.getAttribute('targetNamespace') ?? ''))],
      elements: [...schemaIndex.elements].map(([name, element]) => ({
        qname: name,
        type: expandedName(element.getAttribute('type'), element, namespaceOf(name)),
        documentation: documentation(element),
      })),
      complexTypes: [...schemaIndex.complexTypes].map(([name, complexType]) => ({
        qname: name,
        base: complexTypeBase(complexType),
        documentation: documentation(complexType),
      })),
      simpleTypes: [...schemaIndex.simpleTypes].map(([name, simpleType]) => {
        const restriction = child(simpleType, XSD, 'restriction')
        const base = restriction ? expandedName(restriction.getAttribute('base'), restriction, namespaceOf(name)) : undefined
        return {
          qname: name,
          base,
          primitiveType: primitiveType(base, schemaIndex.simpleTypes),
          documentation: documentation(simpleType),
          constraints: constraintsFor(simpleType, schemaIndex.simpleTypes),
        }
      }),
    },
    contracts,
  }
}

export const parseWsdl = (document: string, fileName: string): WsdlImport => {
  const xml = new DOMParser().parseFromString(document, 'application/xml')
  if (xml.querySelector('parsererror')) throw new Error('The selected file is not valid XML.')
  const root = xml.documentElement
  if (!['definitions', 'description'].includes(root.localName)) {
    throw new Error('The selected XML document is not a WSDL definition.')
  }
  const serviceName = elements(xml.getElementsByTagNameNS('*', 'service'))
    .find((element) => element.hasAttribute('name'))?.getAttribute('name')
  const interfaceName = elements(xml.getElementsByTagNameNS('*', 'portType'))[0]?.getAttribute('name')
    ?? elements(xml.getElementsByTagNameNS('*', 'interface'))[0]?.getAttribute('name')
  const name = root.getAttribute('name')
    ?? (serviceName && serviceName.toLowerCase() !== 'service' ? serviceName : undefined)
    ?? interfaceName
    ?? serviceName
    ?? fileNameWithoutExtension(fileName)
  return { name: name.trim(), document, model: parseModel(xml) }
}
