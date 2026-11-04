import { describe, expect, it, vi } from 'vitest'
import { createEmptyWorkspace } from '../domain/workspace'
import type { WorkspaceCommand } from './commands'
import { createWorkspaceDispatcher } from './dispatcher'

describe('workspace dispatcher', () => {
  it('appends each successful command before persisting and rendering', () => {
    const workspace = createEmptyWorkspace()
    const calls: string[] = []
    const appendChange = vi.fn(() => calls.push('append'))
    const persist = vi.fn(() => calls.push('persist'))
    const render = vi.fn(() => calls.push('render'))
    const dispatch = createWorkspaceDispatcher(workspace, { appendChange, persist, render })
    const command: WorkspaceCommand = {
      type: 'category.create',
      definitionId: 'finance',
      name: 'Finance',
    }

    dispatch(command)

    expect(appendChange).toHaveBeenCalledWith(command)
    expect(calls).toEqual(['append', 'persist', 'render'])
  })

  it('does not journal a command that makes no change', () => {
    const workspace = createEmptyWorkspace()
    const appendChange = vi.fn()
    const persist = vi.fn()
    const render = vi.fn()
    const dispatch = createWorkspaceDispatcher(workspace, { appendChange, persist, render })

    dispatch({ type: 'category.delete', definitionId: 'missing' })

    expect(appendChange).not.toHaveBeenCalled()
    expect(persist).not.toHaveBeenCalled()
    expect(render).toHaveBeenCalledOnce()
  })
})
