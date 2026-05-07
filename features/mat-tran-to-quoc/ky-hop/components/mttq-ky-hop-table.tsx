import React, { useState, useCallback, useMemo, memo } from 'react';
import { CalendarDays } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { Option } from '@/components/ui/MultiSelect';
import type { MttqKyHopListRow } from '../core/types';
import { useMttqKyHopStore } from '../store/useMttqKyHopStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import { MttqKyHopTableRowActions } from './mttq-ky-hop-table-row-actions';
import { donViDisplayLabel } from '../utils/column-search';

export interface MttqKyHopHeaderOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  data: MttqKyHopListRow[];
  isLoading: boolean;
  nhiemKyHeaderOptions: MttqKyHopHeaderOption[];
  donViHeaderOptions: MttqKyHopHeaderOption[];
  namHeaderOptions: MttqKyHopHeaderOption[];
  onEdit: (item: MttqKyHopListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: MttqKyHopListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

function truncateText(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

const MttqKyHopTable = memo(function MttqKyHopTable({
  data,
  isLoading,
  nhiemKyHeaderOptions,
  donViHeaderOptions,
  namHeaderOptions,
  onEdit,
  onDelete,
  onView,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: Props) {
  const tinhCap = txt('matTranKyHop.tinhCap');
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
  } = useMttqKyHopStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const nhiemKyMultiOptions: Option[] = useMemo(
    () =>
      nhiemKyHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [nhiemKyHeaderOptions],
  );

  const donViMultiOptions: Option[] = useMemo(
    () =>
      donViHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [donViHeaderOptions],
  );

  const namMultiOptions: Option[] = useMemo(
    () =>
      namHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [namHeaderOptions],
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
        case 'ten_nhiem_ky':
          return (
            <ColumnHeaderFilter
              options={nhiemKyMultiOptions}
              value={filters.nhiem_ky_filter}
              onChange={(v) => setFilter('nhiem_ky_filter', v)}
              ariaLabel={col.label}
              sortColumnId="ten_nhiem_ky"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ten_don_vi':
          return (
            <ColumnHeaderFilter
              options={donViMultiOptions}
              value={filters.don_vi_filter}
              onChange={(v) => setFilter('don_vi_filter', v)}
              ariaLabel={col.label}
              sortColumnId="ten_don_vi"
              sort={sort}
              setSort={setSort}
            />
          );
        case 'ngay_hop':
          return (
            <ColumnHeaderFilter
              options={namMultiOptions}
              value={filters.nam_filter}
              onChange={(v) => setFilter('nam_filter', v)}
              ariaLabel={col.label}
              sortColumnId="ngay_hop"
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
      filters.nhiem_ky_filter,
      filters.don_vi_filter,
      filters.nam_filter,
      setFilter,
      setSort,
      sort,
      nhiemKyMultiOptions,
      donViMultiOptions,
      namMultiOptions,
    ],
  );

  const renderCell = useCallback(
    (colId: string, item: MttqKyHopListRow) => {
      switch (colId) {
        case 'ten_nhiem_ky':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.ten_nhiem_ky}</span>
            </div>
          );
        case 'ky_thu':
          return <span className="text-body-sm text-muted-foreground">{item.ky_thu}</span>;
        case 'ngay_hop':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {item.ngay_hop ?? txt('common.emptyCell')}
            </span>
          );
        case 'ten_don_vi':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={donViDisplayLabel(item, tinhCap)}>
              {donViDisplayLabel(item, tinhCap)}
            </span>
          );
        case 'noi_dung_ky_hop':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.noi_dung_ky_hop ?? undefined}>
              {item.noi_dung_ky_hop ? truncateText(item.noi_dung_ky_hop, 120) : txt('common.emptyCell')}
            </span>
          );
        case 'tai_lieu_hop': {
          const url = item.tai_lieu_hop?.trim();
          if (!url) return <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>;
          return (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-body-sm text-primary hover:underline truncate block max-w-full"
              title={url}
              onClick={(e) => e.stopPropagation()}
            >
              {truncateText(url, 48)}
            </a>
          );
        }
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
            <MttqKyHopTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, tinhCap],
  );

  const handleRowClick = useCallback(
    (item: MttqKyHopListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: MttqKyHopListRow, isSelected: boolean) => (
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
            <CalendarDays size={20} />
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
              <span className="shrink-0">{item.ky_thu}</span>
              <span className="tabular-nums">{item.ngay_hop ?? '—'}</span>
              <span className="truncate max-w-full">{donViDisplayLabel(item, tinhCap)}</span>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <MttqKyHopTableRowActions
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
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection, tinhCap],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('matTranKyHop.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('matTranKyHop.emptyHint')}
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

export default MttqKyHopTable;
