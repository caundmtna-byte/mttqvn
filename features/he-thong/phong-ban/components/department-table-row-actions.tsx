import React from 'react';
import { Edit, Power, Trash2 } from 'lucide-react';
import { txt } from '../../../../lib/text';
import {
  DataTableRowActions,
  TableRowIconButton,
  type RowOverflowMenuItem,
} from '../../../../components/shared/row-actions';
import type { Department } from '../core/types';

export interface DepartmentTableRowActionsProps {
  item: Department;
  menuOpenId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  onEdit: (item: Department) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (item: Department) => void;
  canEdit: boolean;
  canDelete: boolean;
  compact?: boolean;
}

export function DepartmentTableRowActions({
  item,
  menuOpenId,
  onMenuOpenChange,
  onEdit,
  onDelete,
  onStatusChange,
  canEdit,
  canDelete,
  compact = false,
}: DepartmentTableRowActionsProps) {
  const close = () => onMenuOpenChange(null);

  const toggleLabel =
    item.trang_thai === 'Đang hoạt động'
      ? txt('department.detail.deactivate')
      : txt('department.detail.activate');

  const overflowItems: RowOverflowMenuItem[] = [
    ...(onStatusChange && canEdit
      ? [
          {
            key: 'toggle',
            label: toggleLabel,
            icon: <Power size={14} />,
            onClick: () => {
              onStatusChange(item);
              close();
            },
          } satisfies RowOverflowMenuItem,
        ]
      : []),
    ...(canDelete
      ? [
          {
            key: 'delete',
            label: txt('common.delete'),
            icon: <Trash2 size={14} />,
            variant: 'destructive' as const,
            onClick: () => {
              onDelete(item.id);
              close();
            },
          } satisfies RowOverflowMenuItem,
        ]
      : []),
  ];

  const showPrimary = canEdit;
  const showOverflow = overflowItems.length > 0;

  if (!showPrimary && !showOverflow) return null;

  return (
    <DataTableRowActions
      rowId={item.id}
      compact={compact}
      menuOpenId={menuOpenId}
      onMenuOpenChange={onMenuOpenChange}
      primary={
        showPrimary ? (
          <TableRowIconButton
            icon={Edit}
            label={txt('common.edit')}
            size={compact ? 'compact' : 'default'}
            variant="primary"
            onClick={() => onEdit(item)}
          />
        ) : undefined
      }
      overflowItems={overflowItems}
      overflowTriggerLabel={txt('common.moreRowActions')}
    />
  );
}
