import { Braces, Database, Folder } from 'lucide'
import type { RecordType } from '../models/record-type'
import { rootRecordTypeDefinitionId, type Workspace } from '../domain/workspace'
import type { WorkspaceDispatcher } from '../state/dispatcher'
import { dataTypeReferenceCount, findRecordType, recordTypeExternalReferenceCount } from '../state/selectors'
import { createInlineEditor as createInlineEditorControl, createTreeAddControl, createTreeMoreControl } from './controls'
import { createLucideIcon, createRecordTypeIcon, type RecordTypeRelationship } from './icons'
import { renderTreeNode } from './tree/render-tree-node'
import { toUpperCamelCase, upperCamelCaseNamePattern } from './name-format'
import { createWorkspaceActions } from './workspace-actions'

interface NodeEditor {
  kind: 'category' | 'recordType' | 'dataType' | 'dataScope'
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
  }
}

const createInlineEditor = (label: string, value = '', technical = false) => {
  return createInlineEditorControl(label, value, technical, finishEditing)
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
  row.append(createRecordTypeIcon(relationship))

  if (nodeEditor?.kind === 'recordType' && nodeEditor.mode === 'rename' && nodeEditor.id === recordType.definitionId) {
    row.append(createInlineEditor('Rename record type', recordType.name, true))
  } else {
    const label = document.createElement('button')
    label.className = 'tree-record-link'
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
      actions.className = 'tree-actions'
      const references = recordTypeExternalReferenceCount(workspace, recordType)
      actions.append(
        createTreeAddControl([
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
        createTreeMoreControl([
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
    relatedList.className = 'tree-children'
    for (const child of recordType.children) relatedList.append(createRecordTypeTreeItem(child, 'child'))
    for (const subtype of recordType.subtypes) relatedList.append(createRecordTypeTreeItem(subtype, 'subtype'))
  }

  if (isCreatingRelatedRecord) {
    const isChild = nodeEditor?.parentKind === 'children'
    const editorItem = document.createElement('li')
    editorItem.className = 'tree-node tree-record-type'
    editorItem.append(
      Object.assign(document.createElement('span'), { className: 'tree-chevron-spacer' }),
      createRecordTypeIcon(isChild ? 'child' : 'subtype'),
      createInlineEditor(isChild ? 'New child record type' : 'New subtype', '', true),
    )
    relatedList?.append(editorItem)
  }

  return renderTreeNode({
    itemClassName: 'tree-record-item',
    rowClassName: 'tree-record-type',
    rowContent: Array.from(row.childNodes),
    children: relatedList,
    stateKey: `record-type:${recordType.definitionId}`,
    defaultOpen: true,
    selected: isSelected,
  }, hierarchyOpenState)
}

const createCategoryTree = () => {
  const categoryList = document.createElement('ul')
  categoryList.className = 'tree-children'
  categoryList.append(createRecordTypeTreeItem(workspace.recordTypes.root))

  for (const category of workspace.recordTypes.categories) {
    const categoryName = document.createElement('div')
    categoryName.append(createLucideIcon(Folder, 'tree-folder-icon'))

    if (nodeEditor?.kind === 'category' && nodeEditor.mode === 'rename' && nodeEditor.id === category.id) {
      categoryName.append(createInlineEditor('Rename category', category.name))
    } else {
      const label = document.createElement('span')
      label.className = 'tree-label'
      label.textContent = category.name
      const actions = document.createElement('span')
      actions.className = 'tree-actions'
      actions.append(
        createTreeAddControl([{
          label: 'Record type',
          action: () => startEditing({
            kind: 'recordType',
            mode: 'create',
            parentId: category.id,
            parentKind: 'category',
          }),
        }]),
        createTreeMoreControl([
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
      typeList.className = 'tree-children'

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
        editorItem.className = 'tree-node tree-record-type'
        editorItem.append(createRecordTypeIcon('root'), createInlineEditor('New record type', '', true))
        typeList.append(editorItem)
      }
    }
    categoryList.append(renderTreeNode({
      itemClassName: 'tree-category',
      rowClassName: 'tree-category-row',
      rowContent: Array.from(categoryName.childNodes),
      children: typeList,
      stateKey: `category:${category.id}`,
      defaultOpen: true,
    }, hierarchyOpenState))
  }

  if (nodeEditor?.kind === 'category' && nodeEditor.mode === 'create') {
    const editorItem = document.createElement('li')
    editorItem.className = 'tree-node tree-editor-row'
    editorItem.append(createLucideIcon(Folder, 'tree-folder-icon'), createInlineEditor('New category'))
    categoryList.append(editorItem)
  }

  return categoryList
}

const createDataTypeTree = () => {
  const typeList = document.createElement('ul')
  typeList.className = 'tree-children'

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
    label.className = 'tree-label technical-name'
    label.textContent = dataType
    row.append(createLucideIcon(Braces, 'tree-data-type-icon'), label)
    if (isString) {
      const actions = document.createElement('span')
      actions.className = 'tree-actions'
      actions.append(
        createTreeAddControl([{
          label: 'String subtype',
          action: () => startEditing({ kind: 'dataType', mode: 'create', parentId: 'string' }),
        }]),
      )
      row.append(actions)
    }

    if (!hasSubtypes) {
      typeList.append(renderTreeNode({
        rowClassName: 'tree-record-type',
        rowContent: Array.from(row.childNodes),
      }, hierarchyOpenState))
      continue
    }

    const subtypeList = document.createElement('ul')
    subtypeList.className = 'tree-children'
    for (const subtype of workspace.dataTypes.stringSubtypes) {
      const isSelected = window.location.hash.endsWith(`/string/${subtype.definitionId}`)
      const subtypeContent: Node[] = [createLucideIcon(Braces, 'tree-data-type-icon')]
      if (nodeEditor?.kind === 'dataType' && nodeEditor.mode === 'rename' && nodeEditor.id === subtype.definitionId) {
        subtypeContent.push(createInlineEditor('Rename string subtype', subtype.name, true))
      } else {
        const subtypeLabel = document.createElement('button')
        subtypeLabel.className = 'tree-record-link technical-name'
        subtypeLabel.type = 'button'
        subtypeLabel.dataset.dataTypeId = subtype.definitionId
        subtypeLabel.textContent = subtype.name
        if (isSelected) subtypeLabel.setAttribute('aria-current', 'page')
        subtypeLabel.addEventListener('click', () => {
          window.location.hash = `data-types/string/${subtype.definitionId}`
        })
        const subtypeActions = document.createElement('span')
        subtypeActions.className = 'tree-actions'
        const references = dataTypeReferenceCount(workspace, subtype.definitionId)
        subtypeActions.append(createTreeMoreControl([
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
      subtypeList.append(renderTreeNode({
        rowClassName: 'tree-record-type',
        rowContent: subtypeContent,
        selected: isSelected,
      }, hierarchyOpenState))
    }
    if (isCreatingSubtype) {
      const editorItem = document.createElement('li')
      editorItem.className = 'tree-node tree-record-type'
      editorItem.append(
        Object.assign(document.createElement('span'), { className: 'tree-chevron-spacer' }),
        createLucideIcon(Braces, 'tree-data-type-icon'),
        createInlineEditor('New string subtype', '', true),
      )
      subtypeList.append(editorItem)
    }
    typeList.append(renderTreeNode({
      rowClassName: 'tree-record-type',
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
  scopeList.className = 'tree-children'

  for (const scope of workspace.applications.dataScopes) {
    const rowContent: Node[] = [createLucideIcon(Database, 'tree-data-scope-icon')]
    if (nodeEditor?.kind === 'dataScope' && nodeEditor.mode === 'rename' && nodeEditor.id === scope.definitionId) {
      rowContent.push(createInlineEditor('Rename data scope', scope.name, true))
    } else {
      const label = document.createElement('span')
      label.className = 'tree-label technical-name'
      label.textContent = scope.name
      const actions = document.createElement('span')
      actions.className = 'tree-actions'
      actions.append(createTreeMoreControl([
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
    scopeList.append(renderTreeNode({
      rowClassName: 'tree-record-type',
      rowContent,
    }, hierarchyOpenState))
  }

  if (nodeEditor?.kind === 'dataScope' && nodeEditor.mode === 'create') {
    const editorItem = document.createElement('li')
    editorItem.className = 'tree-node tree-record-type'
    editorItem.append(
      Object.assign(document.createElement('span'), { className: 'tree-chevron-spacer' }),
      createLucideIcon(Database, 'tree-data-scope-icon'),
      createInlineEditor('New data scope', '', true),
    )
    scopeList.append(editorItem)
  }

  return scopeList
}

const renderNavigation = () => {
  navigation.replaceChildren()
  const rootList = document.createElement('ul')
  rootList.className = 'tree-list'
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
            ? createDataScopeTree()
            : undefined,
  }))

  for (const root of roots) {
    const rootKey = `root:${root.href.slice(1)}`
    const isRootSelected = root.children ? route.startsWith(root.href) : route === root.href
    const summary = document.createElement('div')
    const link = document.createElement('a')
    link.className = 'tree-root-link'
    link.href = root.href
    link.textContent = root.label
    link.addEventListener('click', (event) => event.stopPropagation())
    if (isRootSelected) link.setAttribute('aria-current', 'page')
    summary.append(createLucideIcon(Folder, 'tree-folder-icon'), link)

    if (root.href === '#record-types') {
      const actions = document.createElement('span')
      actions.className = 'tree-actions'
      actions.append(createTreeAddControl([{
        label: 'Category',
        action: () => startEditing({ kind: 'category', mode: 'create' }),
      }]))
      summary.append(actions)
    } else if (root.href === '#applications') {
      const actions = document.createElement('span')
      actions.className = 'tree-actions'
      actions.append(createTreeAddControl([{
        label: 'Data scope',
        action: () => startEditing({ kind: 'dataScope', mode: 'create', parentId: 'applications' }),
      }]))
      summary.append(actions)
    }
    rootList.append(renderTreeNode({
      rowClassName: 'tree-root-row',
      rowContent: Array.from(summary.childNodes),
      children: root.children,
      stateKey: rootKey,
      defaultOpen: isRootSelected,
    }, hierarchyOpenState))
  }

  navigation.append(createWorkspaceActions(workspace, (importedWorkspace) => {
    nodeEditor = null
    dispatch({ type: 'workspace.replace', workspace: importedWorkspace }, false)
    window.location.hash = 'record-types'
    render()
  }), rootList)
}

return renderNavigation
}

