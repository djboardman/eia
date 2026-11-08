import type { ApiDefinition, PipelineDataTypeReference, Workspace, WsdlSchemaField } from '../../domain/workspace'
import type { RecordType } from '../../domain/record-types'
import {
  findRecordTypeContext,
  getAllRecordTypes,
} from '../selectors'
import {
  allChildRecordTypesForSerialization,
  recordSerializationPaths,
  serializedAttributesFor,
} from '../serialization/record-serialization'

export interface ContractOwner {
  kind: 'api' | 'client'
  definition: ApiDefinition
}

export type SelectableNodeKind = 'array' | 'object' | 'attribute'

export interface SelectableNode {
  path: string
  kind: SelectableNodeKind
  children: SelectableNode[]
}

export const getContractOwners = (workspace: Workspace): ContractOwner[] => [
  ...workspace.applications.dataScopeCollection.items.flatMap(({ categories }) => categories.flatMap((category) =>
    category.kind === 'apis' || category.kind === 'clients'
      ? category.items.map((definition) => ({
          kind: category.kind === 'apis' ? 'api' as const : 'client' as const,
          definition,
        }))
      : [])),
  ...workspace.middleware.items.flatMap(({ categories }) => categories.flatMap((category) =>
    category.kind === 'apis' || category.kind === 'clients'
      ? category.items.map((definition) => ({
          kind: category.kind === 'apis' ? 'api' as const : 'client' as const,
          definition,
        }))
      : [])),
]

const uniqueNodes = (nodes: SelectableNode[]) => [...new Map(nodes.map((node) => [node.path, node])).values()]

const attributeNodesFor = (workspace: Workspace, recordTypes: RecordType[], prefix: string) => uniqueNodes(
  recordTypes.flatMap((recordType) => {
    const context = findRecordTypeContext(workspace, recordType.definitionId)
    const inherited = context?.inheritedFrom.flatMap((parent) => serializedAttributesFor(workspace, parent)) ?? []
    return [...inherited, ...serializedAttributesFor(workspace, recordType)].map((attribute): SelectableNode => ({
      path: `${prefix}.${attribute.name}`,
      kind: attribute.dataTypeDefinitionId === 'json:array'
        ? 'array'
        : attribute.dataTypeDefinitionId === 'json:object' ? 'object' : 'attribute',
      children: [],
    }))
  }),
)

const recordChildren = (workspace: Workspace, recordTypes: RecordType[], prefix: string): SelectableNode[] => [
  { path: recordSerializationPaths.field(prefix, 'id'), kind: 'attribute', children: [] },
  { path: recordSerializationPaths.field(prefix, 'type'), kind: 'attribute', children: [] },
  {
    path: recordSerializationPaths.attributes(prefix),
    kind: 'object',
    children: attributeNodesFor(workspace, recordTypes, recordSerializationPaths.attributes(prefix)),
  },
]

const contractNodes = (fields: WsdlSchemaField[]): SelectableNode[] => {
  const byPath = new Map<string, SelectableNode>()
  const sorted = [...fields].sort((left, right) => left.path.split('/').length - right.path.split('/').length)
  for (const field of sorted) {
    const hasChildren = fields.some(({ path }) => path.startsWith(`${field.path}/`))
    const repeated = field.maxOccurs === 'unbounded' || field.maxOccurs > 1
    byPath.set(field.path, {
      path: field.path,
      kind: repeated ? 'array' : hasChildren ? 'object' : 'attribute',
      children: [],
    })
  }
  const roots: SelectableNode[] = []
  for (const field of sorted) {
    const node = byPath.get(field.path)!
    const separator = field.path.lastIndexOf('/')
    const parent = separator < 0 ? undefined : byPath.get(field.path.slice(0, separator))
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  return roots
}

export const selectableNodesForReference = (
  workspace: Workspace,
  reference: PipelineDataTypeReference,
): SelectableNode[] => {
  if (reference.kind === 'recordType') {
    const recordType = getAllRecordTypes(workspace).find(({ definitionId }) => definitionId === reference.definitionId)
    if (!recordType) return []
    const nodes: SelectableNode[] = [
      {
        path: recordSerializationPaths.dataObject,
        kind: 'object',
        children: recordChildren(workspace, [recordType], recordSerializationPaths.dataObject),
      },
      {
        path: recordSerializationPaths.dataArray,
        kind: 'array',
        children: recordChildren(workspace, [recordType], recordSerializationPaths.dataArray),
      },
    ]
    const included = allChildRecordTypesForSerialization(recordType)
    if (included.length) {
      nodes.push({
        path: recordSerializationPaths.included,
        kind: 'array',
        children: recordChildren(workspace, included, recordSerializationPaths.included),
      })
    }
    return nodes
  }
  const owner = getContractOwners(workspace).find(({ kind, definition }) =>
    kind === reference.ownerKind && definition.definitionId === reference.ownerDefinitionId)
  const contract = owner?.definition.model.contracts.find((candidate) =>
    candidate.operationName === reference.operationName
    && candidate.direction === reference.direction
    && candidate.rootElement === reference.rootElement
    && candidate.message === reference.message)
  return contractNodes(contract?.fields ?? [])
}

export const findSelectableNode = (nodes: SelectableNode[], path: string): SelectableNode | undefined => {
  for (const node of nodes) {
    if (node.path === path) return node
    const nested = findSelectableNode(node.children, path)
    if (nested) return nested
  }
  return undefined
}

export const choicesAtLevel = (
  nodes: SelectableNode[],
  parentPath: string | undefined,
  kind: SelectableNodeKind,
) => (parentPath === undefined ? nodes : findSelectableNode(nodes, parentPath)?.children ?? [])
  .filter((node) => node.kind === kind)
