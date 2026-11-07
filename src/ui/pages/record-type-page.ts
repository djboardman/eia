import { ArrowLeftRight, ChevronRight, GripVertical, LockKeyhole, Link2, Plus, Shapes } from 'lucide'
import type { AttributeDefinition, RecordType, RecordTypeKind, RelationshipAttributeDefinition } from '../../models/record-type'
import { recordTypeIdAttributeDefinitionId, rootRecordTypeDefinitionId, type Workspace } from '../../domain/workspace'
import { getDataTypeOptions, resolveDataTypeName } from '../../domain/data-types'
import type { WorkspaceDispatcher } from '../../state/dispatcher'
import {
  findRecordType as selectRecordType,
  findRecordTypeContext as selectRecordTypeContext,
  getAllRecordTypes as selectAllRecordTypes,
  includedRecordTypesFor,
  relationshipReferenceCount,
  resolveRelationshipAttribute as selectRelationshipAttribute,
  resolvedAttributesFor as selectResolvedAttributes,
  type RecordTypeContext,
} from '../../state/selectors'
import { createDeleteButton as createAttributeDeleteButton, createToggleButton as createConstraintButton } from '../controls'
import { createLucideIcon, createRecordTypeIcon, type RecordTypeRelationship } from '../icons'

interface RecordTypePageDependencies {
  workspace: Workspace
  content: HTMLElement
  dispatch: WorkspaceDispatcher
  render: () => void
}

export const createRecordTypePage = ({ workspace, content, dispatch, render }: RecordTypePageDependencies) => {
  let draggedAttributeId: string | null = null
  const relationshipSelectorViews = new Map<string, boolean>()
  const attributeGroupViews = new Map<string, boolean>()
const findRecordTypeContext = (definitionId: string): RecordTypeContext | undefined =>
  selectRecordTypeContext(workspace, definitionId)
const findRecordType = (definitionId: string) => selectRecordType(workspace, definitionId)
const getAllRecordTypes = () => selectAllRecordTypes(workspace)
const resolveRelationshipAttribute = (relationship: RelationshipAttributeDefinition) =>
  selectRelationshipAttribute(workspace, relationship)
const resolvedAttributesFor = (recordType: RecordType) => selectResolvedAttributes(workspace, recordType)

const createSchemaBadge = (label: string) => {
  const badge = document.createElement('span')
  badge.className = 'schema-badge'
  badge.textContent = label
  return badge
}

const createAttributeRow = (recordType: RecordType, attribute: AttributeDefinition) => {
  const row = document.createElement('li')
  row.className = 'attribute-row attribute-row-standard'
  row.draggable = true
  row.dataset.attributeId = attribute.definitionId
  row.append(createLucideIcon(GripVertical, 'attribute-drag-icon'))

  const name = document.createElement('input')
  name.className = 'attribute-name'
  name.value = attribute.name
  name.setAttribute('aria-label', 'Attribute name')
  name.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') name.blur()
  })
  name.addEventListener('change', () => {
    const nextName = name.value.trim()
    if (nextName) dispatch({
      type: 'attribute.update',
      recordTypeDefinitionId: recordType.definitionId,
      definitionId: attribute.definitionId,
      changes: { name: nextName },
    })
  })

  const type = document.createElement('select')
  type.className = 'attribute-type'
  type.setAttribute('aria-label', `Data type for ${attribute.name}`)

  const typeOptions = getDataTypeOptions(workspace)
  const appendTypeGroup = (label: string, dataTypes: Array<{ definitionId: string; name: string }>) => {
    if (dataTypes.length === 0) return
    const group = document.createElement('optgroup')
    group.label = label
    for (const dataType of dataTypes) {
      const option = document.createElement('option')
      option.value = dataType.definitionId
      option.textContent = dataType.name
      option.selected = dataType.definitionId === attribute.dataTypeDefinitionId
      group.append(option)
    }
    type.append(group)
  }
  appendTypeGroup('Basic JSON types', typeOptions.basic)
  appendTypeGroup('Inherited from string', typeOptions.stringSubtypes)

  const availableTypes = new Set<string>([
    ...typeOptions.basic.map(({ definitionId }) => definitionId),
    ...typeOptions.stringSubtypes.map(({ definitionId }) => definitionId),
  ])
  if (!availableTypes.has(attribute.dataTypeDefinitionId)) {
    const unavailable = document.createElement('option')
    unavailable.value = attribute.dataTypeDefinitionId
    unavailable.textContent = `${attribute.dataTypeDefinitionId} (unavailable)`
    unavailable.selected = true
    unavailable.disabled = true
    type.append(unavailable)
  }
  type.addEventListener('change', () => {
    dispatch({
      type: 'attribute.update',
      recordTypeDefinitionId: recordType.definitionId,
      definitionId: attribute.definitionId,
      changes: { dataTypeDefinitionId: type.value },
    })
  })

  const constraints = document.createElement('div')
  constraints.className = 'schema-constraints'
  constraints.append(
    createSchemaBadge('Optional'),
    createConstraintButton(attribute.nullable ? 'Nullable' : 'Not nullable', !attribute.nullable, () => {
      dispatch({
        type: 'attribute.update',
        recordTypeDefinitionId: recordType.definitionId,
        definitionId: attribute.definitionId,
        changes: { nullable: !attribute.nullable },
      })
    }),
  )

  const relationshipReferences = relationshipReferenceCount(workspace, attribute.definitionId)
  const deleteButton = createAttributeDeleteButton(
    `attribute “${attribute.name}”`,
    () => dispatch({
      type: 'attribute.delete',
      recordTypeDefinitionId: recordType.definitionId,
      definitionId: attribute.definitionId,
    }),
    relationshipReferences > 0
      ? `This attribute is used by ${relationshipReferences} relationship attribute${relationshipReferences === 1 ? '' : 's'}. Delete those relationships first.`
      : undefined,
  )

  row.append(name, type, constraints, deleteButton)
  row.addEventListener('dragstart', (event) => {
    draggedAttributeId = attribute.definitionId
    event.dataTransfer?.setData('text/plain', attribute.definitionId)
    event.dataTransfer?.setDragImage(row, 16, 14)
  })
  row.addEventListener('dragover', (event) => {
    event.preventDefault()
    row.classList.add('is-drop-target')
  })
  row.addEventListener('dragleave', () => row.classList.remove('is-drop-target'))
  row.addEventListener('drop', (event) => {
    event.preventDefault()
    row.classList.remove('is-drop-target')
    if (!draggedAttributeId || draggedAttributeId === attribute.definitionId) return

    dispatch({
      type: 'attribute.move',
      recordTypeDefinitionId: recordType.definitionId,
      definitionId: draggedAttributeId,
      beforeDefinitionId: attribute.definitionId,
    })
    draggedAttributeId = null
  })
  row.addEventListener('dragend', () => {
    draggedAttributeId = null
    row.classList.remove('is-drop-target')
  })
  return row
}

const createRelationshipAttributeRow = (
  recordType: RecordType,
  relationship: RelationshipAttributeDefinition,
) => {
  const row = document.createElement('li')
  row.className = 'attribute-row attribute-row-relationship relationship-attribute-row'
  row.dataset.attributeId = relationship.definitionId

  const resolved = resolveRelationshipAttribute(relationship)
  const selectorOpen = relationshipSelectorViews.get(relationship.definitionId) ?? !resolved
  if (selectorOpen) row.classList.add('relationship-selector-open')
  const name = document.createElement('strong')
  name.className = 'relationship-attribute-name'
  name.textContent = resolved?.name ?? ''

  const source = document.createElement('select')
  source.className = 'relationship-control technical-name'
  source.setAttribute('aria-label', 'Relationship record type')
  const sourcePlaceholder = document.createElement('option')
  sourcePlaceholder.value = ''
  sourcePlaceholder.textContent = 'Record type…'
  source.append(sourcePlaceholder)
  for (const recordType of getAllRecordTypes()) {
    const option = document.createElement('option')
    option.value = recordType.definitionId
    option.textContent = recordType.name
    option.selected = recordType.definitionId === relationship.recordTypeDefinitionId
    source.append(option)
  }

  const role = document.createElement('input')
  role.className = 'relationship-control technical-name'
  role.value = relationship.role ?? ''
  role.placeholder = 'Role (optional)'
  role.setAttribute('aria-label', 'Relationship role')

  const attribute = document.createElement('select')
  attribute.className = 'relationship-control technical-name'
  attribute.setAttribute('aria-label', 'Relationship attribute')
  const attributePlaceholder = document.createElement('option')
  attributePlaceholder.value = ''
  attributePlaceholder.textContent = 'Attribute…'
  attribute.append(attributePlaceholder)
  const selectedRecordType = findRecordType(relationship.recordTypeDefinitionId)
  if (selectedRecordType) {
    const idOption = document.createElement('option')
    idOption.value = recordTypeIdAttributeDefinitionId
    idOption.textContent = 'id'
    idOption.selected = relationship.attributeDefinitionId === recordTypeIdAttributeDefinitionId
    attribute.append(idOption)
  }
  for (const sourceAttribute of selectedRecordType?.attributes ?? []) {
    const option = document.createElement('option')
    option.value = sourceAttribute.definitionId
    option.textContent = sourceAttribute.name
    option.selected = sourceAttribute.definitionId === relationship.attributeDefinitionId
    attribute.append(option)
  }

  source.addEventListener('change', () => {
    dispatch({
      type: 'relationshipAttribute.update',
      recordTypeDefinitionId: recordType.definitionId,
      definitionId: relationship.definitionId,
      changes: {
        recordTypeDefinitionId: source.value,
        attributeDefinitionId: source.value ? recordTypeIdAttributeDefinitionId : '',
      },
    })
  })
  role.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') role.blur()
  })
  role.addEventListener('change', () => {
    dispatch({
      type: 'relationshipAttribute.update',
      recordTypeDefinitionId: recordType.definitionId,
      definitionId: relationship.definitionId,
      changes: { role: role.value.trim() || undefined },
    })
  })
  attribute.addEventListener('change', () => {
    if (attribute.value) relationshipSelectorViews.set(relationship.definitionId, false)
    dispatch({
      type: 'relationshipAttribute.update',
      recordTypeDefinitionId: recordType.definitionId,
      definitionId: relationship.definitionId,
      changes: { attributeDefinitionId: attribute.value },
    })
  })

  const type = document.createElement('span')
  type.className = 'schema-type'
  type.textContent = resolved ? resolveDataTypeName(workspace, resolved.dataTypeDefinitionId) ?? '—' : '—'

  const controls = document.createElement('div')
  controls.className = 'relationship-controls'
  controls.append(source, role, attribute)

  const constraints = document.createElement('div')
  constraints.className = 'schema-constraints'
  constraints.append(createSchemaBadge('Optional'))

  const switchView = document.createElement('button')
  switchView.className = 'attribute-mode-switch relationship-mode-switch'
  switchView.type = 'button'
  switchView.disabled = selectorOpen && !resolved
  switchView.title =
    selectorOpen && !resolved
      ? 'Select a record type and attribute first'
      : selectorOpen
        ? 'Show generated attribute name'
        : 'Show relationship selector'
  switchView.setAttribute('aria-label', switchView.title)
  switchView.append(
    createLucideIcon(ArrowLeftRight, 'tree-action-icon'),
    selectorOpen ? 'Name' : 'Relationship',
  )
  switchView.addEventListener('click', () => {
    relationshipSelectorViews.set(relationship.definitionId, !selectorOpen)
    render()
  })

  const deleteButton = createAttributeDeleteButton(
    `relationship attribute “${resolved?.name ?? 'incomplete relationship'}”`,
    () => {
      relationshipSelectorViews.delete(relationship.definitionId)
      dispatch({
        type: 'relationshipAttribute.delete',
        recordTypeDefinitionId: recordType.definitionId,
        definitionId: relationship.definitionId,
      })
    },
  )

  row.append(createLucideIcon(Link2, 'relationship-icon'), name, type, switchView, constraints, deleteButton)
  if (selectorOpen) row.append(controls)
  return row
}

const createFixedSchemaRow = (name: string) => {
  const row = document.createElement('div')
  row.className = 'attribute-row attribute-row-fixed schema-fixed-row'
  const field = document.createElement('strong')
  field.className = 'schema-attribute-name'
  field.textContent = name
  const dataType = document.createElement('span')
  dataType.className = 'schema-type'
  dataType.textContent = 'string'
  row.append(createLucideIcon(LockKeyhole, 'schema-lock-icon'), field, dataType)

  const constraints = document.createElement('div')
  constraints.className = 'schema-constraints'
  constraints.append(createSchemaBadge('Required'), createSchemaBadge('Not nullable'))
  row.append(constraints)
  return row
}

const createInheritedAttributeRow = (attribute: AttributeDefinition, source: string) => {
  const row = document.createElement('li')
  row.className = 'attribute-row attribute-row-inherited inherited-attribute-row'
  const name = document.createElement('strong')
  name.className = 'schema-attribute-name'
  name.textContent = attribute.name
  const dataType = document.createElement('span')
  dataType.className = 'schema-type'
  dataType.textContent = resolveDataTypeName(workspace, attribute.dataTypeDefinitionId) ?? '—'
  const origin = document.createElement('span')
  origin.className = 'inherited-origin technical-name'
  origin.textContent = `Inherited from ${source}`
  const constraints = document.createElement('div')
  constraints.className = 'schema-constraints'
  constraints.append(
    createSchemaBadge('Optional'),
    createSchemaBadge(attribute.nullable ? 'Nullable' : 'Not nullable'),
  )
  row.append(createLucideIcon(Shapes, 'inherited-attribute-icon'), name, dataType, origin, constraints)
  return row
}

const renderRecordTypeDesigner = (
  recordType: RecordType,
  inheritedFrom: RecordType[],
  parentRecordType?: RecordType,
) => {
  content.replaceChildren()

  const header = document.createElement('header')
  header.className = 'designer-header'
  const titleGroup = document.createElement('div')
  const eyebrow = document.createElement('p')
  eyebrow.className = 'designer-eyebrow'
  eyebrow.textContent = 'Record type'
  titleGroup.append(eyebrow)
  if (parentRecordType) {
    const parentName = document.createElement('p')
    parentName.className = 'designer-parent-name'
    parentName.textContent = parentRecordType.name
    titleGroup.append(parentName)
  }
  const heading = document.createElement('h1')
  heading.className = 'page-title technical-name'
  heading.textContent = recordType.name
  const titleLine = document.createElement('div')
  titleLine.className = 'record-type-title-line'
  const relationship: RecordTypeRelationship = inheritedFrom.at(-1)?.definitionId !== rootRecordTypeDefinitionId
    ? 'subtype'
    : parentRecordType
      ? 'child'
      : 'root'
  const titleIcon = createRecordTypeIcon(relationship, false, 'title')
  titleLine.append(titleIcon, heading)
  titleGroup.append(titleLine)
  if (inheritedFrom.length > 0) {
    const supertypeHierarchy = document.createElement('p')
    supertypeHierarchy.className = 'designer-supertype-hierarchy'
    supertypeHierarchy.textContent = inheritedFrom.map(({ name }) => name).join(' > ')
    titleGroup.append(supertypeHierarchy)
  }
  const kindControl = document.createElement('div')
  kindControl.className = 'record-type-kind-control'
  kindControl.setAttribute('role', 'group')
  kindControl.setAttribute('aria-label', 'Record type classification')
  const kinds: Array<{ value: RecordTypeKind; label: string }> = [
    { value: 'social', label: 'Social' },
    { value: 'physical', label: 'Physical' },
    { value: 'countsAs', label: 'Counts As' },
  ]
  for (const kind of kinds) {
    const button = document.createElement('button')
    button.className = 'record-type-kind-button'
    button.type = 'button'
    button.textContent = kind.label
    button.setAttribute('aria-pressed', String(recordType.kind === kind.value))
    button.addEventListener('click', () => {
      dispatch({ type: 'recordType.setKind', definitionId: recordType.definitionId, kind: kind.value })
    })
    kindControl.append(button)
  }
  header.append(titleGroup, kindControl)

  const layout = document.createElement('div')
  layout.className = 'schema-layout'
  const schema = document.createElement('section')
  schema.className = 'schema-card'

  const dataHeader = document.createElement('header')
  dataHeader.className = 'attributes-header'
  const dataTitle = document.createElement('h3')
  dataTitle.className = 'attributes-title'
  dataTitle.textContent = 'data'
  dataHeader.append(dataTitle)

  const fixedFields = document.createElement('div')
  fixedFields.className = 'schema-fixed-fields'
  fixedFields.append(createFixedSchemaRow('id'), createFixedSchemaRow('type'))

  const inheritedAttributes = inheritedFrom
    .filter(({ definitionId }) => definitionId !== rootRecordTypeDefinitionId)
    .flatMap((parent) =>
      resolvedAttributesFor(parent).map((attribute) => ({ attribute, source: parent.name })),
    )
  const recordAttributes = inheritedFrom
    .filter(({ definitionId }) => definitionId === rootRecordTypeDefinitionId)
    .flatMap((parent) =>
      resolvedAttributesFor(parent).map((attribute) => ({ attribute, source: parent.name })),
    )
  const attributesHeader = document.createElement('header')
  attributesHeader.className = 'attributes-header'
  const attributesTitle = document.createElement('h3')
  attributesTitle.className = 'attributes-title'
  attributesTitle.textContent = 'data.attributes'
  const addButton = document.createElement('button')
  addButton.className = 'tree-action'
  addButton.type = 'button'
  addButton.title = 'Add attribute'
  addButton.setAttribute('aria-label', 'Add attribute')
  addButton.append(createLucideIcon(Plus, 'tree-action-icon'))
  addButton.addEventListener('click', () => {
    const { definitionId } = dispatch({
      type: 'attribute.add',
      recordTypeDefinitionId: recordType.definitionId,
      definitionId: crypto.randomUUID(),
    })
    requestAnimationFrame(() => {
      const input = content.querySelector<HTMLInputElement>(`[data-attribute-id="${definitionId}"] .attribute-name`)
      input?.focus()
      input?.select()
    })
  })
  const addRelationshipButton = document.createElement('button')
  addRelationshipButton.className = 'tree-action'
  addRelationshipButton.type = 'button'
  addRelationshipButton.title = 'Add relationship attribute'
  addRelationshipButton.setAttribute('aria-label', 'Add relationship attribute')
  addRelationshipButton.append(createLucideIcon(Link2, 'tree-action-icon'))
  addRelationshipButton.addEventListener('click', () => {
    const { definitionId } = dispatch({
      type: 'relationshipAttribute.add',
      recordTypeDefinitionId: recordType.definitionId,
      definitionId: crypto.randomUUID(),
    }, false)
    if (definitionId) relationshipSelectorViews.set(definitionId, true)
    render()
    requestAnimationFrame(() => {
      content
        .querySelector<HTMLSelectElement>(`[data-attribute-id="${definitionId}"] select`)
        ?.focus()
    })
  })
  const attributeActions = document.createElement('div')
  attributeActions.className = 'attribute-actions'
  attributeActions.append(addButton, addRelationshipButton)
  attributesHeader.append(attributesTitle, attributeActions)

  const attributeGroups = document.createElement('div')
  attributeGroups.className = 'attribute-groups'
  const appendAttributeGroup = (key: string, title: string, rows: HTMLElement[]) => {
    if (rows.length === 0) return
    const viewKey = `${recordType.definitionId}:${key}`
    const group = document.createElement('details')
    group.className = 'attribute-group'
    group.open = attributeGroupViews.get(viewKey) ?? true
    group.addEventListener('toggle', () => attributeGroupViews.set(viewKey, group.open))
    const heading = document.createElement('summary')
    heading.className = 'attribute-group-title'
    const headingText = document.createElement('span')
    headingText.textContent = title
    heading.append(createLucideIcon(ChevronRight, 'attribute-group-chevron'), headingText)
    const list = document.createElement('ul')
    list.className = 'attribute-list'
    list.append(...rows)
    group.append(heading, list)
    attributeGroups.append(group)
  }

  appendAttributeGroup(
    'direct',
    'Direct attributes',
    recordType.attributes.map((attribute) => createAttributeRow(recordType, attribute)),
  )
  appendAttributeGroup(
    'relationships',
    'Relationship attributes',
    recordType.relationshipAttributes.map((relationship) =>
      createRelationshipAttributeRow(recordType, relationship)),
  )
  appendAttributeGroup(
    'inherited',
    'Inherited attributes',
    inheritedAttributes.map(({ attribute, source }) => createInheritedAttributeRow(attribute, source)),
  )
  appendAttributeGroup(
    'record',
    'Record attributes',
    recordAttributes.map(({ attribute, source }) => createInheritedAttributeRow(attribute, source)),
  )

  if (
    inheritedAttributes.length === 0 &&
    recordAttributes.length === 0 &&
    recordType.attributes.length === 0 &&
    recordType.relationshipAttributes.length === 0
  ) {
    const empty = document.createElement('p')
    empty.className = 'attributes-empty'
    empty.textContent = 'Add the first attribute to define this object.'
    attributeGroups.append(empty)
  }

  const includedHeader = document.createElement('header')
  includedHeader.className = 'attributes-header'
  const includedTitle = document.createElement('h3')
  includedTitle.className = 'attributes-title'
  includedTitle.textContent = 'included'
  includedHeader.append(includedTitle)

  const includedList = document.createElement('ul')
  includedList.className = 'included-list'
  const includedRecordTypes = includedRecordTypesFor(recordType)
  for (const included of includedRecordTypes) {
    const item = document.createElement('li')
    item.className = 'included-record-row'
    const name = document.createElement('span')
    name.className = 'included-record-name'
    name.textContent = included.recordType.name
    item.append(createRecordTypeIcon(included.relationship), name)
    includedList.append(item)
  }
  if (includedRecordTypes.length === 0) {
    const empty = document.createElement('li')
    empty.className = 'attributes-empty'
    empty.textContent = 'No child record types to include.'
    includedList.append(empty)
  }

  schema.append(dataHeader, fixedFields)
  schema.append(attributesHeader, attributeGroups, includedHeader, includedList)

  layout.append(schema)
  content.append(header, layout)
}


  return (definitionId: string) => {
    const context = findRecordTypeContext(definitionId)
    if (!context) return false
    renderRecordTypeDesigner(context.recordType, context.inheritedFrom, context.parentRecordType)
    return true
  }
}

