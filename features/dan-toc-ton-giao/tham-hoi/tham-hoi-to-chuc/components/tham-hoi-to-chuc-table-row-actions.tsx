import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import {
  DataTableRowActions,
  TableRowIconButton,
  type RowOverflowMenuItem,
} from '@/components/shared/row-actions';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { ThamHoiToChuc } from '../core/types';

export interface ThamHoiToChucTableRowActionsProps {
  item: ThamHoiToChuc;
  menuOpenId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  onEdit: (item: ThamHoiToChuc) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export function ThamHoiToChucTableRowActions({
  item,
  menuOpenId,
  onMenuOpenChange,
  onEdit,
  onDelete,
  compact = false,
}: ThamHoiToChucTableRowActionsProps) {
  const { canEdit, canDelete } = useResourcePermissions('danTocThamHoiToChuc');
  const close = () => onMenuOpenChange(null);

  const overflowItems: RowOverflowMenuItem[] = canDelete
    ? [
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
      ]
    : [];

  return (
    <DataTableRowActions
      rowId={item.id}
      compact={compact}
      menuOpenId={menuOpenId}
      onMenuOpenChange={onMenuOpenChange}
      primary={
        canEdit ? (
          <TableRowIconButton
            icon={Edit}
            label={txt('common.edit')}
            size={compact ? 'compact' : 'default'}
            variant="primary"
            onClick={() => onEdit(item)}
          />
        ) : null
      }
      overflowItems={overflowItems}
      overflowTriggerLabel={txt('common.moreRowActions')}
    />
  );
}
