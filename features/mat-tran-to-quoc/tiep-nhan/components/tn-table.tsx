import React, { memo, useCallback, useState } from 'react';
import { Edit, HandCoins, Printer, Trash2 } from 'lucide-react';
import { txt } from '@/lib/text';
import { useCan } from '@/hooks/use-can';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { ColumnHeaderSortMenu } from '@/components/shared/column-header';
import { DataTableRowActions, TableRowIconButton, type RowOverflowMenuItem } from '@/components/shared/row-actions';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { TiepNhan } from '../core/types';
import { tnHinhThucBadge, tnTrangThaiBadge } from '../core/display-badges';
import { useTiepNhanStore } from '../store/useTiepNhanStore';
import { getTnColumnDisplayValue } from '../utils/column-display';

/** Cột RPC sắp xếp được — các cột khác chỉ hiển thị (không sort ở client trên dữ liệu phân trang). */
const SORTABLE = new Set(['so_phieu', 'ngay_tiep_nhan', 'ten_nha_tai_tro', 'ten_chuong_trinh', 'so_tien', 'tong_gia_tri', 'trang_thai', 'tg_cap_nhat']);
const MONEY = new Set(['so_tien', 'gia_tri_phieu_kho', 'tong_gia_tri']);

interface Props {
  data: TiepNhan[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (item: TiepNhan) => void;
  onDelete: (id: string) => void;
  onPrint: (item: TiepNhan) => void;
  onView: (item: TiepNhan) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  serverTotalRecords: number;
  serverHasNextPage: boolean;
}

function RowActions({
  item,
  menuOpenId,
  onMenuOpenChange,
  onEdit,
  onDelete,
  onPrint,
  compact = false,
}: {
  item: TiepNhan;
  menuOpenId: string | null;
  onMenuOpenChange: (id: string | null) => void;
  onEdit: (item: TiepNhan) => void;
  onDelete: (id: string) => void;
  onPrint: (item: TiepNhan) => void;
  compact?: boolean;
}) {
  const canEdit = useCan('edit', 'matTranTiepNhan');
  const canDelete = useCan('delete', 'matTranTiepNhan');
  const close = () => onMenuOpenChange(null);
  const overflowItems: RowOverflowMenuItem[] = [
    {
      key: 'print',
      label: txt('matTranTiepNhan.detail.actionPrint'),
      icon: <Printer size={14} />,
      onClick: () => {
        onPrint(item);
        close();
      },
    },
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
        ) : undefined
      }
      overflowItems={overflowItems}
      overflowTriggerLabel={txt('common.moreRowActions')}
    />
  );
}

const TnTable = memo(function TnTable({
  data,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  onPrint,
  onView,
  emptyTitle,
  emptyDescription,
  serverTotalRecords,
  serverHasNextPage,
}: Props) {
  const { columns, pagination, setPage, setPageSize, selectedIds, toggleSelection, toggleAllSelection, sort, setSort, resizeColumn } =
    useTiepNhanStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) =>
      SORTABLE.has(col.id) ? (
        <ColumnHeaderSortMenu ariaLabel={col.label} sortColumnId={col.id} sort={sort} setSort={setSort} />
      ) : null,
    [sort, setSort],
  );

  const renderCell = useCallback(
    (colId: string, item: TiepNhan) => {
      const empty = txt('common.emptyCell');
      switch (colId) {
        case 'so_phieu':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <HandCoins size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-sm tabular-nums">{item.so_phieu}</span>
            </div>
          );
        case 'hinh_thuc':
          return item.hinh_thuc ? (
            <EnumBadge value={item.hinh_thuc} config={tnHinhThucBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{empty}</span>
          );
        case 'trang_thai':
          return <EnumBadge value={item.trang_thai} config={tnTrangThaiBadge} shape="pill" truncate />;
        case 'actions':
          return (
            <RowActions
              item={item}
              menuOpenId={rowMenuOpenId}
              onMenuOpenChange={setRowMenuOpenId}
              onEdit={onEdit}
              onDelete={onDelete}
              onPrint={onPrint}
            />
          );
        default: {
          const v = getTnColumnDisplayValue(item, colId);
          const money = MONEY.has(colId);
          return (
            <span
              className={`block truncate text-body-sm ${money ? 'tabular-nums whitespace-nowrap' : ''} ${
                colId === 'tong_gia_tri' ? 'font-semibold text-foreground' : 'text-muted-foreground'
              }`}
              title={v || undefined}
            >
              {v || empty}
            </span>
          );
        }
      }
    },
    [onEdit, onDelete, onPrint, rowMenuOpenId],
  );

  const renderMobileCard = useCallback(
    (item: TiepNhan, isSelected: boolean) => (
      <div className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{item.ten_nha_tai_tro}</p>
            <p className="text-xs text-muted-foreground truncate">{item.ten_chuong_trinh}</p>
          </div>
          <EnumBadge value={item.trang_thai} config={tnTrangThaiBadge} shape="pill" truncate />
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="tabular-nums">{item.so_phieu}</span>
          <span className="tabular-nums">{getTnColumnDisplayValue(item, 'ngay_tiep_nhan')}</span>
          <span className="tabular-nums font-semibold text-foreground">{getTnColumnDisplayValue(item, 'tong_gia_tri')}</span>
        </div>
        <div className="flex justify-end">
          <RowActions
            item={item}
            menuOpenId={rowMenuOpenId}
            onMenuOpenChange={setRowMenuOpenId}
            onEdit={onEdit}
            onDelete={onDelete}
            onPrint={onPrint}
            compact
          />
        </div>
      </div>
    ),
    [onEdit, onDelete, onPrint, rowMenuOpenId],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      serverSidePagination
      serverTotalRecords={serverTotalRecords}
      serverHasNextPage={serverHasNextPage}
      selectedIds={selectedIds}
      onToggleSelection={toggleSelection}
      onToggleAll={toggleAllSelection}
      page={pagination.page}
      pageSize={pagination.pageSize}
      onPageChange={setPage}
      onPageSizeChange={setPageSize}
      sort={sort}
      onSort={setSort}
      renderCell={renderCell}
      renderMobileCard={renderMobileCard}
      onRowClick={onView}
      keyExtractor={(item) => item.id}
      onResizeColumn={resizeColumn}
      stickyLeftCount={2}
      listBreakpoint="sm"
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
    />
  );
});

export default TnTable;
