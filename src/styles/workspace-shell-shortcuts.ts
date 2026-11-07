export const workspaceShellShortcuts = {
  'workspace-shell': 'flex min-h-screen bg-canvas font-sans text-text-primary',
  'activity-bar': 'w-12 shrink-0 flex flex-col items-center gap-1 border-r border-chrome-activityHover bg-chrome-activity py-2',
  'activity-bar-spacer': 'flex-1',
  'activity-button': 'relative h-10 w-10 flex cursor-pointer items-center justify-center border-0 border-l-2 border-transparent bg-transparent text-text-faint hover:text-text-inverse aria-pressed:border-accent-300 aria-pressed:text-text-inverse',
  'activity-icon': 'h-5 w-5',
  'activity-badge': 'absolute bottom-1 right-1 min-w-4 rounded-full bg-accent-500 px-1 text-center text-caption leading-4 text-text-inverse',
  'workspace-sidebar': 'w-[var(--workbench-primary-sidebar-width)] min-w-[var(--workbench-sidebar-min-width)] max-w-[var(--workbench-sidebar-max-width)] overflow-auto border-r border-border-subtle bg-surface-subtle',
  'workspace-content': 'min-w-0 flex-1 bg-canvas p-8',
} as const
