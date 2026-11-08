import { defineConfig, presetWind3 } from 'unocss'
import { contractShortcuts } from './src/styles/contract-shortcuts'
import { dataTypeShortcuts } from './src/styles/data-type-shortcuts'
import { editorPrimitivesShortcuts } from './src/styles/editor-primitives-shortcuts'
import { explorerShortcuts } from './src/styles/explorer-shortcuts'
import { pipelineShortcuts } from './src/styles/pipeline-shortcuts'
import { recordTypeShortcuts } from './src/styles/record-type-shortcuts'
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
    ...editorPrimitivesShortcuts,
    ...recordTypeShortcuts,
    ...dataTypeShortcuts,
    ...contractShortcuts,
    ...pipelineShortcuts,
  },
})
