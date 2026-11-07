import type {
  ApiDefinition,
  MiddlewarePipelineCategory,
  PipelineDataTypeReference,
  PipelineTransformMapping,
  PipelineTransformMappingKind,
  Workspace,
  WsdlSchemaField,
} from '../../domain/workspace'
import type { WorkspaceDispatcher } from '../../state/dispatcher'
import type { RecordType } from '../../models/record-type'
import {
  findRecordTypeContext,
  getAllRecordTypes,
  includedRecordTypesFor,
  resolvedAttributesFor,
} from '../../state/selectors'

interface PipelinePageDependencies {
  workspace: Workspace
  content: HTMLElement
  dispatch: WorkspaceDispatcher
}

interface ContractOwner {
  kind: 'api' | 'client'
  definition: ApiDefinition
}

const contractOwners = (workspace: Workspace): ContractOwner[] => [
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

const localName = (name: string | undefined) => {
  if (!name) return 'unresolved contract'
  const closingBrace = name.lastIndexOf('}')
  return closingBrace >= 0 ? name.slice(closingBrace + 1) : name
}

const referenceValue = (reference: PipelineDataTypeReference) => JSON.stringify(reference)

type SelectableNodeKind = 'array' | 'object' | 'attribute'

interface SelectableNode {
  path: string
  kind: SelectableNodeKind
  children: SelectableNode[]
}

const uniqueNodes = (nodes: SelectableNode[]) => [...new Map(nodes.map((node) => [node.path, node])).values()]

const attributeNodesFor = (workspace: Workspace, recordTypes: RecordType[], prefix: string) => uniqueNodes(
  recordTypes.flatMap((recordType) => {
    const context = findRecordTypeContext(workspace, recordType.definitionId)
    const inherited = context?.inheritedFrom.flatMap((parent) => resolvedAttributesFor(workspace, parent)) ?? []
    return [...inherited, ...resolvedAttributesFor(workspace, recordType)].map((attribute): SelectableNode => ({
      path: `${prefix}.${attribute.name}`,
      kind: attribute.dataTypeDefinitionId === 'json:array'
        ? 'array'
        : attribute.dataTypeDefinitionId === 'json:object' ? 'object' : 'attribute',
      children: [],
    }))
  }),
)

const recordChildren = (
  workspace: Workspace,
  recordTypes: RecordType[],
  prefix: string,
): SelectableNode[] => {
  return [
    { path: `${prefix}.id`, kind: 'attribute', children: [] },
    { path: `${prefix}.type`, kind: 'attribute', children: [] },
    {
      path: `${prefix}.attributes`,
      kind: 'object',
      children: attributeNodesFor(workspace, recordTypes, `${prefix}.attributes`),
    },
  ]
}

const includedRecordTypesRecursively = (recordType: RecordType): RecordType[] => {
  const direct = includedRecordTypesFor(recordType).map(({ recordType }) => recordType)
  return [...new Map(direct
    .flatMap((included) => [included, ...includedRecordTypesRecursively(included)])
    .map((included) => [included.definitionId, included])).values()]
}

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

const selectableNodesForReference = (workspace: Workspace, reference: PipelineDataTypeReference): SelectableNode[] => {
  if (reference.kind === 'recordType') {
    const recordType = getAllRecordTypes(workspace).find(({ definitionId }) => definitionId === reference.definitionId)
    if (!recordType) return []
    const dataChildren = recordChildren(workspace, [recordType], 'data')
    const arrayChildren = recordChildren(workspace, [recordType], 'data[]')
    const nodes: SelectableNode[] = [
      { path: 'data', kind: 'object', children: dataChildren },
      { path: 'data[]', kind: 'array', children: arrayChildren },
    ]
    const included = includedRecordTypesRecursively(recordType)
    if (included.length) {
      nodes.push({ path: 'included[]', kind: 'array', children: recordChildren(workspace, included, 'included[]') })
    }
    return nodes
  }
  const owner = contractOwners(workspace).find(({ kind, definition }) =>
    kind === reference.ownerKind && definition.definitionId === reference.ownerDefinitionId)
  const contract = owner?.definition.model.contracts.find((candidate) =>
    candidate.operationName === reference.operationName
    && candidate.direction === reference.direction
    && candidate.rootElement === reference.rootElement
    && candidate.message === reference.message)
  return contractNodes(contract?.fields ?? [])
}

const findSelectableNode = (nodes: SelectableNode[], path: string): SelectableNode | undefined => {
  for (const node of nodes) {
    if (node.path === path) return node
    const nested = findSelectableNode(node.children, path)
    if (nested) return nested
  }
  return undefined
}

const choicesAtLevel = (
  nodes: SelectableNode[],
  parentPath: string | undefined,
  kind: SelectableNodeKind,
) => (parentPath === undefined ? nodes : findSelectableNode(nodes, parentPath)?.children ?? [])
  .filter((node) => node.kind === kind)

const createReferenceSelect = (
  workspace: Workspace,
  value: PipelineDataTypeReference | undefined,
  label: string,
) => {
  const select = document.createElement('select')
  select.className = 'data-type-input technical-name'
  select.setAttribute('aria-label', label)
  const empty = document.createElement('option')
  empty.value = ''
  empty.textContent = 'Select a data type'
  select.append(empty)

  const recordTypes = document.createElement('optgroup')
  recordTypes.label = 'Record Types'
  for (const recordType of getAllRecordTypes(workspace)) {
    const reference: PipelineDataTypeReference = {
      kind: 'recordType',
      definitionId: recordType.definitionId,
    }
    const option = document.createElement('option')
    option.value = referenceValue(reference)
    option.textContent = recordType.name
    recordTypes.append(option)
  }
  select.append(recordTypes)

  for (const ownerKind of ['api', 'client'] as const) {
    const group = document.createElement('optgroup')
    group.label = ownerKind === 'api' ? 'API Contracts' : 'Client Contracts'
    for (const owner of contractOwners(workspace).filter(({ kind }) => kind === ownerKind)) {
      for (const contract of owner.definition.model.contracts) {
        const reference: PipelineDataTypeReference = {
          kind: 'contract',
          ownerKind,
          ownerDefinitionId: owner.definition.definitionId,
          operationName: contract.operationName,
          direction: contract.direction,
          rootElement: contract.rootElement,
          message: contract.message,
        }
        const option = document.createElement('option')
        option.value = referenceValue(reference)
        option.textContent = `${owner.definition.name} · ${contract.operationName} · ${contract.direction} · ${localName(contract.rootElement ?? contract.message)}`
        group.append(option)
      }
    }
    select.append(group)
  }

  select.value = value ? referenceValue(value) : ''
  return select
}

const createField = (labelText: string, control: HTMLElement) => {
  const field = document.createElement('label')
  field.className = 'data-type-field'
  const label = document.createElement('span')
  label.className = 'data-type-label'
  label.textContent = labelText
  field.append(label, control)
  return field
}

export const createPipelinePage = ({ workspace, content, dispatch }: PipelinePageDependencies) => {
  const activeTabs = new Map<string, 'steps' | 'transform'>()

  const renderPipeline = (middlewareDefinitionId: string, pipelineDefinitionId: string): boolean => {
    const middleware = workspace.middleware.items.find(({ definitionId }) => definitionId === middlewareDefinitionId)
    const pipeline = middleware?.categories
      .find((category): category is MiddlewarePipelineCategory => category.kind === 'pipelines')?.items
      .find(({ definitionId }) => definitionId === pipelineDefinitionId)
    if (!middleware || !pipeline) return false

    content.replaceChildren()
    const header = document.createElement('header')
    header.className = 'designer-header'
    const eyebrow = document.createElement('p')
    eyebrow.className = 'designer-eyebrow'
    eyebrow.textContent = 'Pipeline'
    const heading = document.createElement('h1')
    heading.className = 'page-title technical-name'
    heading.textContent = pipeline.name
    const parent = document.createElement('p')
    parent.className = 'api-source-metadata technical-name'
    parent.textContent = middleware.name
    header.append(eyebrow, heading, parent)

    const form = document.createElement('form')
    form.className = 'data-type-form'
    form.addEventListener('submit', (event) => event.preventDefault())
    const source = createReferenceSelect(workspace, pipeline.source, 'Source data type')
    const target = createReferenceSelect(workspace, pipeline.target, 'Target data type')
    const update = (field: 'source' | 'target', select: HTMLSelectElement) => {
      const reference = select.value
        ? JSON.parse(select.value) as PipelineDataTypeReference
        : undefined
      dispatch({ type: 'pipeline.update', definitionId: pipeline.definitionId, changes: { [field]: reference } })
    }
    source.addEventListener('change', () => update('source', source))
    target.addEventListener('change', () => update('target', target))
    form.append(createField('Source data type', source), createField('Target data type', target))
    content.append(header, form)

    if (pipeline.source && pipeline.target) {
      const activeTab = activeTabs.get(pipeline.definitionId) ?? 'steps'
      const tabs = document.createElement('div')
      tabs.className = 'api-tabs'
      tabs.setAttribute('role', 'tablist')
      for (const [id, label] of [['steps', 'Steps'], ['transform', 'Transform']] as const) {
        const tab = document.createElement('button')
        tab.className = 'api-tab'
        tab.type = 'button'
        tab.textContent = label
        tab.setAttribute('role', 'tab')
        tab.setAttribute('aria-selected', String(activeTab === id))
        tab.addEventListener('click', () => {
          activeTabs.set(pipeline.definitionId, id)
          renderPipeline(middlewareDefinitionId, pipelineDefinitionId)
        })
        tabs.append(tab)
      }
      const panel = document.createElement('section')
      panel.className = 'api-card mt-4'
      panel.setAttribute('role', 'tabpanel')
      const heading = document.createElement('h2')
      heading.className = 'api-card-title'
      heading.textContent = activeTab === 'steps' ? 'Steps' : 'Transform'
      panel.append(heading)
      if (activeTab === 'steps') {
        const empty = document.createElement('p')
        empty.className = 'api-empty-state'
        empty.textContent = 'No pipeline steps have been added.'
        panel.append(empty)
      } else {
        const sourceNodes = selectableNodesForReference(workspace, pipeline.source)
        const targetNodes = selectableNodesForReference(workspace, pipeline.target)
        const updateMappings = (change: (mappings: PipelineTransformMapping[]) => void) => {
          const mappings = structuredClone(pipeline.transform.mappings)
          change(mappings)
          dispatch({
            type: 'pipeline.update',
            definitionId: pipeline.definitionId,
            changes: { transform: { mappings } },
          })
        }
        const findMapping = (
          mappings: PipelineTransformMapping[],
          definitionId: string,
        ): PipelineTransformMapping | undefined => {
          for (const mapping of mappings) {
            if (mapping.definitionId === definitionId) return mapping
            const nested = findMapping(mapping.mappings, definitionId)
            if (nested) return nested
          }
          return undefined
        }
        const deleteMapping = (mappings: PipelineTransformMapping[], definitionId: string): boolean => {
          const index = mappings.findIndex((mapping) => mapping.definitionId === definitionId)
          if (index >= 0) {
            mappings.splice(index, 1)
            return true
          }
          return mappings.some((mapping) => deleteMapping(mapping.mappings, definitionId))
        }
        const newMapping = (kind: PipelineTransformMappingKind): PipelineTransformMapping => ({
          definitionId: crypto.randomUUID(),
          kind,
          sourcePath: '',
          targetPath: '',
          mappings: [],
        })
        const nodeKindFor = (kind: PipelineTransformMappingKind): SelectableNodeKind =>
          kind === 'loop' ? 'array' : kind === 'object' ? 'object' : 'attribute'
        const mappingLabel = (kind: PipelineTransformMappingKind) =>
          kind === 'loop' ? 'Loop' : kind === 'object' ? 'Object mapping' : 'Field mapping'

        const renderMapping = (
          mapping: PipelineTransformMapping,
          depth: number,
          parentSourcePath?: string,
          parentTargetPath?: string,
        ) => {
          const item = document.createElement('section')
          item.className = 'pipeline-loop'
          item.style.setProperty('--pipeline-loop-depth', String(depth))
          const mappingHeader = document.createElement('header')
          mappingHeader.className = 'pipeline-loop-header'
          const title = document.createElement('h3')
          title.className = 'pipeline-loop-title'
          title.textContent = mappingLabel(mapping.kind)
          const actions = document.createElement('span')
          actions.className = 'pipeline-loop-actions'
          const remove = document.createElement('button')
          remove.className = 'ui-button-secondary'
          remove.type = 'button'
          remove.textContent = 'Delete'
          remove.addEventListener('click', () => updateMappings((mappings) => {
            deleteMapping(mappings, mapping.definitionId)
          }))
          actions.append(remove)
          mappingHeader.append(title, actions)

          const paths = document.createElement('div')
          paths.className = 'pipeline-loop-paths'
          const createPathField = (
            labelText: string,
            value: string,
            availableNodes: SelectableNode[],
            field: 'sourcePath' | 'targetPath',
          ) => {
            const select = document.createElement('select')
            select.className = 'pipeline-loop-path technical-name'
            select.setAttribute('aria-label', labelText)
            const empty = document.createElement('option')
            empty.value = ''
            empty.textContent = `Select ${mapping.kind === 'field' ? 'an attribute' : mapping.kind === 'object' ? 'an object' : 'an array'}`
            select.append(empty)
            for (const node of availableNodes) {
              const option = document.createElement('option')
              option.value = node.path
              option.textContent = node.path
              select.append(option)
            }
            select.value = availableNodes.some(({ path }) => path === value) ? value : ''
            select.addEventListener('change', () => updateMappings((mappings) => {
              const changed = findMapping(mappings, mapping.definitionId)
              if (!changed) return
              changed[field] = select.value
              const nestedField = field
              const clearNested = (items: PipelineTransformMapping[]) => {
                for (const nested of items) {
                  nested[nestedField] = ''
                  clearNested(nested.mappings)
                }
              }
              clearNested(changed.mappings)
            }))
            return createField(labelText, select)
          }
          const selectableKind = nodeKindFor(mapping.kind)
          const arrow = document.createElement('span')
          arrow.className = 'pipeline-loop-arrow'
          arrow.textContent = '→'
          paths.append(
            createPathField(
              mapping.kind === 'field' ? 'Source attribute' : mapping.kind === 'object' ? 'Source object' : 'Source array',
              mapping.sourcePath,
              choicesAtLevel(sourceNodes, parentSourcePath, selectableKind),
              'sourcePath',
            ),
            arrow,
            createPathField(
              mapping.kind === 'field' ? 'Target attribute' : mapping.kind === 'object' ? 'Target object' : 'Target array',
              mapping.targetPath,
              choicesAtLevel(targetNodes, parentTargetPath, selectableKind),
              'targetPath',
            ),
          )
          item.append(mappingHeader, paths)
          if (mapping.kind !== 'field') {
            item.append(renderMappings(
              mapping.mappings,
              depth + 1,
              mapping.sourcePath,
              mapping.targetPath,
              mapping.definitionId,
            ))
          }
          return item
        }

        const renderMappings = (
          mappings: PipelineTransformMapping[],
          depth: number,
          parentSourcePath?: string,
          parentTargetPath?: string,
          parentDefinitionId?: string,
        ) => {
          const container = document.createElement('div')
          container.className = depth === 0 ? 'pipeline-loops' : 'pipeline-loop-children'
          const toolbar = document.createElement('div')
          toolbar.className = 'pipeline-transform-toolbar'
          for (const kind of ['loop', 'object', 'field'] as const) {
            const button = document.createElement('button')
            button.className = 'ui-button-secondary'
            button.type = 'button'
            button.textContent = `Add ${kind === 'field' ? 'field mapping' : kind === 'object' ? 'object mapping' : 'loop'}`
            const selectableKind = nodeKindFor(kind)
            button.disabled = choicesAtLevel(sourceNodes, parentSourcePath, selectableKind).length === 0
              || choicesAtLevel(targetNodes, parentTargetPath, selectableKind).length === 0
            button.addEventListener('click', () => updateMappings((rootMappings) => {
              const destination = parentDefinitionId
                ? findMapping(rootMappings, parentDefinitionId)?.mappings
                : rootMappings
              destination?.push(newMapping(kind))
            }))
            toolbar.append(button)
          }
          container.append(toolbar)
          if (!mappings.length && depth === 0) {
            const empty = document.createElement('p')
            empty.className = 'api-empty-state'
            empty.textContent = 'No transform mappings have been added.'
            container.append(empty)
          }
          for (const mapping of mappings) {
            container.append(renderMapping(mapping, depth, parentSourcePath, parentTargetPath))
          }
          return container
        }
        panel.append(renderMappings(pipeline.transform.mappings, 0))
      }
      content.append(tabs, panel)
    }
    return true
  }

  return renderPipeline
}
