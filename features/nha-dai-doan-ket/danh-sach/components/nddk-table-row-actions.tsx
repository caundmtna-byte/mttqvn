import React from 'react';
import { Edit, Printer, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import {
  DataTableRowActions,
  TableRowIconButton,
  type RowOverflowMenuItem,
} from '@/components/shared/row-actions';
import type { NhaDaiDoanKet } from '../core/types';
import { useCan } from '@/hooks/use-can';

export interface NddkTableRowActionsProps {
  item: NhaDaiDoanKet;
  menuOpenId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  onEdit: (item: NhaDaiDoanKet) => void;
  onDelete: (id: string) => void;
  /** Mở popup chọn biên bản in — chỉ cần quyền xem. */
  onPrint?: (item: NhaDaiDoanKet) => void;
  compact?: boolean;
}

export function NddkTableRowActions({
  item,
  menuOpenId,
  onMenuOpenChange,
  onEdit,
  onDelete,
  onPrint,
  compact = false,
}: NddkTableRowActionsProps) {
  const close = () => onMenuOpenChange(null);
  const canEdit = useCan('edit', 'nhaDaiDoanKetList');
  const canDelete = useCan('delete', 'nhaDaiDoanKetList');

  const overflowItems: RowOverflowMenuItem[] = [
    ...(onPrint
      ? [
          {
            key: 'print',
            label: txt('nhaDaiDoanKet.printPreview.actionPrint'),
            icon: <Printer size={14} />,
            onClick: () => {
              onPrint(item);
              close();
            },
          },
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
      <div
        role="group"
        className="flex items-center justify-center"
        onPointerDown={(e) => e.stopPropagation()}
      />
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
