import React, { useState, useCallback, useMemo, memo } from 'react';
import { Warehouse } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { KhoDanhSachKhoListRow } from '../core/types';
import { useKhoDanhSachKhoStore } from '../store/useKhoDanhSachKhoStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import { KhoDanhSachKhoTableRowActions } from './kho-danh-sach-kho-table-row-actions';

interface Props {
  data: KhoDanhSachKhoListRow[];
  isLoading: boolean;
  onEdit: (item: KhoDanhSachKhoListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: KhoDanhSachKhoListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const KhoDanhSachKhoTable = memo(function KhoDanhSachKhoTable({
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
  } = useKhoDanhSachKhoStore();
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
    (colId: string, item: KhoDanhSachKhoListRow) => {
      switch (colId) {
        case 'tt':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap" title={String(item.tt)}>
              {item.tt}
            </span>
          );
        case 'ten_kho':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Warehouse size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.ten_kho}</span>
            </div>
          );
        case 'ten_don_vi':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_don_vi ?? undefined}>
              {item.ten_don_vi ?? txt('common.emptyCell')}
            </span>
          );
        case 'ten_tinh':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_tinh ?? undefined}>
              {item.ten_tinh ?? txt('common.emptyCell')}
            </span>
          );
        case 'mo_ta':
          return (
            <span className="text-body-sm text-muted-foreground truncate max-w-[min(360px,50vw)]" title={item.mo_ta ?? undefined}>
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
            <KhoDanhSachKhoTableRowActions
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
    (item: KhoDanhSachKhoListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: KhoDanhSachKhoListRow, isSelected: boolean) => (
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
            <Warehouse size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ten_kho}</h4>
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
              {[item.ten_don_vi, item.ten_tinh].filter(Boolean).join(' · ') || txt('common.emptyCell')}
            </p>
            {item.mo_ta ? (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 m-0">{item.mo_ta}</p>
            ) : null}
            <div className="flex justify-end pt-2 border-t border-border">
              <KhoDanhSachKhoTableRowActions
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
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('matTranKhoDanhSach.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('matTranKhoDanhSach.emptyHint')}
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

export default KhoDanhSachKhoTable;
