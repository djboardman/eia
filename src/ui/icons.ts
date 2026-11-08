import {
  FileDatabase,
  FileMinus,
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
  relationship: RecordTypeRelationship,
  action = false,
  style: 'legacy' | 'explorer' | 'title' = 'legacy',
) => {
  const icon = document.createElement('span')
  const iconNode = relationship === 'child' ? FileMinus : FileDatabase
  if (style === 'title') {
    const titleIcon = createLucideIcon(iconNode, 'record-type-title-icon-svg')
    icon.className = 'record-type-title-icon'
    icon.append(titleIcon)
    return icon
  }
  if (style === 'explorer') {
    icon.className = 'explorer-tree-item-icon-record-type'
    icon.append(createLucideIcon(iconNode, 'h-full w-full'))
    return icon
  }
  icon.className = action ? 'tree-record-type-action-icon' : 'tree-record-type-icon'
  icon.append(
    createLucideIcon(iconNode, action ? 'tree-record-type-action-base-icon' : 'tree-record-type-base-icon'),
  )
  return icon
}
