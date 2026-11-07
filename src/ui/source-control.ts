import type { ChangeJournalEntry } from '../domain/change-journal'
import type { Workspace } from '../domain/workspace'
import type { LocalRepository } from '../domain/local-repository'
import type { RepositoryCatalog } from '../domain/repository-catalog'
import type { ForkPullPreview } from '../persistence/repository-sync'
import type { WorkspaceCommand } from '../state/commands'
import { getAllRecordTypes, resolveRelationshipAttribute } from '../state/selectors'
import { CommandRegistry } from './command-registry'
import { createSidebarViewHeader } from './sidebar-view-header'

export type ChangeGroup = 'Record Types' | 'Data Types' | 'Applications' | 'Middleware' | 'Workspace'

const groupForCommand = (command: WorkspaceCommand): ChangeGroup => {
  if (command.type.startsWith('stringSubtype.')) return 'Data Types'
  if (command.type.startsWith('dataScope.')) return 'Applications'
  if (command.type.startsWith('api.')) return 'Applications'
  if (command.type.startsWith('middleware.')) return 'Middleware'
  if (command.type.startsWith('pipeline.')) return 'Middleware'
  if (command.type === 'workspace.replace') return 'Workspace'
  return 'Record Types'
}

export const groupJournalEntries = (entries: readonly ChangeJournalEntry[]) => {
  const groups = new Map<ChangeGroup, ChangeJournalEntry[]>()
  for (const entry of entries) {
    const group = groupForCommand(entry.command)
    groups.set(group, [...(groups.get(group) ?? []), entry])
  }
  return groups
}

interface ChangeNames {
  categories: Map<string, string>
  recordTypes: Map<string, string>
  stringSubtypes: Map<string, string>
  dataScopes: Map<string, string>
  middleware: Map<string, string>
  pipelines: Map<string, string>
  apis: Map<string, string>
  attributes: Map<string, string>
  relationships: Map<string, string>
}

const collectChangeNames = (workspace: Workspace, entries: readonly ChangeJournalEntry[]): ChangeNames => {
  const names: ChangeNames = {
    categories: new Map(workspace.recordTypes.categories.map(({ id, name }) => [id, name])),
    recordTypes: new Map(),
    stringSubtypes: new Map(workspace.dataTypes.stringSubtypes.map(({ definitionId, name }) => [definitionId, name])),
    dataScopes: new Map(workspace.applications.dataScopeCollection.items.map(
      ({ definitionId, name }) => [definitionId, name],
    )),
    middleware: new Map(workspace.middleware.items.map(({ definitionId, name }) => [definitionId, name])),
    pipelines: new Map(workspace.middleware.items.flatMap(({ categories }) => categories.flatMap((category) =>
      category.kind === 'pipelines'
        ? category.items.map(({ definitionId, name }) => [definitionId, name] as const)
        : []))),
    apis: new Map(workspace.applications.dataScopeCollection.items.flatMap(({ categories }) => categories
      .filter((category) => category.kind === 'apis')
      .flatMap(({ items }) => items.map(({ definitionId, name }) => [definitionId, name] as const)))),
    attributes: new Map(),
    relationships: new Map(),
  }
  for (const recordType of getAllRecordTypes(workspace)) {
    names.recordTypes.set(recordType.definitionId, recordType.name)
    for (const attribute of recordType.attributes) names.attributes.set(attribute.definitionId, attribute.name)
    for (const relationship of recordType.relationshipAttributes) {
      names.relationships.set(
        relationship.definitionId,
        resolveRelationshipAttribute(workspace, relationship)?.name ?? 'relationship attribute',
      )
    }
  }
  for (const { command } of entries) {
    if (command.type === 'category.create' || command.type === 'category.rename') {
      names.categories.set(command.definitionId, command.name)
    } else if (command.type === 'recordType.create' || command.type === 'recordType.rename') {
      names.recordTypes.set(command.definitionId, command.name)
    } else if (command.type === 'stringSubtype.create') {
      names.stringSubtypes.set(command.definitionId, command.name)
    } else if (command.type === 'stringSubtype.update' && command.changes.name) {
      names.stringSubtypes.set(command.definitionId, command.changes.name)
    } else if (command.type === 'dataScope.create' || command.type === 'dataScope.rename') {
      names.dataScopes.set(command.definitionId, command.name)
    } else if (command.type === 'middleware.create' || command.type === 'middleware.rename') {
      names.middleware.set(command.definitionId, command.name)
    } else if (command.type === 'pipeline.create' || command.type === 'pipeline.rename') {
      names.pipelines.set(command.definitionId, command.name)
    } else if (command.type === 'api.importWsdl') {
      names.apis.set(command.definitionId, command.name)
    } else if (command.type === 'attribute.update' && command.changes.name) {
      names.attributes.set(command.definitionId, command.changes.name)
    }
  }
  return names
}

const commandLabel = (command: WorkspaceCommand, names: ChangeNames) => {
  const recordType = 'recordTypeDefinitionId' in command
    ? names.recordTypes.get(command.recordTypeDefinitionId)
    : undefined
  const onRecordType = recordType ? ` on ${recordType}` : ''
  switch (command.type) {
    case 'category.create': return `Add category ${command.name}`
    case 'category.rename': return `Rename category to ${command.name}`
    case 'category.delete': return `Delete category ${names.categories.get(command.definitionId) ?? ''}`.trim()
    case 'recordType.create': return `Add record type ${command.name}`
    case 'recordType.rename': return `Rename record type to ${command.name}`
    case 'recordType.setKind': return `Set ${names.recordTypes.get(command.definitionId) ?? 'record type'} to ${command.kind}`
    case 'recordType.delete': return `Delete record type ${names.recordTypes.get(command.definitionId) ?? ''}`.trim()
    case 'stringSubtype.create': return `Add string subtype ${command.name}`
    case 'stringSubtype.update': return `Update string subtype ${names.stringSubtypes.get(command.definitionId) ?? ''}`.trim()
    case 'stringSubtype.delete': return `Delete string subtype ${names.stringSubtypes.get(command.definitionId) ?? ''}`.trim()
    case 'dataScope.create': return `Add data scope ${command.name}`
    case 'dataScope.rename': return `Rename data scope to ${command.name}`
    case 'dataScope.delete': return `Delete data scope ${names.dataScopes.get(command.definitionId) ?? ''}`.trim()
    case 'middleware.create': return `Add middleware ${command.name}`
    case 'middleware.rename': return `Rename middleware to ${command.name}`
    case 'middleware.delete': return `Delete middleware ${names.middleware.get(command.definitionId) ?? ''}`.trim()
    case 'pipeline.create': return `Add pipeline ${command.name}`
    case 'pipeline.rename': return `Rename pipeline to ${command.name}`
    case 'pipeline.update': return `Update pipeline ${names.pipelines.get(command.definitionId) ?? ''}`.trim()
    case 'pipeline.delete': return `Delete pipeline ${names.pipelines.get(command.definitionId) ?? ''}`.trim()
    case 'api.importWsdl': return `Import API ${names.apis.get(command.definitionId) ?? command.name}`
    case 'attribute.add': return `Add attribute ${names.attributes.get(command.definitionId) ?? ''}${onRecordType}`.trim()
    case 'attribute.update': return `Update ${names.attributes.get(command.definitionId) ?? 'attribute'}${onRecordType}`
    case 'attribute.delete': return `Delete ${names.attributes.get(command.definitionId) ?? 'attribute'}${onRecordType}`
    case 'attribute.move': return `Move ${names.attributes.get(command.definitionId) ?? 'attribute'}${onRecordType}`
    case 'relationshipAttribute.add': return `Add ${names.relationships.get(command.definitionId) ?? 'relationship attribute'}${onRecordType}`
    case 'relationshipAttribute.update': return `Update ${names.relationships.get(command.definitionId) ?? 'relationship attribute'}${onRecordType}`
    case 'relationshipAttribute.delete': return `Delete ${names.relationships.get(command.definitionId) ?? 'relationship attribute'}${onRecordType}`
    case 'workspace.replace': return 'Replace workspace from import'
  }
}

export const describeJournalEntries = (workspace: Workspace, entries: readonly ChangeJournalEntry[]) => {
  const names = collectChangeNames(workspace, entries)
  return new Map(entries.map((entry) => [entry.id, commandLabel(entry.command, names)]))
}

interface SourceControlOptions {
  container: HTMLElement
  entries: readonly ChangeJournalEntry[]
  workspace: Workspace
  repository: LocalRepository
  catalog: RepositoryCatalog
  pullPreview?: ForkPullPreview
  onCommit: (message: string) => void
  onSelectRepository: (repositoryId: string) => void
  onCreateFork: (name: string) => void
  onPullFromSource: () => void
  onRefresh: () => void
}

const createSourceControlHeader = (count: number | undefined, onRefresh: () => void) => {
  const commands = new CommandRegistry()
  commands.register({ id: 'source-control.refresh', label: 'Refresh', execute: onRefresh })
  return createSidebarViewHeader({
    title: 'Source Control',
    count,
    commandIds: ['source-control.refresh'],
    commands,
  })
}

export const renderSourceControl = ({
  container,
  entries,
  workspace,
  repository,
  catalog,
  pullPreview,
  onCommit,
  onSelectRepository,
  onCreateFork,
  onPullFromSource,
  onRefresh,
}: SourceControlOptions) => {
  container.replaceChildren()
  const content = document.createElement('div')
  content.className = 'source-control-content'
  container.append(createSourceControlHeader(entries.length, onRefresh), content)

  const repositoryHeader = document.createElement('section')
  repositoryHeader.className = 'source-repository-section'
  const repositorySelect = document.createElement('select')
  repositorySelect.className = 'source-repository-select'
  repositorySelect.setAttribute('aria-label', 'Active repository')
  for (const item of catalog.repositories) {
    const option = document.createElement('option')
    option.value = item.id
    option.textContent = item.name
    option.selected = item.id === catalog.activeRepositoryId
    repositorySelect.append(option)
  }
  repositorySelect.addEventListener('change', () => onSelectRepository(repositorySelect.value))
  const repositorySummary = document.createElement('span')
  repositorySummary.className = repository.type === 'source'
    ? 'source-repository-summary source-repository-summary-source'
    : 'source-repository-summary source-repository-summary-fork'
  const upstreamName = catalog.repositories.find(({ id }) => id === repository.upstream?.repositoryId)?.name
  repositorySummary.textContent = repository.type === 'source' ? 'Source' : (upstreamName ?? 'Customer repository')
  if (repository.type === 'fork' && upstreamName) {
    repositorySummary.title = `Forked from ${upstreamName}`
    repositorySummary.setAttribute('aria-label', `Forked from ${upstreamName}`)
  }
  repositoryHeader.append(repositorySelect, repositorySummary)
  if (repository.type === 'fork') {
    if (pullPreview) {
      const pullSection = document.createElement('section')
      pullSection.className = 'source-pull-section'
      const pullStatus = document.createElement('strong')
      pullStatus.className = 'ui-status-text'
      pullStatus.textContent = pullPreview.commits.length
        ? `${pullPreview.changeCount} incoming change${pullPreview.changeCount === 1 ? '' : 's'}`
        : 'Up to date'
      pullSection.append(pullStatus)
      if (pullPreview.commits.length) {
        const list = document.createElement('ol')
        list.className = 'source-pull-list'
        for (const commit of pullPreview.commits) {
          const item = document.createElement('li')
          item.className = 'ui-metadata-text'
          item.textContent = commit.message
          list.append(item)
        }
        pullSection.append(list)
        const pullButton = document.createElement('button')
        pullButton.className = 'source-pull-button'
        pullButton.type = 'button'
        pullButton.disabled = pullPreview.conflicts.length > 0
        pullButton.textContent = pullPreview.conflicts.length ? 'Pull blocked' : 'Pull from Source'
        pullButton.addEventListener('click', onPullFromSource)
        pullSection.append(pullButton)
      }
      if (pullPreview.conflicts.length) {
        const conflict = document.createElement('span')
        conflict.className = 'ui-error-text'
        conflict.textContent = `${pullPreview.conflicts.length} conflict${pullPreview.conflicts.length === 1 ? '' : 's'} must be resolved before pulling.`
        pullSection.append(conflict)
      }
      repositoryHeader.append(pullSection)
    }
  } else {
    const forkButton = document.createElement('button')
    forkButton.className = 'source-fork-button'
    forkButton.type = 'button'
    forkButton.textContent = 'Create Fork'
    const forkForm = document.createElement('form')
    forkForm.className = 'source-fork-form'
    forkForm.style.display = 'none'
    const forkName = document.createElement('input')
    forkName.className = 'ui-text-input'
    forkName.setAttribute('aria-label', 'Fork name')
    forkName.value = `${repository.name} Fork`
    const confirmFork = document.createElement('button')
    confirmFork.className = 'ui-button-primary'
    confirmFork.type = 'submit'
    confirmFork.textContent = 'Create'
    const cancelFork = document.createElement('button')
    cancelFork.className = 'ui-button-secondary'
    cancelFork.type = 'button'
    cancelFork.textContent = 'Cancel'
    forkButton.addEventListener('click', () => {
      forkButton.hidden = true
      forkForm.style.display = 'grid'
      forkName.focus()
      forkName.select()
    })
    cancelFork.addEventListener('click', () => {
      forkForm.style.display = 'none'
      forkButton.hidden = false
      forkButton.focus()
    })
    forkForm.addEventListener('submit', (event) => {
      event.preventDefault()
      if (!forkName.value.trim()) {
        forkName.focus()
        return
      }
      onCreateFork(forkName.value)
    })
    forkForm.append(forkName, confirmFork, cancelFork)
    repositoryHeader.append(forkButton, forkForm)
  }
  content.append(repositoryHeader)

  const commitForm = document.createElement('form')
  commitForm.className = 'source-commit-form'
  const message = document.createElement('input')
  message.className = 'ui-text-input'
  message.placeholder = 'Commit message'
  message.setAttribute('aria-label', 'Commit message')
  const commitButton = document.createElement('button')
  commitButton.className = 'ui-button-primary'
  commitButton.type = 'submit'
  commitButton.textContent = 'Commit'
  commitButton.disabled = entries.length === 0
  commitForm.addEventListener('submit', (event) => {
    event.preventDefault()
    if (!message.value.trim()) {
      message.focus()
      return
    }
    onCommit(message.value)
  })
  commitForm.append(message, commitButton)
  content.append(commitForm)

  if (entries.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'ui-status-text'
    empty.textContent = 'No pending changes.'
    content.append(empty)
  } else {
    const labels = describeJournalEntries(workspace, entries)
    for (const [groupName, groupEntries] of groupJournalEntries(entries)) {
      const group = document.createElement('section')
      group.className = 'source-change-group'
      const heading = document.createElement('h3')
      heading.className = 'ui-section-title'
      heading.textContent = groupName
      const list = document.createElement('ol')
      list.className = 'source-change-list'
      for (const entry of [...groupEntries].reverse()) {
        const item = document.createElement('li')
        item.className = 'source-change-row'
        const label = document.createElement('span')
        label.className = 'ui-item-title flex-1'
        label.textContent = labels.get(entry.id) ?? 'Workspace change'
        const revision = document.createElement('span')
        revision.className = 'ui-metadata-text shrink-0'
        revision.textContent = `r${entry.revision}`
        item.append(label, revision)
        list.append(item)
      }
      group.append(heading, list)
      content.append(group)
    }
  }

  const history = document.createElement('section')
  history.className = 'source-history'
  const historyTitle = document.createElement('h3')
  historyTitle.className = 'ui-section-title'
  historyTitle.textContent = 'History'
  history.append(historyTitle)
  if (repository.commits.length === 0) {
    const empty = document.createElement('p')
    empty.className = 'ui-status-text'
    empty.textContent = 'No local commits.'
    history.append(empty)
  } else {
    const list = document.createElement('ol')
    list.className = 'source-history-list'
    for (const commit of [...repository.commits].reverse()) {
      const item = document.createElement('li')
      item.className = 'source-history-row'
      const message = document.createElement('span')
      message.className = 'ui-item-title'
      message.textContent = commit.message
      const details = document.createElement('span')
      details.className = 'ui-metadata-text'
      const layer = commit.layer === 'source' ? 'Source' : 'Fork'
      details.textContent = `${layer} · ${commit.changes.length} change${commit.changes.length === 1 ? '' : 's'} · ${new Date(commit.timestamp).toLocaleString()}`
      item.append(message, details)
      list.append(item)
    }
    history.append(list)
  }
  content.append(history)
}

export const renderSourceControlError = (container: HTMLElement, error: unknown, onRefresh: () => void) => {
  container.replaceChildren()
  const content = document.createElement('div')
  content.className = 'source-control-content'
  const message = document.createElement('p')
  message.className = 'ui-error-text'
  message.textContent = error instanceof Error ? error.message : 'Could not load the change journal.'
  content.append(message)
  container.append(createSourceControlHeader(undefined, onRefresh), content)
}
