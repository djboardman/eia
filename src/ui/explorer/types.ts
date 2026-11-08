import type { Workspace } from '../../domain/workspace'
import type { WorkspaceDispatcher } from '../../state/dispatcher'
import type { TreeMenuAction } from '../controls'

export interface NodeEditor {
  kind: 'category' | 'recordType' | 'dataType' | 'dataScope' | 'middleware' | 'pipeline'
  mode: 'create' | 'rename'
  id?: string
  parentId?: string
  parentKind?: 'category' | 'children' | 'subtypes'
  value?: string
}

export interface ExplorerFeatureContext {
  workspace: Workspace
  nodeEditor: NodeEditor | null
  hierarchyOpenState: Map<string, boolean>
  dispatch: WorkspaceDispatcher
  startEditing: (editor: NodeEditor) => void
  createInlineEditor: (label: string, value?: string, technical?: boolean) => HTMLInputElement
  createAddControl: (actions: TreeMenuAction[]) => HTMLElement
  createMoreControl: (actions: TreeMenuAction[]) => HTMLElement
}
