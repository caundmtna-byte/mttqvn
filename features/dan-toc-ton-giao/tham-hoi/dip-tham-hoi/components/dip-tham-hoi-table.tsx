import React, { useState, useCallback, memo } from 'react';
import { CalendarRange } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { DipThamHoi } from '../core/types';
import { useDipThamHoiStore } from '../store/useDipThamHoiStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import { trangThaiDipThamHoiBadge } from '../core/display-badges';
import { formatDonViToChucDisplay } from '../core/display-don-vi';
import { DipThamHoiTableRowActions } from './dip-tham-hoi-table-row-actions';

interface Props {
  data: DipThamHoi[];
  isLoading: boolean;
  onEdit: (item: DipThamHoi) => void;
  onDelete: (id: string) => void;
  onView?: (item: DipThamHoi) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const DipThamHoiTable = memo(function DipThamHoiTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onView,
  emptyTitle,
  emptyDescription,
}: Props) {
  const {
    columns,
    pagination,
    setPage,
    setPageSize,
    selectedIds,
    toggleSelection,
    toggleAllSelection,
    sort,
    setSort,
    resizeColumn,
    filters,
    setFilter,
  } = useDipThamHoiStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
      const columnSearchEl = (
        <ColumnHeaderSearch
          variant="inDropdown"
          value={cs[col.id] ?? ''}
          onChange={(v) =>
            setFilter('columnSearch', {
              ...cs,
              [col.id]: v,
            })
          }
          ariaLabel={`${col.label} — ${txt('common.search')}`}
        />
      );

      if (col.id === 'actions') return null;
      return (
        <ColumnHeaderSortMenu
          ariaLabel={col.label}
          sortColumnId={col.id}
          sort={sort}
          setSort={setSort}
          columnSearch={columnSearchEl}
          columnSearchActive={Boolean(cs[col.id]?.trim())}
        />
      );
    },
    [filters.columnSearch, setFilter, setSort, sort],
  );

  const renderCell = useCallback(
    (colId: string, item: DipThamHoi) => {
      switch (colId) {
        case 'ten_dip':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <CalendarRange size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">
                {item.ten_dip}
              </span>
            </div>
          );
        case 'thoi_gian_du_kien':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.thoi_gian_du_kien ?? undefined}>
              {item.thoi_gian_du_kien ?? txt('common.emptyCell')}
            </span>
          );
        case 'thoi_gian_thuc_te':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.thoi_gian_thuc_te ?? undefined}>
              {item.thoi_gian_thuc_te ?? txt('common.emptyCell')}
            </span>
          );
        case 'so_luong_du_kien_tong':
          return (
            <span className="text-body-sm font-medium tabular-nums">{item.so_luong_du_kien_tong}</span>
          );
        case 'so_luong_to_chuc_du_kien':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">{item.so_luong_to_chuc_du_kien}</span>
          );
        case 'so_luong_ca_nhan_du_kien':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">{item.so_luong_ca_nhan_du_kien}</span>
          );
        case 'so_luong_thuc_te_tong':
          return (
            <span className="text-body-sm font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
              {item.so_luong_thuc_te_tong}
            </span>
          );
        case 'don_vi_to_chuc': {
          const label = formatDonViToChucDisplay(item);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label}>
              {label}
            </span>
          );
        }
        case 'phong_ban_tham_muu':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_phong_ban ?? undefined}>
              {item.ten_phong_ban ?? txt('common.emptyCell')}
            </span>
          );
        case 'trang_thai':
          return item.trang_thai?.trim() ? (
            <EnumBadge value={item.trang_thai.trim()} config={trangThaiDipThamHoiBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'tg_cap_nhat':
          return (
            <span className="text-body-sm text-muted-foreground whitespace-nowrap">
              {formatDateTimeShort(item.tg_cap_nhat)}
            </span>
          );
        case 'actions':
          return (
            <DipThamHoiTableRowActions
              item={item}
              menuOpenId={rowMenuOpenId}
              onMenuOpenChange={setRowMenuOpenId}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          );
        default:
          return null;
      }
    },
    [onDelete, onEdit, rowMenuOpenId],
  );

  const handleRowClick = useCallback(
    (item: DipThamHoi) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: DipThamHoi, isSelected: boolean) => (
      <div
        className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
      >
        <div className="font-semibold text-sm">{item.ten_dip}</div>
        <div className="text-xs text-muted-foreground">
          {txt('danTocDipThamHoi.store.soDuKienTongCol')}: {item.so_luong_du_kien_tong} ·{' '}
          {txt('danTocDipThamHoi.store.soThucTeTongCol')}: {item.so_luong_thuc_te_tong}
        </div>
        {item.trang_thai?.trim() ? (
          <EnumBadge value={item.trang_thai.trim()} config={trangThaiDipThamHoiBadge} shape="pill" truncate />
        ) : null}
        <div className="flex justify-end">
          <DipThamHoiTableRowActions
            item={item}
            menuOpenId={rowMenuOpenId}
            onMenuOpenChange={setRowMenuOpenId}
            onEdit={onEdit}
            onDelete={onDelete}
            compact
          />
        </div>
      </div>
    ),
    [onDelete, onEdit, rowMenuOpenId],
  );

  return (
    <GenericTable<DipThamHoi>
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('danTocDipThamHoi.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('danTocDipThamHoi.emptyHint')}
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
      onRowClick={handleRowClick}
      keyExtractor={(item) => item.id}
      onResizeColumn={resizeColumn}
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
    />
  );
});

export default DipThamHoiTable;
