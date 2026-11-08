export interface ApiDefinition {
  definitionId: string
  name: string
  source: { kind: 'wsdl'; fileName: string; document: string }
  model: WsdlApiModel
}

export interface WsdlConstraint { kind: string; value: string }

export interface WsdlSchemaField {
  path: string
  name: string
  qname: string
  nodeKind: 'element' | 'attribute'
  type?: string
  primitiveType?: string
  minOccurs: number
  maxOccurs: number | 'unbounded'
  required: boolean
  nullable: boolean
  repeated: boolean
  compositor?: 'sequence' | 'choice' | 'all'
  defaultValue?: string
  fixedValue?: string
  documentation?: string
  constraints: WsdlConstraint[]
}

export interface WsdlContract {
  operationName: string
  direction: 'input' | 'output' | 'fault'
  message?: string
  rootElement?: string
  fields: WsdlSchemaField[]
}

export interface WsdlApiModel {
  version: '1.1' | '2.0'
  targetNamespace: string
  services: Array<{ name: string }>
  endpoints: Array<{
    serviceName: string
    portName: string
    binding: string
    protocol: 'soap11' | 'soap12' | 'unknown'
    address: string
  }>
  bindings: Array<{
    name: string
    interface: string
    protocol: 'soap11' | 'soap12' | 'unknown'
    transport?: string
    style?: string
  }>
  operations: Array<{
    name: string
    interface: string
    inputMessage?: string
    outputMessage?: string
    faults: string[]
    oneWay: boolean
    bindings: Array<{
      binding: string
      protocol: 'soap11' | 'soap12' | 'unknown'
      soapAction?: string
      style?: string
      bodyUse?: string
    }>
  }>
  messages: Array<{ name: string; parts: Array<{ name: string; element?: string; type?: string }> }>
  policies: string[]
  schema: {
    namespaces: string[]
    elements: Array<{ qname: string; type?: string; documentation?: string }>
    complexTypes: Array<{ qname: string; base?: string; documentation?: string }>
    simpleTypes: Array<{
      qname: string
      base?: string
      primitiveType?: string
      documentation?: string
      constraints: WsdlConstraint[]
    }>
  }
  contracts: WsdlContract[]
}

export const createEmptyWsdlApiModel = (): WsdlApiModel => ({
  version: '1.1',
  targetNamespace: '',
  services: [],
  endpoints: [],
  bindings: [],
  operations: [],
  messages: [],
  policies: [],
  schema: { namespaces: [], elements: [], complexTypes: [], simpleTypes: [] },
  contracts: [],
})
