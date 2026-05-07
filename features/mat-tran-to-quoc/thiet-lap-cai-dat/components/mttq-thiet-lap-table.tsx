import React, { useCallback, useState, memo } from 'react';
import { Settings2, ListOrdered } from 'lucide-react';
import { txt } from '@/lib/text';
import GenericTable from '@/components/shared/GenericTable';
import type { ColumnConfig, GenericState } from '@/store/createGenericStore';
import type { MttqThietLap, MttqThietLapFilters } from '../core/types';
import { MttqThietLapRowActions } from './mttq-thiet-lap-row-actions';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import { formatDateShort } from '@/lib/utils';

interface Props {
  store: GenericState<MttqThietLapFilters>;
  data: MttqThietLap[];
  isLoading: boolean;
  onRowClick: (item: MttqThietLap) => void;
  onEdit: (item: MttqThietLap) => void;
  onDelete: (id: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const MttqThietLapTable = memo(function MttqThietLapTable({
  store,
  data,
  isLoading,
  onRowClick,
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
  } = store;

  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
      const colSearchActive = Boolean(cs[col.id]?.trim());
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
          columnSearchActive={colSearchActive}
        />
      );
    },
    [filters.columnSearch, setFilter, sort, setSort],
  );

  const renderCell = useCallback(
    (colId: string, item: MttqThietLap) => {
      switch (colId) {
        case 'thu_tu':
          return <span className="text-sm font-medium text-muted-foreground tabular-nums">{item.thu_tu}</span>;
        case 'ten':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Settings2 size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm">{item.ten}</span>
            </div>
          );
        case 'mo_ta':
          return (
            <div className="truncate max-w-[200px] text-body-sm text-muted-foreground" title={item.mo_ta ?? ''}>
              {item.mo_ta ?? <span className="text-muted-foreground">—</span>}
            </div>
          );
        case 'tg_tao':
          return <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(item.tg_tao)}</span>;
        case 'tg_cap_nhat':
          return <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDateShort(item.tg_cap_nhat)}</span>;
        case 'actions':
          return (
            <MttqThietLapRowActions
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
    (item: MttqThietLap) => {
      onRowClick(item);
    },
    [onRowClick],
  );

  const renderMobileCard = useCallback(
    (item: MttqThietLap, isSelected: boolean) => (
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
        className={`bg-card rounded-xl border p-3 shadow-sm transition-all sm:p-4 ${isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-border'}`}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <ListOrdered size={18} className="sm:h-5 sm:w-5" strokeWidth={2.25} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1 gap-2">
              <h4 className="font-semibold text-foreground truncate">{item.ten}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary shrink-0"
              />
            </div>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{item.mo_ta ?? '—'}</p>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground tabular-nums">
                {txt('page.articleSettings.colThuTu')}: {item.thu_tu}
              </span>
              <MttqThietLapRowActions
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
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
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

export default MttqThietLapTable;
