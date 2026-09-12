import React, { useState, useCallback, memo } from 'react';
import { Tag } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import { formatDateTimeShort } from '@/lib/utils';
import { quyLoaiKhoanBadge, quyTrangThaiBadge } from '../../core/display-badges';
import type { QuyDanhMucKhoanListRow } from '../core/types';
import { useQuyDanhMucKhoanStore } from '../store/useQuyDanhMucKhoanStore';
import { QuyDanhMucKhoanTableRowActions } from './quy-danh-muc-khoan-table-row-actions';

interface Props {
  data: QuyDanhMucKhoanListRow[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (item: QuyDanhMucKhoanListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: QuyDanhMucKhoanListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const QuyDanhMucKhoanTable = memo(function QuyDanhMucKhoanTable({
  data,
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
  } = useQuyDanhMucKhoanStore();
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
    (colId: string, item: QuyDanhMucKhoanListRow) => {
      switch (colId) {
        case 'thu_tu':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.thu_tu}
            </span>
          );
        case 'loai':
          return <EnumBadge value={item.loai} config={quyLoaiKhoanBadge} truncate />;
        case 'ten':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Tag size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">
                {item.ten}
              </span>
            </div>
          );
        case 'mo_ta':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate max-w-[min(400px,50vw)]"
              title={item.mo_ta ?? undefined}
            >
              {item.mo_ta ?? txt('common.emptyCell')}
            </span>
          );
        case 'trang_thai':
          return <EnumBadge value={item.trang_thai} config={quyTrangThaiBadge} truncate />;
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
            <QuyDanhMucKhoanTableRowActions
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
    (item: QuyDanhMucKhoanListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: QuyDanhMucKhoanListRow, isSelected: boolean) => (
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
            <Tag size={20} />
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
            {item.mo_ta ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 m-0">{item.mo_ta}</p>
            ) : null}
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-border gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <EnumBadge value={item.loai} config={quyLoaiKhoanBadge} truncate />
                <EnumBadge value={item.trang_thai} config={quyTrangThaiBadge} truncate />
              </div>
              <QuyDanhMucKhoanTableRowActions
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
      emptyTitle={emptyTitle ?? txt('quy.danhMucKhoan.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('quy.danhMucKhoan.emptyHint')}
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

export default QuyDanhMucKhoanTable;
