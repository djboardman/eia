import '@fontsource-variable/ibm-plex-sans'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/600.css'
import 'virtual:uno.css'
import './style.css'
import { loadWorkspace, saveWorkspace } from './persistence/browser-storage'
import { appendChangeJournal, loadChangeJournal } from './persistence/change-journal'
import { loadOrCreateLocalRepository } from './persistence/local-repository'
import { initializeRepositoryCatalog } from './persistence/repository-catalog'
import { createWorkspaceDispatcher } from './state/dispatcher'
import { createNavigation } from './ui/navigation'
import { createRecordTypePage } from './ui/pages/record-type-page'
import { renderRecordTypesPage } from './ui/pages/record-types-page'
import { createStringSubtypePage } from './ui/pages/string-subtype-page'
import { createRouter } from './ui/router'
import { createSidebarSwitcher } from './ui/sidebar-switcher'

const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('App element not found')

app.innerHTML = `
  <div class="workspace-shell">
    <aside class="activity-bar" aria-label="Primary sidebar views"></aside>
    <aside class="workspace-sidebar">
      <nav class="workspace-nav explorer-view" aria-label="Workspace navigation"></nav>
      <section class="source-control-view" aria-label="Source control" hidden></section>
    </aside>
    <main class="workspace-content"></main>
  </div>
`

const content = app.querySelector<HTMLElement>('.workspace-content')
const navigation = app.querySelector<HTMLElement>('.workspace-nav')
const activityBar = app.querySelector<HTMLElement>('.activity-bar')
const sourceControl = app.querySelector<HTMLElement>('.source-control-view')
if (!content || !navigation || !activityBar || !sourceControl) throw new Error('Workspace element not found')

const workspace = loadWorkspace()
const journal = loadChangeJournal()
const repository = loadOrCreateLocalRepository(workspace, journal)
initializeRepositoryCatalog(repository)
let render: () => void = () => undefined
const dispatch = createWorkspaceDispatcher(workspace, {
  appendChange: appendChangeJournal,
  persist: saveWorkspace,
  render: () => render(),
})

const renderNavigation = createNavigation({ workspace, navigation, dispatch, render: () => render() })
const renderStringSubtype = createStringSubtypePage({ workspace, content, navigation, dispatch })
const renderRecordType = createRecordTypePage({ workspace, content, dispatch, render: () => render() })
const sidebar = createSidebarSwitcher(activityBar, navigation, sourceControl, workspace)

const renderRoute = createRouter({
  content,
  renderNavigation,
  renderRecordTypes: () => renderRecordTypesPage(content, workspace),
  renderStringSubtype,
  renderRecordType,
})
render = () => {
  renderRoute()
  sidebar.refresh()
}

window.addEventListener('hashchange', render)
render()
