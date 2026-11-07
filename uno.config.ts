import { defineConfig, presetWind3 } from 'unocss'
import { editorShortcuts } from './src/styles/editor-shortcuts'
import { explorerShortcuts } from './src/styles/explorer-shortcuts'
import { sourceControlShortcuts } from './src/styles/source-control-shortcuts'
import { workbenchShortcuts } from './src/styles/workbench-shortcuts'
import { workbenchTheme } from './src/styles/workbench-theme'
import { workspaceShellShortcuts } from './src/styles/workspace-shell-shortcuts'

export default defineConfig({
  content: {
    pipeline: {
      include: [
        /\.(vue|svelte|[jt]sx|vine\.ts|mdx?|astro|elm|php|phtml|marko|html)($|\?)/,
        'src/**/*.{js,ts}',
      ],
    },
  },
  presets: [presetWind3()],
  theme: workbenchTheme,
  shortcuts: {
    ...workspaceShellShortcuts,
    ...workbenchShortcuts,
    ...explorerShortcuts,
    ...sourceControlShortcuts,
    ...editorShortcuts,
  },
})
