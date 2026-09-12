import React, { useState, useCallback, memo } from 'react';
import { Receipt } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import { formatCurrency, formatDate, formatDateTimeShort } from '@/lib/utils';
import { quyLoaiPhieuBadge } from '../../core/display-badges';
import type { QuySoThuChiListRow } from '../core/types';
import { useQuySoThuChiStore } from '../store/useQuySoThuChiStore';
import { QuySoThuChiTableRowActions } from './quy-so-thu-chi-table-row-actions';

interface Props {
  data: QuySoThuChiListRow[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (item: QuySoThuChiListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: QuySoThuChiListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  serverTotalRecords: number;
  serverHasNextPage: boolean;
}

/** Ô tìm theo cột nào được máy chủ hỗ trợ — khớp khối `p_column_search` của RPC. */
const COLUMN_SEARCH_SUPPORTED = new Set([
  'so_chung_tu',
  'ngay_chung_tu',
  'ten_khoan',
  'ten_tai_khoan',
  'so_tien',
  'noi_dung',
  'nguoi_nop_nhan',
  'ten_don_vi',
  'ho_va_ten_nguoi_tao',
  'ghi_chu',
]);

const QuySoThuChiTable = memo(function QuySoThuChiTable({
  data,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  onView,
  emptyTitle,
  emptyDescription,
  serverTotalRecords,
  serverHasNextPage,
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
  } = useQuySoThuChiStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      if (col.id === 'actions') return null;
      const cs = filters.columnSearch;
      return (
        <ColumnHeaderSortMenu
          ariaLabel={col.label}
          sortColumnId={col.id}
          sort={sort}
          setSort={setSort}
          columnSearch={
            COLUMN_SEARCH_SUPPORTED.has(col.id) ? (
              <ColumnHeaderSearch
                variant="inDropdown"
                value={cs[col.id] ?? ''}
                onChange={(v) => setFilter('columnSearch', { ...cs, [col.id]: v })}
                ariaLabel={`${col.label} — ${txt('common.search')}`}
              />
            ) : undefined
          }
          columnSearchActive={Boolean(cs[col.id]?.trim())}
        />
      );
    },
    [filters.columnSearch, setFilter, setSort, sort],
  );

  const renderCell = useCallback(
    (colId: string, item: QuySoThuChiListRow) => {
      switch (colId) {
        case 'so_chung_tu':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Receipt size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tabular-nums tracking-tight">
                {item.so_chung_tu}
              </span>
            </div>
          );
        case 'ngay_chung_tu':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground whitespace-nowrap">
              {item.ngay_chung_tu ? formatDate(item.ngay_chung_tu) : txt('common.emptyCell')}
            </span>
          );
        case 'loai':
          return <EnumBadge value={item.loai} config={quyLoaiPhieuBadge} truncate />;
        case 'ten_khoan':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_khoan ?? undefined}>
              {item.ten_khoan ?? txt('common.emptyCell')}
            </span>
          );
        case 'so_tien':
          return (
            <span
              className={`text-body-sm font-semibold tabular-nums whitespace-nowrap ${
                item.loai === 'thu'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {item.loai === 'chi' ? '− ' : '+ '}
              {formatCurrency(item.so_tien)}
            </span>
          );
        case 'noi_dung':
          return (
            <span
              className="text-body-sm text-foreground truncate max-w-[min(420px,50vw)]"
              title={item.noi_dung}
            >
              {item.noi_dung}
            </span>
          );
        case 'ten_tai_khoan':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate"
              title={item.ten_tai_khoan ?? undefined}
            >
              {item.ten_tai_khoan ?? txt('common.emptyCell')}
            </span>
          );
        case 'nguoi_nop_nhan':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate"
              title={item.nguoi_nop_nhan ?? undefined}
            >
              {item.nguoi_nop_nhan ?? txt('common.emptyCell')}
            </span>
          );
        case 'ten_don_vi':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate"
              title={item.ten_don_vi ?? undefined}
            >
              {item.ten_don_vi ?? txt('common.emptyCell')}
            </span>
          );
        case 'ghi_chu':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate max-w-[min(360px,50vw)]"
              title={item.ghi_chu ?? undefined}
            >
              {item.ghi_chu ?? txt('common.emptyCell')}
            </span>
          );
        case 'ho_va_ten_nguoi_tao':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate"
              title={item.ho_va_ten_nguoi_tao ?? undefined}
            >
              {item.ho_va_ten_nguoi_tao ?? txt('common.emptyCell')}
            </span>
          );
        case 'tg_cap_nhat':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_cap_nhat ? formatDateTimeShort(item.tg_cap_nhat) : txt('common.emptyCell')}
            </span>
          );
        case 'actions':
          return (
            <QuySoThuChiTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId],
  );

  const handleRowClick = useCallback(
    (item: QuySoThuChiListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: QuySoThuChiListRow, isSelected: boolean) => (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          handleRowClick(item);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            handleRowClick(item);
          }
        }}
        className={`bg-card rounded-xl border p-4 shadow-sm transition-all ${
          isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-border'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Receipt size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1 gap-2">
              <h4 className="font-semibold text-foreground truncate m-0 tabular-nums">
                {item.so_chung_tu}
              </h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground m-0">
              {item.ngay_chung_tu ? formatDate(item.ngay_chung_tu) : ''}
              {item.ten_khoan ? ` · ${item.ten_khoan}` : ''}
            </p>
            <p className="text-sm text-foreground mt-1 m-0 line-clamp-2">{item.noi_dung}</p>
            <p
              className={`text-base font-semibold tabular-nums mt-1 m-0 ${
                item.loai === 'thu'
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {item.loai === 'chi' ? '− ' : '+ '}
              {formatCurrency(item.so_tien)}
            </p>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-border gap-2">
              <EnumBadge value={item.loai} config={quyLoaiPhieuBadge} truncate />
              <QuySoThuChiTableRowActions
                compact
                item={item}
                menuOpenId={rowMenuOpenId}
                onMenuOpenChange={setRowMenuOpenId}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            </div>
          </div>
        </div>
      </div>
    ),
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('quy.soThuChi.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('quy.soThuChi.emptyHint')}
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
      stickyLeftCount={2}
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
      serverSidePagination
      serverTotalRecords={serverTotalRecords}
      serverHasNextPage={serverHasNextPage}
    />
  );
});

export default QuySoThuChiTable;
