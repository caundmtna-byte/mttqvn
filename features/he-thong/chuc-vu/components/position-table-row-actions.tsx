import React from 'react';
import { Edit, Power, Trash2 } from 'lucide-react';
import { txt } from '../../../../lib/text';
import {
  DataTableRowActions,
  TableRowIconButton,
  type RowOverflowMenuItem,
} from '../../../../components/shared/row-actions';
import type { Position } from '../core/types';

export interface PositionTableRowActionsProps {
  item: Position;
  menuOpenId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  onEdit: (item: Position) => void;
  onDelete: (id: string) => void;
  onStatusChange: (item: Position) => void;
  compact?: boolean;
}

export function PositionTableRowActions({
  item,
  menuOpenId,
  onMenuOpenChange,
  onEdit,
  onDelete,
  onStatusChange,
  compact = false,
}: PositionTableRowActionsProps) {
  const close = () => onMenuOpenChange(null);

  const toggleLabel =
    item.trang_thai === 'Đang hoạt động'
      ? txt('position.detail.deactivate')
      : txt('position.detail.activate');

  const overflowItems: RowOverflowMenuItem[] = [
    {
      key: 'toggle',
      label: toggleLabel,
      icon: <Power size={14} />,
      onClick: () => {
        onStatusChange(item);
        close();
      },
    },
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
