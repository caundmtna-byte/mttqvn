import React, { useState, useCallback, memo } from 'react';
import { Landmark, Wallet } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import { formatCurrency, formatDateTimeShort } from '@/lib/utils';
import { quyTrangThaiBadge } from '../../core/display-badges';
import type { QuyDanhMucTaiKhoanListRow } from '../core/types';
import { useQuyDanhMucTaiKhoanStore } from '../store/useQuyDanhMucTaiKhoanStore';
import { QuyDanhMucTaiKhoanTableRowActions } from './quy-danh-muc-tai-khoan-table-row-actions';

interface Props {
  data: QuyDanhMucTaiKhoanListRow[];
  /** Số dư từng tài khoản (`quy_so_du_view`) — khóa là `id` tài khoản. */
  soDuMap: Map<string, number>;
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (item: QuyDanhMucTaiKhoanListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: QuyDanhMucTaiKhoanListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const QuyDanhMucTaiKhoanTable = memo(function QuyDanhMucTaiKhoanTable({
  data,
  soDuMap,
  isLoading,
  isError,
  onRetry,
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
  } = useQuyDanhMucTaiKhoanStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      if (col.id === 'actions' || col.id === 'so_du') return null;
      const cs = filters.columnSearch;
      return (
        <ColumnHeaderSortMenu
          ariaLabel={col.label}
          sortColumnId={col.id}
          sort={sort}
          setSort={setSort}
          columnSearch={
            <ColumnHeaderSearch
              variant="inDropdown"
              value={cs[col.id] ?? ''}
              onChange={(v) => setFilter('columnSearch', { ...cs, [col.id]: v })}
              ariaLabel={`${col.label} — ${txt('common.search')}`}
            />
          }
          columnSearchActive={Boolean(cs[col.id]?.trim())}
        />
      );
    },
    [filters.columnSearch, setFilter, setSort, sort],
  );

  const renderCell = useCallback(
    (colId: string, item: QuyDanhMucTaiKhoanListRow) => {
      switch (colId) {
        case 'thu_tu':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.thu_tu}
            </span>
          );
        case 'ten':
          return (
            <div className="flex min-w-0 items-center gap-2">
              {item.so_tai_khoan?.trim() ? (
                <Landmark size={14} className="shrink-0 text-primary/70" aria-hidden />
              ) : (
                <Wallet size={14} className="shrink-0 text-primary/70" aria-hidden />
              )}
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">
                {item.ten}
              </span>
            </div>
          );
        case 'so_tai_khoan':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground truncate">
              {item.so_tai_khoan ?? txt('common.emptyCell')}
            </span>
          );
        case 'ngan_hang':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ngan_hang ?? undefined}>
              {item.ngan_hang ?? txt('common.emptyCell')}
            </span>
          );
        case 'so_du': {
          const soDu = soDuMap.get(item.id) ?? 0;
          return (
            <span
              className={`text-body-sm font-semibold tabular-nums whitespace-nowrap ${
                soDu < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
              }`}
            >
              {formatCurrency(soDu)}
            </span>
          );
        }
        case 'trang_thai':
          return <EnumBadge value={item.trang_thai} config={quyTrangThaiBadge} truncate />;
        case 'mo_ta':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate max-w-[min(360px,50vw)]"
              title={item.mo_ta ?? undefined}
            >
              {item.mo_ta ?? txt('common.emptyCell')}
            </span>
          );
        case 'tg_tao':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_tao ? formatDateTimeShort(item.tg_tao) : txt('common.emptyCell')}
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
            <QuyDanhMucTaiKhoanTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, soDuMap],
  );

  const handleRowClick = useCallback(
    (item: QuyDanhMucTaiKhoanListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: QuyDanhMucTaiKhoanListRow, isSelected: boolean) => (
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
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
            {item.so_tai_khoan?.trim() ? <Landmark size={20} /> : <Wallet size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1 gap-2">
              <h4 className="font-semibold text-foreground truncate m-0">{item.ten}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground m-0 truncate">
              {[item.so_tai_khoan, item.ngan_hang].filter(Boolean).join(' · ') ||
                txt('quy.danhMucTaiKhoan.filter.loaiNguonTienMat')}
            </p>
            <p className="text-sm font-semibold tabular-nums text-foreground mt-1 m-0">
              {formatCurrency(soDuMap.get(item.id) ?? 0)}
            </p>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
              <EnumBadge value={item.trang_thai} config={quyTrangThaiBadge} />
              <QuyDanhMucTaiKhoanTableRowActions
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
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection, soDuMap],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('quy.danhMucTaiKhoan.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('quy.danhMucTaiKhoan.emptyHint')}
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
    />
  );
});

export default QuyDanhMucTaiKhoanTable;
