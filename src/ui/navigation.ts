import { Boxes, Braces, Database, FileCode2, Folder, Route, Server, SquareArrowOutUpRight, Workflow } from 'lucide'
import type { RecordType } from '../models/record-type'
import { rootRecordTypeDefinitionId, type Workspace } from '../domain/workspace'
import type { WorkspaceDispatcher } from '../state/dispatcher'
import { dataTypeReferenceCount, findRecordType, recordTypeExternalReferenceCount } from '../state/selectors'
import { createInlineEditor as createInlineEditorControl, createTreeAddControl, createTreeMoreControl } from './controls'
import { createLucideIcon, createRecordTypeIcon, type RecordTypeRelationship } from './icons'
import { renderExplorerTreeItem } from './explorer/render-explorer-tree-item'
import { toUpperCamelCase, upperCamelCaseNamePattern } from './name-format'
import { CommandRegistry } from './command-registry'
import { createSidebarViewHeader } from './sidebar-view-header'
import { registerWorkspaceTransferCommands } from './workspace-commands'
import { parseWsdl } from './wsdl-import'

interface NodeEditor {
  kind: 'category' | 'recordType' | 'dataType' | 'dataScope' | 'middleware' | 'pipeline'
  mode: 'create' | 'rename'
  id?: string
  parentId?: string
  parentKind?: 'category' | 'children' | 'subtypes'
  value?: string
}

interface NavigationDependencies {
  workspace: Workspace
  navigation: HTMLElement
  dispatch: WorkspaceDispatcher
  render: () => void
}

export const createNavigation = ({ workspace, navigation, dispatch, render }: NavigationDependencies) => {
  let nodeEditor: NodeEditor | null = null
  const hierarchyOpenState = new Map<string, boolean>()
const startEditing = (editor: NodeEditor) => {
  if (editor.kind === 'category') hierarchyOpenState.set('root:record-types', true)
  if (editor.kind === 'recordType' && editor.parentKind === 'category') {
    hierarchyOpenState.set('root:record-types', true)
    hierarchyOpenState.set(`category:${editor.parentId}`, true)
  }
  if (editor.kind === 'recordType' && editor.parentId) {
    hierarchyOpenState.set(`record-type:${editor.parentId}`, true)
  }
  if (editor.kind === 'dataType') {
    hierarchyOpenState.set('root:data-types', true)
    hierarchyOpenState.set('data-type:string', true)
  }
  if (editor.kind === 'dataScope') {
    hierarchyOpenState.set('root:applications', true)
    hierarchyOpenState.set('applications:data-scopes', true)
  }
  if (editor.kind === 'middleware') hierarchyOpenState.set('root:middleware', true)
  if (editor.kind === 'pipeline') {
    hierarchyOpenState.set('root:middleware', true)
    hierarchyOpenState.set(`middleware:${editor.parentId}`, true)
    hierarchyOpenState.set(`middleware:${editor.parentId}:pipelines`, true)
  }
  nodeEditor = editor
  renderNavigation()
}

const finishEditing = (commit: boolean, value = '') => {
  if (!nodeEditor) return

  const editor = nodeEditor
  const name = editor.kind === 'dataType' ? toUpperCamelCase(value) : value.trim()
  nodeEditor = null

  if (commit && editor.kind === 'dataType' && name && !upperCamelCaseNamePattern.test(name)) {
    window.alert('String subtype names must use UpperCamelCase and start with a letter.')
    renderNavigation()
    return
  }

  if (!commit || !name) {
    renderNavigation()
    return
  }

  if (editor.kind === 'category') {
    dispatch(editor.mode === 'create'
      ? { type: 'category.create', definitionId: crypto.randomUUID(), name }
      : { type: 'category.rename', definitionId: editor.id ?? '', name })
  } else if (editor.kind === 'recordType') {
    dispatch(editor.mode === 'create'
      ? {
          type: 'recordType.create',
          definitionId: crypto.randomUUID(),
          parentKind: editor.parentKind ?? 'category',
          parentId: editor.parentId ?? '',
          name,
        }
      : { type: 'recordType.rename', definitionId: editor.id ?? '', name })
  } else if (editor.kind === 'dataType') {
    if (editor.mode === 'create') {
      const result = dispatch({ type: 'stringSubtype.create', definitionId: crypto.randomUUID(), name }, false)
      window.location.hash = `data-types/string/${result.definitionId}`
    } else {
      dispatch({ type: 'stringSubtype.update', definitionId: editor.id ?? '', changes: { name } })
    }
  } else if (editor.kind === 'dataScope') {
    dispatch(editor.mode === 'create'
      ? { type: 'dataScope.create', definitionId: crypto.randomUUID(), name }
      : { type: 'dataScope.rename', definitionId: editor.id ?? '', name })
  } else if (editor.kind === 'middleware') {
    dispatch(editor.mode === 'create'
      ? { type: 'middleware.create', definitionId: crypto.randomUUID(), name }
      : { type: 'middleware.rename', definitionId: editor.id ?? '', name })
  } else if (editor.kind === 'pipeline') {
    if (editor.mode === 'create') {
      const result = dispatch({
        type: 'pipeline.create',
        middlewareDefinitionId: editor.parentId ?? '',
        definitionId: crypto.randomUUID(),
        name,
      }, false)
      window.location.hash = `middleware/${editor.parentId}/pipeline/${result.definitionId}`
    } else {
      dispatch({ type: 'pipeline.rename', definitionId: editor.id ?? '', name })
    }
  }
}

const createInlineEditor = (label: string, value = '', technical = false) => {
  return createInlineEditorControl(label, value, technical, finishEditing)
}

const createAddControl = (actions: Parameters<typeof createTreeAddControl>[0]) =>
  createTreeAddControl(actions)

const createMoreControl = (actions: Parameters<typeof createTreeMoreControl>[0]) =>
  createTreeMoreControl(actions)

const uploadWsdl = (dataScopeDefinitionId: string, categoryDefinitionId: string) => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.wsdl,application/wsdl+xml,application/xml,text/xml'
  input.hidden = true
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
    input.remove()
    if (!file) return
    try {
      const wsdl = parseWsdl(await file.text(), file.name)
      hierarchyOpenState.set(`data-scope:${dataScopeDefinitionId}`, true)
      hierarchyOpenState.set(`data-scope-category:${categoryDefinitionId}`, true)
      dispatch({
        type: 'api.importWsdl',
        dataScopeDefinitionId,
        categoryDefinitionId,
        definitionId: crypto.randomUUID(),
        name: wsdl.name,
        fileName: file.name,
        document: wsdl.document,
        model: wsdl.model,
      })
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'The WSDL could not be imported.')
    }
  }, { once: true })
  document.body.append(input)
  input.click()
}

function createRecordTypeTreeItem(
  recordType: RecordType,
  relationship: RecordTypeRelationship = 'root',
): HTMLLIElement {
  const isCreatingRelatedRecord =
    nodeEditor?.kind === 'recordType' &&
    nodeEditor.mode === 'create' &&
    nodeEditor.parentId === recordType.definitionId &&
    (nodeEditor.parentKind === 'children' || nodeEditor.parentKind === 'subtypes')
  const hasRelatedRecords =
    recordType.children.length > 0 || recordType.subtypes.length > 0 || isCreatingRelatedRecord
  const row = document.createElement('div')
  const isRootRecordType = recordType.definitionId === rootRecordTypeDefinitionId
  const isSelected = window.location.hash.endsWith(`/record-type/${recordType.definitionId}`)
  row.append(createRecordTypeIcon(relationship, false, 'explorer'))

  if (nodeEditor?.kind === 'recordType' && nodeEditor.mode === 'rename' && nodeEditor.id === recordType.definitionId) {
    row.append(createInlineEditor('Rename record type', recordType.name, true))
  } else {
    const label = document.createElement('button')
    label.className = 'explorer-tree-item-label-technical'
    label.type = 'button'
    label.textContent = recordType.name
    if (isSelected) label.setAttribute('aria-current', 'page')
    label.addEventListener('click', (event) => {
      event.stopPropagation()
      window.location.hash = `record-types/record-type/${recordType.definitionId}`
    })
    row.append(label)
    if (!isRootRecordType) {
      const actions = document.createElement('span')
      actions.className = 'explorer-tree-item-actions'
      const references = recordTypeExternalReferenceCount(workspace, recordType)
      actions.append(
        createAddControl([
          {
            label: 'Child record type',
            action: () => startEditing({
              kind: 'recordType',
              mode: 'create',
              parentId: recordType.definitionId,
              parentKind: 'children',
            }),
          },
          {
            label: 'Subtype',
            action: () => startEditing({
              kind: 'recordType',
              mode: 'create',
              parentId: recordType.definitionId,
              parentKind: 'subtypes',
            }),
          },
        ]),
        createMoreControl([
          {
            label: 'Rename',
            action: () => startEditing({
              kind: 'recordType',
              mode: 'rename',
              id: recordType.definitionId,
              value: recordType.name,
            }),
          },
          {
            label: 'Delete',
            danger: true,
            blockedMessage: references > 0
              ? `This record type or one of its descendants is used by ${references} external relationship attribute${references === 1 ? '' : 's'}. Delete those relationships first.`
              : undefined,
            confirm: `Delete record type “${recordType.name}” and all its descendants?`,
            action: () => {
              dispatch({ type: 'recordType.delete', definitionId: recordType.definitionId }, false)
              const selectedId = window.location.hash.match(/^#record-types\/record-type\/(.+)$/)?.[1]
              if (selectedId && !findRecordType(workspace, selectedId)) {
                window.location.hash = 'record-types'
              } else {
                render()
              }
            },
          },
        ]),
      )
      row.append(actions)
    }
  }

  const relatedList = hasRelatedRecords ? document.createElement('ul') : undefined
  if (relatedList) {
    relatedList.className = 'explorer-tree-item-children'
    relatedList.setAttribute('role', 'group')
    for (const child of recordType.children) relatedList.append(createRecordTypeTreeItem(child, 'child'))
    for (const subtype of recordType.subtypes) relatedList.append(createRecordTypeTreeItem(subtype, 'subtype'))
  }

  if (isCreatingRelatedRecord) {
    const isChild = nodeEditor?.parentKind === 'children'
    const editorItem = document.createElement('li')
    editorItem.className = 'explorer-tree-item explorer-tree-editor-row'
    editorItem.setAttribute('role', 'treeitem')
    editorItem.append(
      Object.assign(document.createElement('span'), { className: 'explorer-tree-item-expander-spacer' }),
      createRecordTypeIcon(isChild ? 'child' : 'subtype', false, 'explorer'),
      createInlineEditor(isChild ? 'New child record type' : 'New subtype', '', true),
    )
    relatedList?.append(editorItem)
  }

  return renderExplorerTreeItem({
    rowContent: Array.from(row.childNodes),
    children: relatedList,
    stateKey: `record-type:${recordType.definitionId}`,
    defaultOpen: true,
    selected: isSelected,
  }, hierarchyOpenState)
}

const createCategoryTree = () => {
  const categoryList = document.createElement('ul')
  categoryList.className = 'explorer-tree-item-children'
  categoryList.setAttribute('role', 'group')
  categoryList.append(createRecordTypeTreeItem(workspace.recordTypes.root))

  for (const category of workspace.recordTypes.categories) {
    const categoryName = document.createElement('div')
    categoryName.append(createLucideIcon(Folder, 'explorer-tree-item-icon-structural'))

    if (nodeEditor?.kind === 'category' && nodeEditor.mode === 'rename' && nodeEditor.id === category.id) {
      categoryName.append(createInlineEditor('Rename category', category.name))
    } else {
      const label = document.createElement('span')
      label.className = 'explorer-tree-item-label'
      label.textContent = category.name
      const actions = document.createElement('span')
      actions.className = 'explorer-tree-item-actions'
      actions.append(
        createAddControl([{
          label: 'Record type',
          action: () => startEditing({
            kind: 'recordType',
            mode: 'create',
            parentId: category.id,
            parentKind: 'category',
          }),
        }]),
        createMoreControl([
          {
            label: 'Rename',
            action: () => startEditing({
              kind: 'category',
              mode: 'rename',
              id: category.id,
              value: category.name,
            }),
          },
          {
            label: 'Delete',
            danger: true,
            blockedMessage: category.recordTypes.length > 0
              ? 'Delete the record types in this category first.'
              : undefined,
            confirm: `Delete category “${category.name}”?`,
            action: () => dispatch({ type: 'category.delete', definitionId: category.id }),
          },
        ]),
      )
      categoryName.append(label, actions)
    }
    let typeList: HTMLUListElement | undefined
    if (
      category.recordTypes.length > 0 ||
      (nodeEditor?.parentKind === 'category' && nodeEditor.parentId === category.id)
    ) {
      typeList = document.createElement('ul')
      typeList.className = 'explorer-tree-item-children'
      typeList.setAttribute('role', 'group')

      for (const recordType of category.recordTypes) {
        typeList.append(createRecordTypeTreeItem(recordType))
      }

      if (
        nodeEditor?.kind === 'recordType' &&
        nodeEditor.mode === 'create' &&
        nodeEditor.parentKind === 'category' &&
        nodeEditor.parentId === category.id
      ) {
        const editorItem = document.createElement('li')
        editorItem.className = 'explorer-tree-item explorer-tree-editor-row'
        editorItem.setAttribute('role', 'treeitem')
        editorItem.append(
          Object.assign(document.createElement('span'), { className: 'explorer-tree-item-expander-spacer' }),
          createRecordTypeIcon('root', false, 'explorer'),
          createInlineEditor('New record type', '', true),
        )
        typeList.append(editorItem)
      }
    }
    categoryList.append(renderExplorerTreeItem({
      rowContent: Array.from(categoryName.childNodes),
      children: typeList,
      stateKey: `category:${category.id}`,
      defaultOpen: true,
    }, hierarchyOpenState))
  }

  if (nodeEditor?.kind === 'category' && nodeEditor.mode === 'create') {
    const editorItem = document.createElement('li')
    editorItem.className = 'explorer-tree-item explorer-tree-editor-row'
    editorItem.setAttribute('role', 'treeitem')
    editorItem.append(
      Object.assign(document.createElement('span'), { className: 'explorer-tree-item-expander-spacer' }),
      createLucideIcon(Folder, 'explorer-tree-item-icon-structural'),
      createInlineEditor('New category'),
    )
    categoryList.append(editorItem)
  }

  return categoryList
}

const createDataTypeTree = () => {
  const typeList = document.createElement('ul')
  typeList.className = 'explorer-tree-item-children'
  typeList.setAttribute('role', 'group')

  for (const dataType of workspace.dataTypes.basic) {
    const isString = dataType === 'string'
    const isCreatingSubtype =
      isString &&
      nodeEditor?.kind === 'dataType' &&
      nodeEditor.mode === 'create' &&
      nodeEditor.parentId === 'string'
    const hasSubtypes = isString && (workspace.dataTypes.stringSubtypes.length > 0 || isCreatingSubtype)
    const row = document.createElement('div')
    const label = document.createElement('span')
    label.className = 'explorer-tree-item-label-technical'
    label.textContent = dataType
    row.append(createLucideIcon(Braces, 'explorer-tree-item-icon-data-type'), label)
    if (isString) {
      const actions = document.createElement('span')
      actions.className = 'explorer-tree-item-actions'
      actions.append(
        createAddControl([{
          label: 'String subtype',
          action: () => startEditing({ kind: 'dataType', mode: 'create', parentId: 'string' }),
        }]),
      )
      row.append(actions)
    }

    if (!hasSubtypes) {
      typeList.append(renderExplorerTreeItem({
        rowContent: Array.from(row.childNodes),
      }, hierarchyOpenState))
      continue
    }

    const subtypeList = document.createElement('ul')
    subtypeList.className = 'explorer-tree-item-children'
    subtypeList.setAttribute('role', 'group')
    for (const subtype of workspace.dataTypes.stringSubtypes) {
      const isSelected = window.location.hash.endsWith(`/string/${subtype.definitionId}`)
      const subtypeContent: Node[] = [createLucideIcon(Braces, 'explorer-tree-item-icon-data-type')]
      if (nodeEditor?.kind === 'dataType' && nodeEditor.mode === 'rename' && nodeEditor.id === subtype.definitionId) {
        subtypeContent.push(createInlineEditor('Rename string subtype', subtype.name, true))
      } else {
        const subtypeLabel = document.createElement('button')
        subtypeLabel.className = 'explorer-tree-item-label-technical'
        subtypeLabel.type = 'button'
        subtypeLabel.dataset.dataTypeId = subtype.definitionId
        subtypeLabel.textContent = subtype.name
        if (isSelected) subtypeLabel.setAttribute('aria-current', 'page')
        subtypeLabel.addEventListener('click', () => {
          window.location.hash = `data-types/string/${subtype.definitionId}`
        })
        const subtypeActions = document.createElement('span')
        subtypeActions.className = 'explorer-tree-item-actions'
        const references = dataTypeReferenceCount(workspace, subtype.definitionId)
        subtypeActions.append(createMoreControl([
          {
            label: 'Rename',
            action: () => startEditing({
              kind: 'dataType',
              mode: 'rename',
              id: subtype.definitionId,
              value: subtype.name,
            }),
          },
          {
            label: 'Delete',
            danger: true,
            blockedMessage: references > 0
              ? `This string subtype is used by ${references} attribute${references === 1 ? '' : 's'}. Change those attributes first.`
              : undefined,
            confirm: `Delete string subtype “${subtype.name}”?`,
            action: () => {
              dispatch({ type: 'stringSubtype.delete', definitionId: subtype.definitionId }, false)
              if (window.location.hash.endsWith(`/string/${subtype.definitionId}`)) {
                window.location.hash = 'data-types'
              } else {
                render()
              }
            },
          },
        ]))
        subtypeContent.push(subtypeLabel, subtypeActions)
      }
      subtypeList.append(renderExplorerTreeItem({
        rowContent: subtypeContent,
        selected: isSelected,
      }, hierarchyOpenState))
    }
    if (isCreatingSubtype) {
      const editorItem = document.createElement('li')
      editorItem.className = 'explorer-tree-item explorer-tree-editor-row'
      editorItem.setAttribute('role', 'treeitem')
      editorItem.append(
        Object.assign(document.createElement('span'), { className: 'explorer-tree-item-expander-spacer' }),
        createLucideIcon(Braces, 'explorer-tree-item-icon-data-type'),
        createInlineEditor('New string subtype', '', true),
      )
      subtypeList.append(editorItem)
    }
    typeList.append(renderExplorerTreeItem({
      rowContent: Array.from(row.childNodes),
      children: subtypeList,
      stateKey: 'data-type:string',
      defaultOpen: true,
    }, hierarchyOpenState))
  }

  return typeList
}

const createDataScopeTree = () => {
  const scopeList = document.createElement('ul')
  scopeList.className = 'explorer-tree-item-children'
  scopeList.setAttribute('role', 'group')

  for (const scope of workspace.applications.dataScopeCollection.items) {
    const categoryList = document.createElement('ul')
    categoryList.className = 'explorer-tree-item-children'
    categoryList.setAttribute('role', 'group')
    for (const category of scope.categories) {
      const categoryChildren = document.createElement('ul')
      categoryChildren.className = 'explorer-tree-item-children'
      categoryChildren.setAttribute('role', 'group')
      if (category.kind === 'apis') {
        for (const api of category.items) {
          const apiRoute = `#applications/data-scope/${scope.definitionId}/api/${api.definitionId}`
          const apiLabel = document.createElement('a')
          apiLabel.className = 'explorer-tree-item-label-technical'
          apiLabel.textContent = api.name
          apiLabel.href = apiRoute
          apiLabel.addEventListener('click', (event) => event.stopPropagation())
          categoryChildren.append(renderExplorerTreeItem({
            rowContent: [
              createLucideIcon(FileCode2, 'explorer-tree-item-icon-data-scope'),
              apiLabel,
            ],
            selected: window.location.hash === apiRoute,
          }, hierarchyOpenState))
        }
      }
      const categoryLabel = document.createElement('span')
      categoryLabel.className = 'explorer-tree-item-label'
      categoryLabel.textContent = category.name
      const categoryActions = document.createElement('span')
      categoryActions.className = 'explorer-tree-item-actions'
      if (category.kind === 'apis') {
        categoryActions.append(createAddControl([{
          label: 'Import WSDL',
          action: () => uploadWsdl(scope.definitionId, category.definitionId),
        }]))
      }
      categoryList.append(renderExplorerTreeItem({
        rowContent: [
          createLucideIcon(
            category.kind === 'apis' ? Server : SquareArrowOutUpRight,
            'explorer-tree-item-icon-data-scope',
          ),
          categoryLabel,
          categoryActions,
        ],
        children: category.kind === 'apis' && category.items.length ? categoryChildren : undefined,
        stateKey: `data-scope-category:${category.definitionId}`,
        defaultOpen: true,
      }, hierarchyOpenState))
    }
    const rowContent: Node[] = [createLucideIcon(Database, 'explorer-tree-item-icon-data-scope')]
    if (nodeEditor?.kind === 'dataScope' && nodeEditor.mode === 'rename' && nodeEditor.id === scope.definitionId) {
      rowContent.push(createInlineEditor('Rename data scope', scope.name, true))
    } else {
      const label = document.createElement('span')
      label.className = 'explorer-tree-item-label-technical'
      label.textContent = scope.name
      const actions = document.createElement('span')
      actions.className = 'explorer-tree-item-actions'
      actions.append(createMoreControl([
        {
          label: 'Rename',
          action: () => startEditing({
            kind: 'dataScope',
            mode: 'rename',
            id: scope.definitionId,
            value: scope.name,
          }),
        },
        {
          label: 'Delete',
          danger: true,
          confirm: `Delete data scope “${scope.name}”?`,
          action: () => dispatch({ type: 'dataScope.delete', definitionId: scope.definitionId }),
        },
      ]))
      rowContent.push(label, actions)
    }
    scopeList.append(renderExplorerTreeItem({
      rowContent,
      children: categoryList,
      stateKey: `data-scope:${scope.definitionId}`,
      defaultOpen: true,
    }, hierarchyOpenState))
  }

  if (nodeEditor?.kind === 'dataScope' && nodeEditor.mode === 'create') {
    const editorItem = document.createElement('li')
    editorItem.className = 'explorer-tree-item explorer-tree-editor-row'
    editorItem.setAttribute('role', 'treeitem')
    editorItem.append(
      Object.assign(document.createElement('span'), { className: 'explorer-tree-item-expander-spacer' }),
      createLucideIcon(Database, 'explorer-tree-item-icon-data-scope'),
      createInlineEditor('New data scope', '', true),
    )
    scopeList.append(editorItem)
  }

  return scopeList
}

const createApplicationTree = () => {
  const applicationList = document.createElement('ul')
  applicationList.className = 'explorer-tree-item-children'
  applicationList.setAttribute('role', 'group')

  const dataScopesRow = document.createElement('div')
  const dataScopesLabel = document.createElement('span')
  dataScopesLabel.className = 'explorer-tree-item-label'
  dataScopesLabel.textContent = workspace.applications.dataScopeCollection.name
  const actions = document.createElement('span')
  actions.className = 'explorer-tree-item-actions'
  actions.append(createAddControl([{
    label: 'Data scope',
    action: () => startEditing({ kind: 'dataScope', mode: 'create', parentId: 'data-scopes' }),
  }]))
  dataScopesRow.append(
    createLucideIcon(Folder, 'explorer-tree-item-icon-structural'),
    dataScopesLabel,
    actions,
  )

  applicationList.append(renderExplorerTreeItem({
    rowContent: Array.from(dataScopesRow.childNodes),
    children: createDataScopeTree(),
    stateKey: 'applications:data-scopes',
    defaultOpen: true,
  }, hierarchyOpenState))

  return applicationList
}

const createMiddlewareTree = () => {
  const middlewareList = document.createElement('ul')
  middlewareList.className = 'explorer-tree-item-children'
  middlewareList.setAttribute('role', 'group')

  for (const middleware of workspace.middleware.items) {
    const categoryList = document.createElement('ul')
    categoryList.className = 'explorer-tree-item-children'
    categoryList.setAttribute('role', 'group')
    for (const category of middleware.categories) {
      const pipelineChildren = document.createElement('ul')
      pipelineChildren.className = 'explorer-tree-item-children'
      pipelineChildren.setAttribute('role', 'group')
      if (category.kind === 'pipelines') {
        for (const pipeline of category.items) {
          const route = `#middleware/${middleware.definitionId}/pipeline/${pipeline.definitionId}`
          const rowContent: Node[] = [createLucideIcon(Route, 'explorer-tree-item-icon-data-scope')]
          if (nodeEditor?.kind === 'pipeline' && nodeEditor.mode === 'rename' && nodeEditor.id === pipeline.definitionId) {
            rowContent.push(createInlineEditor('Rename pipeline', pipeline.name, true))
          } else {
            const link = document.createElement('a')
            link.className = 'explorer-tree-item-label-technical'
            link.href = route
            link.textContent = pipeline.name
            link.addEventListener('click', (event) => event.stopPropagation())
            const actions = document.createElement('span')
            actions.className = 'explorer-tree-item-actions'
            actions.append(createMoreControl([
              {
                label: 'Rename',
                action: () => startEditing({
                  kind: 'pipeline',
                  mode: 'rename',
                  id: pipeline.definitionId,
                  parentId: middleware.definitionId,
                  value: pipeline.name,
                }),
              },
              {
                label: 'Delete',
                danger: true,
                confirm: `Delete pipeline “${pipeline.name}”?`,
                action: () => dispatch({ type: 'pipeline.delete', definitionId: pipeline.definitionId }),
              },
            ]))
            rowContent.push(link, actions)
          }
          pipelineChildren.append(renderExplorerTreeItem({
            rowContent,
            selected: window.location.hash === route,
          }, hierarchyOpenState))
        }
        if (nodeEditor?.kind === 'pipeline' && nodeEditor.mode === 'create'
          && nodeEditor.parentId === middleware.definitionId) {
          const editorItem = document.createElement('li')
          editorItem.className = 'explorer-tree-item explorer-tree-editor-row'
          editorItem.setAttribute('role', 'treeitem')
          editorItem.append(
            Object.assign(document.createElement('span'), { className: 'explorer-tree-item-expander-spacer' }),
            createLucideIcon(Route, 'explorer-tree-item-icon-data-scope'),
            createInlineEditor('New pipeline', '', true),
          )
          pipelineChildren.append(editorItem)
        }
      }
      const icon = category.kind === 'apis'
        ? Server
        : category.kind === 'clients' ? SquareArrowOutUpRight : Workflow
      const label = document.createElement('span')
      label.className = 'explorer-tree-item-label'
      label.textContent = category.name
      const actions = document.createElement('span')
      actions.className = 'explorer-tree-item-actions'
      if (category.kind === 'pipelines') {
        actions.append(createAddControl([{
          label: 'Pipeline',
          action: () => startEditing({
            kind: 'pipeline',
            mode: 'create',
            parentId: middleware.definitionId,
          }),
        }]))
      }
      categoryList.append(renderExplorerTreeItem({
        rowContent: [
          createLucideIcon(icon, 'explorer-tree-item-icon-data-scope'),
          label,
          actions,
        ],
        children: category.kind === 'pipelines' ? pipelineChildren : undefined,
        stateKey: `middleware:${middleware.definitionId}:${category.kind}`,
        defaultOpen: category.kind === 'pipelines',
      }, hierarchyOpenState))
    }

    const rowContent: Node[] = [createLucideIcon(Boxes, 'explorer-tree-item-icon-data-scope')]
    if (nodeEditor?.kind === 'middleware' && nodeEditor.mode === 'rename' && nodeEditor.id === middleware.definitionId) {
      rowContent.push(createInlineEditor('Rename middleware', middleware.name, true))
    } else {
      const label = document.createElement('span')
      label.className = 'explorer-tree-item-label-technical'
      label.textContent = middleware.name
      const actions = document.createElement('span')
      actions.className = 'explorer-tree-item-actions'
      actions.append(createMoreControl([
        {
          label: 'Rename',
          action: () => startEditing({
            kind: 'middleware',
            mode: 'rename',
            id: middleware.definitionId,
            value: middleware.name,
          }),
        },
        {
          label: 'Delete',
          danger: true,
          confirm: `Delete middleware “${middleware.name}”?`,
          action: () => dispatch({ type: 'middleware.delete', definitionId: middleware.definitionId }),
        },
      ]))
      rowContent.push(label, actions)
    }
    middlewareList.append(renderExplorerTreeItem({
      rowContent,
      children: categoryList,
      stateKey: `middleware:${middleware.definitionId}`,
      defaultOpen: true,
    }, hierarchyOpenState))
  }

  if (nodeEditor?.kind === 'middleware' && nodeEditor.mode === 'create') {
    const editorItem = document.createElement('li')
    editorItem.className = 'explorer-tree-item explorer-tree-editor-row'
    editorItem.setAttribute('role', 'treeitem')
    editorItem.append(
      Object.assign(document.createElement('span'), { className: 'explorer-tree-item-expander-spacer' }),
      createLucideIcon(Boxes, 'explorer-tree-item-icon-data-scope'),
      createInlineEditor('New middleware', '', true),
    )
    middlewareList.append(editorItem)
  }

  return middlewareList
}

const renderNavigation = () => {
  navigation.replaceChildren()
  const rootList = document.createElement('ul')
  rootList.className = 'explorer-tree'
  rootList.setAttribute('role', 'tree')
  const route = window.location.hash || '#record-types'
  const roots = workspace.topLevels.map(({ id, label }) => ({
    label,
    href: `#${id}`,
    children:
      id === 'record-types'
        ? createCategoryTree()
        : id === 'data-types'
          ? createDataTypeTree()
          : id === 'applications'
            ? createApplicationTree()
            : id === 'middleware'
              ? createMiddlewareTree()
            : undefined,
  }))

  for (const root of roots) {
    const rootKey = `root:${root.href.slice(1)}`
    const isRootSelected = root.children ? route.startsWith(root.href) : route === root.href
    const summary = document.createElement('div')
    const link = document.createElement('a')
    link.className = 'explorer-tree-item-label'
    link.href = root.href
    link.textContent = root.label
    link.addEventListener('click', (event) => event.stopPropagation())
    if (isRootSelected) link.setAttribute('aria-current', 'page')
    summary.append(createLucideIcon(Folder, 'explorer-tree-item-icon-structural'), link)

    if (root.href === '#record-types' || root.href === '#middleware') {
      const actions = document.createElement('span')
      actions.className = 'explorer-tree-item-actions'
      actions.append(createAddControl([{
        label: root.href === '#record-types' ? 'Category' : 'Middleware',
        action: () => startEditing(root.href === '#record-types'
          ? { kind: 'category', mode: 'create' }
          : { kind: 'middleware', mode: 'create' }),
      }]))
      summary.append(actions)
    }
    rootList.append(renderExplorerTreeItem({
      rowContent: Array.from(summary.childNodes),
      children: root.children,
      stateKey: rootKey,
      defaultOpen: isRootSelected,
    }, hierarchyOpenState))
  }

  const commands = new CommandRegistry()
  const importInput = registerWorkspaceTransferCommands(commands, workspace, (importedWorkspace) => {
    nodeEditor = null
    dispatch({ type: 'workspace.replace', workspace: importedWorkspace }, false)
    window.location.hash = 'record-types'
    render()
  })
  navigation.append(
    createSidebarViewHeader({
      title: 'Explorer',
      commandIds: ['workspace.import', 'workspace.export'],
      commands,
    }),
    importInput,
    rootList,
  )
}

return renderNavigation
}

