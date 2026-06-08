import React from 'react';
import { Edit, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import {
  DataTableRowActions,
  TableRowIconButton,
  type RowOverflowMenuItem,
} from '@/components/shared/row-actions';
import type { ThucHienPhanBien } from '../core/types';
import { useCan } from '@/hooks/use-can';

export interface ThucHienPhanBienTableRowActionsProps {
  item: ThucHienPhanBien;
  menuOpenId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  onEdit: (item: ThucHienPhanBien) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export function ThucHienPhanBienTableRowActions({
  item,
  menuOpenId,
  onMenuOpenChange,
  onEdit,
  onDelete,
  compact = false,
}: ThucHienPhanBienTableRowActionsProps) {
  const close = () => onMenuOpenChange(null);
  const canEdit = useCan('edit', 'phanBienThucHien');
  const canDelete = useCan('delete', 'phanBienThucHien');

  const overflowItems: RowOverflowMenuItem[] = [
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
          },
        ]
      : []),
  ];

  const primary = canEdit ? (
    <TableRowIconButton
      icon={Edit}
      label={txt('common.edit')}
      size={compact ? 'compact' : 'default'}
      variant="primary"
      onClick={() => onEdit(item)}
    />
  ) : undefined;

  if (!primary && overflowItems.length === 0) {
    return (
      <div role="group" className="flex items-center justify-center" onPointerDown={(e) => e.stopPropagation()} />
    );
  }

  return (
    <DataTableRowActions
      rowId={item.id}
      compact={compact}
      menuOpenId={menuOpenId}
      onMenuOpenChange={onMenuOpenChange}
      primary={primary}
      overflowItems={overflowItems}
      overflowTriggerLabel={txt('common.moreRowActions')}
    />
  );
}
