import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import {
  DataTableRowActions,
  TableRowIconButton,
  type RowOverflowMenuItem,
} from '@/components/shared/row-actions';
import type { MttqKyHopListRow } from '../core/types';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';

export interface MttqKyHopTableRowActionsProps {
  item: MttqKyHopListRow;
  menuOpenId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  onEdit: (item: MttqKyHopListRow) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export function MttqKyHopTableRowActions({
  item,
  menuOpenId,
  onMenuOpenChange,
  onEdit,
  onDelete,
  compact = false,
}: MttqKyHopTableRowActionsProps) {
  const { canEdit, canDelete } = useResourcePermissions('matTranSession');
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
