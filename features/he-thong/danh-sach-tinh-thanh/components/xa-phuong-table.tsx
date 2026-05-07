import React, { useCallback, useState, memo } from 'react';
import { Map } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatDateShort } from '@/lib/utils';
import GenericTable from '@/components/shared/GenericTable';
import type { ColumnConfig } from '@/store/createGenericStore';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { XaPhuong } from '../core/types';
import { useXaPhuongStore } from '../store/useXaPhuongStore';
import { XaPhuongRowActions } from './xa-phuong-row-actions';

interface Props {
  data: XaPhuong[];
  isLoading: boolean;
  onEdit: (item: XaPhuong) => void;
  onDelete: (id: string) => void;
  onView?: (item: XaPhuong) => void;
}

const XaPhuongTable = memo(function XaPhuongTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onView,
}: Props) {
  const { canEdit, canDelete } = useResourcePermissions('provinces');
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
  } = useXaPhuongStore();
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
    (colId: string, item: XaPhuong) => {
      switch (colId) {
        case 'thu_tu':
          return <span className="text-sm font-medium text-muted-foreground tabular-nums">{item.thu_tu}</span>;
        case 'ten':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Map size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm">{item.ten}</span>
            </div>
          );
        case 'tg_tao':
          return <span className="text-xs text-muted-foreground">{formatDateShort(item.tg_tao)}</span>;
        case 'tg_cap_nhat':
          return <span className="text-xs text-muted-foreground">{formatDateShort(item.tg_cap_nhat)}</span>;
        case 'actions':
          return (
            <XaPhuongRowActions
              item={item}
              menuOpenId={rowMenuOpenId}
              onMenuOpenChange={setRowMenuOpenId}
              onEdit={onEdit}
              onDelete={onDelete}
              canEdit={canEdit}
              canDelete={canDelete}
            />
          );
        default:
          return null;
      }
    },
    [onEdit, onDelete, rowMenuOpenId, canEdit, canDelete],
  );

  const handleRowClick = useCallback(
    (item: XaPhuong) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: XaPhuong, isSelected: boolean) => (
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
        className={`bg-card rounded-xl border p-4 shadow-sm transition-all ${isSelected ? 'border-primary ring-2 ring-primary/10' : 'border-border'}`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Map size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2 mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ten}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {txt('diaBan.colThuTu')}: <span className="tabular-nums font-medium text-foreground">{item.thu_tu}</span>
            </p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-border flex justify-end">
          <XaPhuongRowActions
            item={item}
            menuOpenId={rowMenuOpenId}
            onMenuOpenChange={setRowMenuOpenId}
            onEdit={onEdit}
            onDelete={onDelete}
            canEdit={canEdit}
            canDelete={canDelete}
            compact
          />
        </div>
      </div>
    ),
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection, canEdit, canDelete],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
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
      emptyTitle={txt('diaBan.emptyXa')}
      emptyDescription=""
    />
  );
});

export default XaPhuongTable;
