import '@fontsource-variable/ibm-plex-sans'
import '@fontsource/ibm-plex-mono/400.css'
import 'virtual:uno.css'
import './style.css'
import './styles/theme-palettes.css'
import './styles/workbench.css'
import { loadWorkspace, saveWorkspace } from './persistence/browser-storage'
import { appendChangeJournal, loadChangeJournal } from './persistence/change-journal'
import { loadOrCreateLocalRepository } from './persistence/local-repository'
import { initializeRepositoryCatalog } from './persistence/repository-catalog'
import { createWorkspaceDispatcher } from './state/dispatcher'
import { createNavigation } from './ui/navigation'
import { createRecordTypePage } from './ui/pages/record-type-page'
import { renderRecordTypesPage } from './ui/pages/record-types-page'
import { createStringSubtypePage } from './ui/pages/string-subtype-page'
import { createWsdlApiPage } from './ui/pages/wsdl-api-page'
import { createPipelinePage } from './ui/pages/pipeline-page'
import { createRouter } from './ui/router'
import { createSidebarResizer } from './ui/sidebar-resizer'
import { createSidebarSwitcher } from './ui/sidebar-switcher'
import { createThemeSettings, initializeTheme } from './ui/theme-settings'

initializeTheme()

const app = document.querySelector<HTMLElement>('#app')
if (!app) throw new Error('App element not found')

app.innerHTML = `
  <div class="workspace-shell">
    <aside class="activity-bar" aria-label="Primary sidebar views"></aside>
    <aside class="workspace-sidebar">
      <nav class="explorer-sidebar-view" aria-label="Explorer"></nav>
      <section class="source-control-view" aria-label="Source control" hidden></section>
    </aside>
    <div class="wb-sidebar-resizer"></div>
    <main class="workspace-content"></main>
  </div>
`

const content = app.querySelector<HTMLElement>('.workspace-content')
const navigation = app.querySelector<HTMLElement>('.explorer-sidebar-view')
const activityBar = app.querySelector<HTMLElement>('.activity-bar')
const sourceControl = app.querySelector<HTMLElement>('.source-control-view')
const sidebarElement = app.querySelector<HTMLElement>('.workspace-sidebar')
const sidebarResizer = app.querySelector<HTMLElement>('.wb-sidebar-resizer')
if (!content || !navigation || !activityBar || !sourceControl || !sidebarElement || !sidebarResizer) {
  throw new Error('Workspace element not found')
}

createSidebarResizer(sidebarElement, sidebarResizer)

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
const renderWsdlApi = createWsdlApiPage({ workspace, content })
const renderPipeline = createPipelinePage({ workspace, content, dispatch })
const sidebar = createSidebarSwitcher(activityBar, navigation, sourceControl, workspace)
createThemeSettings(activityBar)

const renderRoute = createRouter({
  content,
  renderNavigation,
  renderRecordTypes: () => renderRecordTypesPage(content, workspace),
  renderStringSubtype,
  renderRecordType,
  renderWsdlApi,
  renderPipeline,
})
render = () => {
  renderRoute()
  sidebar.refresh()
}

window.addEventListener('hashchange', render)
render()
