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

export const createRecordTypeIcon = (_relationship: RecordTypeRelationship, action = false) => {
  const icon = document.createElement('span')
  icon.className = action ? 'tree-record-type-action-icon' : 'tree-record-type-icon'
  icon.append(
    createLucideIcon(FileDatabase, action ? 'tree-record-type-action-base-icon' : 'tree-record-type-base-icon'),
  )
  return icon
}
