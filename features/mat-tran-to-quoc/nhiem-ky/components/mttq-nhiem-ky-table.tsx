import React, { useState, useCallback, useMemo, memo } from 'react';
import { CalendarClock } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { Option } from '@/components/ui/MultiSelect';
import type { MttqNhiemKyListRow } from '../core/types';
import { useMttqNhiemKyStore } from '../store/useMttqNhiemKyStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import { MttqNhiemKyTableRowActions } from './mttq-nhiem-ky-table-row-actions';

export interface MttqNhiemKyHeaderOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  data: MttqNhiemKyListRow[];
  isLoading: boolean;
  tuNamHeaderOptions: MttqNhiemKyHeaderOption[];
  denNamHeaderOptions: MttqNhiemKyHeaderOption[];
  onEdit: (item: MttqNhiemKyListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: MttqNhiemKyListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

const MttqNhiemKyTable = memo(function MttqNhiemKyTable({
  data,
  isLoading,
  tuNamHeaderOptions,
  denNamHeaderOptions,
  onEdit,
  onDelete,
  onView,
  emptyTitle,
  emptyDescription,
  emptyAction,
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
  } = useMttqNhiemKyStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const tuNamMultiOptions: Option[] = useMemo(
    () =>
      tuNamHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [tuNamHeaderOptions],
  );

  const denNamMultiOptions: Option[] = useMemo(
    () =>
      denNamHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [denNamHeaderOptions],
  );

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

      switch (col.id) {
        case 'tu_nam':
          return (
            <ColumnHeaderFilter
              options={tuNamMultiOptions}
              value={filters.tu_nam_filter}
              onChange={(v) => setFilter('tu_nam_filter', v)}
              ariaLabel={col.label}
              sortColumnId="tu_nam"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'den_nam':
          return (
            <ColumnHeaderFilter
              options={denNamMultiOptions}
              value={filters.den_nam_filter}
              onChange={(v) => setFilter('den_nam_filter', v)}
              ariaLabel={col.label}
              sortColumnId="den_nam"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'actions':
          return null;
        default:
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
      }
    },
    [
      filters.columnSearch,
      filters.tu_nam_filter,
      filters.den_nam_filter,
      setFilter,
      setSort,
      sort,
      tuNamMultiOptions,
      denNamMultiOptions,
    ],
  );

  const renderCell = useCallback(
    (colId: string, item: MttqNhiemKyListRow) => {
      switch (colId) {
        case 'ten_nhiem_ky':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <CalendarClock size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.ten_nhiem_ky}</span>
            </div>
          );
        case 'tu_nam':
        case 'den_nam': {
          const v = colId === 'tu_nam' ? item.tu_nam : item.den_nam;
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {v != null ? String(v) : txt('common.emptyCell')}
            </span>
          );
        }
        case 'sl_dau_nhiem_ky':
        case 'sl_thoi_tham_gia':
        case 'sl_can_bo_sung':
        case 'sl_thieu':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {String(item[colId as keyof MttqNhiemKyListRow] ?? '')}
            </span>
          );
        case 'sl_dang_tham_gia':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">{String(item.sl_dang_tham_gia)}</span>
          );
        case 'ho_va_ten_nguoi_tao':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ho_va_ten_nguoi_tao ?? undefined}>
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
            <MttqNhiemKyTableRowActions
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
    (item: MttqNhiemKyListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: MttqNhiemKyListRow, isSelected: boolean) => (
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
            <CalendarClock size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ten_nhiem_ky}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary"
              />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mb-2">
              <span className="tabular-nums shrink-0">
                {item.tu_nam != null || item.den_nam != null
                  ? `${item.tu_nam ?? '—'} → ${item.den_nam ?? '—'}`
                  : txt('common.emptyCell')}
              </span>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <MttqNhiemKyTableRowActions
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
      emptyTitle={emptyTitle ?? txt('matTranNhiemKy.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('matTranNhiemKy.emptyHint')}
      emptyAction={emptyAction}
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

export default MttqNhiemKyTable;
