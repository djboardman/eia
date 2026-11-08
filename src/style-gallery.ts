import '@fontsource-variable/ibm-plex-sans'
import '@fontsource/lilex/400.css'
import 'virtual:uno.css'
import './style.css'
import './styles/theme-palettes.css'
import './styles/workbench.css'
import './styles/record-type.css'
import './styles/contract.css'
import './styles/style-gallery.css'

const gallery = document.querySelector<HTMLElement>('#gallery')
if (!gallery) throw new Error('Gallery element not found')
gallery.className = 'style-gallery'

const preview = (theme: 'light' | 'dark' | 'dracula') => {
  const root = document.createElement('section')
  root.className = 'theme-preview'
  root.dataset.theme = theme
  root.innerHTML = `
    <h1 class="page-title">${theme[0].toUpperCase()}${theme.slice(1)} theme</h1>
    <div class="gallery-grid">
      <section class="editor-card gallery-section">
        <h2 class="editor-card-title">Controls</h2>
        <input class="ui-text-input" value="Text input" aria-label="Text input" />
        <select class="ui-select-control" aria-label="Select"><option>Combo box</option></select>
        <button class="ui-button-primary">Primary</button>
        <button class="ui-button-secondary">Secondary</button>
        <button class="ui-button-secondary" disabled>Disabled</button>
        <p class="ui-error-text">Error state</p>
      </section>
      <section class="editor-card gallery-section">
        <h2 class="editor-card-title">Tree and menu</h2>
        <div class="explorer-tree-item-row explorer-tree-item-selected">
          <span class="explorer-tree-item-label">Selected tree item</span>
          <span class="explorer-tree-item-actions"><button class="explorer-tree-action">+</button></span>
        </div>
        <div class="ui-menu-container">
          <div class="ui-menu static">
            <button class="ui-menu-item">Rename</button>
            <button class="ui-menu-item ui-menu-item-danger">Delete</button>
          </div>
        </div>
      </section>
      <section class="editor-card gallery-section">
        <h2 class="editor-card-title">Editor primitives</h2>
        <div class="editor-tabs"><button class="editor-tab" aria-selected="true">Record</button><button class="editor-tab">API</button></div>
        <span class="schema-attribute-name">attributeName</span>
        <span class="schema-type">string</span>
        <p class="editor-empty-state-centered">Empty state</p>
      </section>
      <section class="transform-mapping gallery-section">
        <div class="transform-mapping-header"><h2 class="transform-mapping-title">Transform mapping</h2></div>
        <div class="transform-mapping-paths"><select class="transform-mapping-path"><option>source</option></select><span>→</span><select class="transform-mapping-path"><option>target</option></select></div>
      </section>
    </div>`
  return root
}

gallery.append(preview('light'), preview('dark'), preview('dracula'))
