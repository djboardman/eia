import {
  FileDatabase,
  createElement as createIcon,
  type IconNode,
} from 'lucide'

export const createLucideIcon = (iconNode: IconNode, className: string) =>
  createIcon(iconNode, {
    'aria-hidden': 'true',
    class: className,
    height: 16,
    width: 16,
    'stroke-width': 1.75,
  })

export type RecordTypeRelationship = 'root' | 'child' | 'subtype'

export const createRecordTypeIcon = (
  _relationship: RecordTypeRelationship,
  action = false,
  style: 'legacy' | 'explorer' | 'title' = 'legacy',
) => {
  const icon = document.createElement('span')
  if (style === 'title') {
    const titleIcon = createLucideIcon(FileDatabase, 'record-type-title-icon-svg')
    titleIcon.setAttribute('height', '30')
    titleIcon.setAttribute('width', '30')
    titleIcon.setAttribute('style', 'height: 1.875rem; width: 1.875rem; color: var(--color-entity-record-type)')
    icon.className = 'record-type-title-icon'
    icon.append(titleIcon)
    return icon
  }
  if (style === 'explorer') {
    icon.className = 'explorer-tree-item-icon-record-type'
    icon.append(createLucideIcon(FileDatabase, 'h-full w-full'))
    return icon
  }
  icon.className = action ? 'tree-record-type-action-icon' : 'tree-record-type-icon'
  icon.append(
    createLucideIcon(FileDatabase, action ? 'tree-record-type-action-base-icon' : 'tree-record-type-base-icon'),
  )
  return icon
}
