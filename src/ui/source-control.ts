import type { ChangeJournalEntry } from '../domain/change-journal'
import type { Workspace } from '../domain/workspace'
import type { LocalRepository } from '../domain/local-repository'
import type { RepositoryCatalog } from '../domain/repository-catalog'
import type { ForkPullPreview } from '../persistence/repository-sync'
import { describeJournalEntries, groupJournalEntries } from '../state/commands/presentation'
import { CommandRegistry } from './command-registry'
import { createSidebarViewHeader } from './sidebar-view-header'

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
    forkButton.setAttribute('aria-expanded', 'false')
    const forkForm = document.createElement('form')
    forkForm.className = 'source-fork-form'
    forkForm.hidden = true
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
      forkButton.setAttribute('aria-expanded', 'true')
      forkForm.hidden = false
      forkName.focus()
      forkName.select()
    })
    cancelFork.addEventListener('click', () => {
      forkForm.hidden = true
      forkButton.hidden = false
      forkButton.setAttribute('aria-expanded', 'false')
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
