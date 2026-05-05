import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { txt } from '../../../../lib/text';
import {
  DataTableRowActions,
  TableRowIconButton,
  type RowOverflowMenuItem,
} from '../../../../components/shared/row-actions';
import type { PositionPermission } from '../core/types';

export interface RoleTableRowActionsProps {
  item: PositionPermission;
  menuOpenId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  onEdit: (item: PositionPermission) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export function RoleTableRowActions({
  item,
  menuOpenId,
  onMenuOpenChange,
  onEdit,
  onDelete,
  compact = false,
}: RoleTableRowActionsProps) {
  const close = () => onMenuOpenChange(null);

  const overflowItems: RowOverflowMenuItem[] = [
    {
      key: 'delete',
      label: txt('common.delete'),
      icon: <Trash2 size={14} />,
      variant: 'destructive',
      onClick: () => {
        onDelete(item.id);
        close();
      },
    },
  ];

  return (
    <DataTableRowActions
      rowId={item.id}
      compact={compact}
      menuOpenId={menuOpenId}
      onMenuOpenChange={onMenuOpenChange}
      primary={
        <TableRowIconButton
          icon={Edit}
          label={txt('common.edit')}
          size={compact ? 'compact' : 'default'}
          variant="primary"
          onClick={() => onEdit(item)}
        />
      }
      overflowItems={overflowItems}
      overflowTriggerLabel={txt('common.moreRowActions')}
    />
  );
}
