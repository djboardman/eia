import { Files, GitBranch } from 'lucide'
import type { Workspace } from '../domain/workspace'
import { loadChangeJournal } from '../persistence/change-journal'
import {
  commitLocalChanges,
  getPendingChanges,
  loadOrCreateLocalRepository,
} from '../persistence/local-repository'
import { createFork, loadRepositoryCatalog, switchRepository } from '../persistence/repository-catalog'
import { previewForkPull, pullFromSource } from '../persistence/repository-sync'
import { createLucideIcon } from './icons'
import { renderSourceControl, renderSourceControlError } from './source-control'
import { browserFeedback } from './feedback'

type SidebarView = 'explorer' | 'source-control'
const sidebarViewStorageKey = 'eia-sidebar-view'

export const createSidebarSwitcher = (
  activityBar: HTMLElement,
  explorer: HTMLElement,
  sourceControl: HTMLElement,
  workspace: Workspace,
) => {
  let activeView: SidebarView = localStorage.getItem(sidebarViewStorageKey) === 'source-control'
    ? 'source-control'
    : 'explorer'

  const createButton = (view: SidebarView, label: string, icon: typeof Files) => {
    const button = document.createElement('button')
    button.className = 'activity-button'
    button.type = 'button'
    button.title = label
    button.setAttribute('aria-label', label)
    button.append(createLucideIcon(icon, 'activity-icon'))
    button.addEventListener('click', () => {
      activeView = view
      localStorage.setItem(sidebarViewStorageKey, view)
      refresh()
    })
    activityBar.append(button)
    return button
  }

  const explorerButton = createButton('explorer', 'Explorer', Files)
  const sourceControlButton = createButton('source-control', 'Source Control', GitBranch)
  const badge = document.createElement('span')
  badge.className = 'activity-badge'
  sourceControlButton.append(badge)

  const refresh = () => {
    explorer.hidden = activeView !== 'explorer'
    sourceControl.hidden = activeView !== 'source-control'
    explorerButton.setAttribute('aria-pressed', String(activeView === 'explorer'))
    sourceControlButton.setAttribute('aria-pressed', String(activeView === 'source-control'))
    try {
      const entries = loadChangeJournal()
      const repository = loadOrCreateLocalRepository(workspace, entries)
      const catalog = loadRepositoryCatalog()
      if (!catalog) throw new Error('Repository catalog has not been initialized.')
      const pending = getPendingChanges(repository, entries)
      const pullPreview = repository.type === 'fork' ? previewForkPull(repository, entries) : undefined
      badge.textContent = pending.length ? String(pending.length) : ''
      badge.hidden = pending.length === 0
      if (activeView === 'source-control') {
        renderSourceControl({
          container: sourceControl,
          entries: pending,
          workspace,
          repository,
          catalog,
          pullPreview,
          onCommit: (message) => {
            try {
              commitLocalChanges(workspace, message)
              refresh()
            } catch (error) {
              browserFeedback.error(error instanceof Error ? error.message : 'Could not create the local commit.')
            }
          },
          onSelectRepository: (repositoryId) => {
            switchRepository(repositoryId)
            window.location.reload()
          },
          onCreateFork: (name) => {
            try {
              createFork(repository, workspace, entries, name)
              window.location.reload()
            } catch (error) {
              browserFeedback.error(error instanceof Error ? error.message : 'Could not create the fork.')
            }
          },
          onPullFromSource: () => {
            try {
              pullFromSource(repository, workspace, entries)
              window.location.reload()
            } catch (error) {
              browserFeedback.error(error instanceof Error ? error.message : 'Could not pull from Source.')
            }
          },
          onRefresh: refresh,
        })
      }
    } catch (error) {
      badge.textContent = '!'
      badge.hidden = false
      if (activeView === 'source-control') renderSourceControlError(sourceControl, error, refresh)
    }
  }

  refresh()
  return { refresh }
}
