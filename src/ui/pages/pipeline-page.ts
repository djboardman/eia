import type {
  MiddlewarePipelineCategory,
  PipelineDataTypeReference,
  PipelineTransformMapping,
  PipelineTransformMappingKind,
  Workspace,
} from '../../domain/workspace'
import type { WorkspaceDispatcher } from '../../state/dispatcher'
import { getAllRecordTypes } from '../../state/selectors'
import {
  choicesAtLevel,
  getContractOwners,
  selectableNodesForReference,
  type SelectableNode,
  type SelectableNodeKind,
} from '../../state/pipelines/transform-selection'
import {
  clearNestedMappingPath,
  createTransformMapping,
  deleteTransformMapping,
  findTransformMapping,
} from '../../state/pipelines/transform-operations'
import { createButton, createEmptyState, createLabelledField, createTabList } from '../elements'

interface PipelinePageDependencies {
  workspace: Workspace
  content: HTMLElement
  dispatch: WorkspaceDispatcher
}

const localName = (name: string | undefined) => {
  if (!name) return 'unresolved contract'
  const closingBrace = name.lastIndexOf('}')
  return closingBrace >= 0 ? name.slice(closingBrace + 1) : name
}

const referenceValue = (reference: PipelineDataTypeReference) => JSON.stringify(reference)

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
    for (const owner of getContractOwners(workspace).filter(({ kind }) => kind === ownerKind)) {
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
    form.append(createLabelledField('Source data type', source), createLabelledField('Target data type', target))
    content.append(header, form)

    if (pipeline.source && pipeline.target) {
      const activeTab = activeTabs.get(pipeline.definitionId) ?? 'steps'
      const tabs = createTabList([
        { id: 'steps', label: 'Steps' },
        { id: 'transform', label: 'Transform' },
      ] as const, activeTab, (id) => {
          activeTabs.set(pipeline.definitionId, id)
          renderPipeline(middlewareDefinitionId, pipelineDefinitionId)
      })
      const panel = document.createElement('section')
      panel.className = 'editor-card mt-4'
      panel.setAttribute('role', 'tabpanel')
      const heading = document.createElement('h2')
      heading.className = 'editor-card-title'
      heading.textContent = activeTab === 'steps' ? 'Steps' : 'Transform'
      panel.append(heading)
      if (activeTab === 'steps') {
        panel.append(createEmptyState('No pipeline steps have been added.'))
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
          item.className = 'transform-mapping'
          const mappingHeader = document.createElement('header')
          mappingHeader.className = 'transform-mapping-header'
          const title = document.createElement('h3')
          title.className = 'transform-mapping-title'
          title.textContent = mappingLabel(mapping.kind)
          const actions = document.createElement('span')
          actions.className = 'transform-mapping-actions'
          const remove = createButton('Delete', 'secondary', () => updateMappings((mappings) => {
            deleteTransformMapping(mappings, mapping.definitionId)
          }))
          actions.append(remove)
          mappingHeader.append(title, actions)

          const paths = document.createElement('div')
          paths.className = 'transform-mapping-paths'
          const createPathField = (
            labelText: string,
            value: string,
            availableNodes: SelectableNode[],
            field: 'sourcePath' | 'targetPath',
          ) => {
            const select = document.createElement('select')
            select.className = 'transform-mapping-path technical-name'
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
              const changed = findTransformMapping(mappings, mapping.definitionId)
              if (!changed) return
              changed[field] = select.value
              const nestedField = field
              clearNestedMappingPath(changed.mappings, nestedField)
            }))
            return createLabelledField(labelText, select)
          }
          const selectableKind = nodeKindFor(mapping.kind)
          const arrow = document.createElement('span')
          arrow.className = 'transform-mapping-arrow'
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
          container.className = depth === 0 ? 'transform-mappings' : 'transform-mapping-children'
          const toolbar = document.createElement('div')
          toolbar.className = 'pipeline-transform-toolbar'
          for (const kind of ['loop', 'object', 'field'] as const) {
            const button = createButton(
              `Add ${kind === 'field' ? 'field mapping' : kind === 'object' ? 'object mapping' : 'loop'}`,
              'secondary',
            )
            const selectableKind = nodeKindFor(kind)
            button.disabled = choicesAtLevel(sourceNodes, parentSourcePath, selectableKind).length === 0
              || choicesAtLevel(targetNodes, parentTargetPath, selectableKind).length === 0
            button.addEventListener('click', () => updateMappings((rootMappings) => {
              const destination = parentDefinitionId
                ? findTransformMapping(rootMappings, parentDefinitionId)?.mappings
                : rootMappings
              destination?.push(createTransformMapping(kind))
            }))
            toolbar.append(button)
          }
          container.append(toolbar)
          if (!mappings.length && depth === 0) {
            container.append(createEmptyState('No transform mappings have been added.'))
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
