import React, { useCallback, memo, useState } from 'react';
import { Banknote } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { LuongThietLapBacRow } from '../core/types';
import type { LuongBacTableRow } from '../utils/bac-sort';
import { useLuongBacTableStore } from '../store/useLuongBacTableStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatCurrency } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import { LuongBacTableRowActions } from './luong-bac-table-row-actions';

interface Props {
  data: LuongBacTableRow[];
  isLoading: boolean;
  onView: (item: LuongThietLapBacRow) => void;
  onEdit: (item: LuongThietLapBacRow) => void;
  onDelete: (item: LuongThietLapBacRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const LuongBacTable = memo(function LuongBacTable({
  data,
  isLoading,
  onView,
  onEdit,
  onDelete,
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
  } = useLuongBacTableStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      if (col.id === 'actions') return null;
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
    (colId: string, item: LuongBacTableRow) => {
      switch (colId) {
        case 'ma_bac':
          return (
            <span className="text-sm font-medium tabular-nums text-foreground whitespace-nowrap" title={item.ma_bac}>
              {item.ma_bac}
            </span>
          );
        case 'thu_tu':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap" title={String(item.thu_tu)}>
              {item.thu_tu}
            </span>
          );
        case 'he_so':
          return (
            <span className="text-sm tabular-nums text-foreground whitespace-nowrap" title={item.he_so_display}>
              {item.he_so_display}
            </span>
          );
        case 'luong':
          return (
            <span className="text-sm tabular-nums text-foreground text-right block w-full" title={item.luong_search}>
              {formatCurrency(item.luong_preview)}
            </span>
          );
        case 'actions':
          return (
            <LuongBacTableRowActions
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
    (item: LuongBacTableRow) => {
      onView(item);
    },
    [onView],
  );

  const renderMobileCard = useCallback(
    (item: LuongBacTableRow, isSelected: boolean) => (
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
            <Banknote size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1 gap-2">
              <div>
                <h4 className="font-semibold text-foreground tabular-nums m-0">{item.ma_bac}</h4>
                <p className="text-xs text-muted-foreground m-0 mt-0.5">
                  {txt('matTranThietLapLuong.store.thuTuCol')}: {item.thu_tu}
                </p>
              </div>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary shrink-0"
              />
            </div>
            <p className="text-sm text-foreground m-0">
              {txt('matTranThietLapLuong.bac.colHeSo')}: <span className="tabular-nums font-medium">{item.he_so_display}</span>
            </p>
            <p className="text-sm text-foreground m-0 mt-1">
              {txt('matTranThietLapLuong.bac.colLuong')}:{' '}
              <span className="tabular-nums font-semibold">{formatCurrency(item.luong_preview)}</span>
            </p>
            <div className="flex justify-end pt-2 border-t border-border mt-2">
              <LuongBacTableRowActions
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
    [handleRowClick, onDelete, onEdit, rowMenuOpenId, toggleSelection],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('matTranThietLapLuong.bac.emptyBac')}
      emptyDescription={emptyDescription ?? txt('matTranThietLapLuong.bac.pickNgachHint')}
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
      listBreakpoint="sm"
    />
  );
});

export default LuongBacTable;
