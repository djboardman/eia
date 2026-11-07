const sidebarWidthStorageKey = 'eia.workbench.primarySidebarWidth'

const cssLengthToPixels = (value: string) => {
  const numericValue = Number.parseFloat(value)
  if (!Number.isFinite(numericValue)) return 0
  return value.trim().endsWith('rem')
    ? numericValue * Number.parseFloat(getComputedStyle(document.documentElement).fontSize)
    : numericValue
}

export const createSidebarResizer = (
  sidebar: HTMLElement,
  resizer: HTMLElement,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
) => {
  const rootStyles = getComputedStyle(document.documentElement)
  const minimumWidth = cssLengthToPixels(rootStyles.getPropertyValue('--workbench-sidebar-min-width'))
  const maximumWidth = cssLengthToPixels(rootStyles.getPropertyValue('--workbench-sidebar-max-width'))
  const defaultWidth = cssLengthToPixels(rootStyles.getPropertyValue('--workbench-primary-sidebar-width'))
  const clampWidth = (width: number) => Math.min(maximumWidth, Math.max(minimumWidth, width))

  const setWidth = (width: number) => {
    const nextWidth = Math.round(clampWidth(width))
    sidebar.style.width = `${nextWidth}px`
    resizer.setAttribute('aria-valuenow', String(nextWidth))
    return nextWidth
  }

  const storedWidth = Number.parseFloat(storage.getItem(sidebarWidthStorageKey) ?? '')
  setWidth(Number.isFinite(storedWidth) ? storedWidth : defaultWidth)
  resizer.setAttribute('role', 'separator')
  resizer.setAttribute('aria-label', 'Resize primary sidebar')
  resizer.setAttribute('aria-orientation', 'vertical')
  resizer.setAttribute('aria-valuemin', String(Math.round(minimumWidth)))
  resizer.setAttribute('aria-valuemax', String(Math.round(maximumWidth)))
  resizer.tabIndex = 0

  let startX = 0
  let startWidth = 0

  const finishDragging = (event: PointerEvent) => {
    if (!resizer.hasPointerCapture(event.pointerId)) return
    resizer.releasePointerCapture(event.pointerId)
    resizer.dataset.dragging = 'false'
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
    storage.setItem(sidebarWidthStorageKey, String(Math.round(sidebar.getBoundingClientRect().width)))
  }

  resizer.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return
    startX = event.clientX
    startWidth = sidebar.getBoundingClientRect().width
    resizer.setPointerCapture(event.pointerId)
    resizer.dataset.dragging = 'true'
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  })
  resizer.addEventListener('pointermove', (event) => {
    if (!resizer.hasPointerCapture(event.pointerId)) return
    setWidth(startWidth + event.clientX - startX)
  })
  resizer.addEventListener('pointerup', finishDragging)
  resizer.addEventListener('pointercancel', finishDragging)
  resizer.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowLeft' ? -1 : 1
    const step = event.shiftKey ? 32 : 8
    const nextWidth = setWidth(sidebar.getBoundingClientRect().width + direction * step)
    storage.setItem(sidebarWidthStorageKey, String(nextWidth))
  })
}
