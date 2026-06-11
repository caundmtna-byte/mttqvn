import React, { useState, useCallback, useMemo, memo } from 'react';
import { Building2, ExternalLink } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { ThamHoiToChuc } from '../core/types';
import { useThamHoiToChucStore } from '../store/useThamHoiToChucStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import { tienDoThamHoiBadge } from '../core/display-badges';
import { formatDonViThamHoiDisplay } from '../core/display-don-vi';
import { ThamHoiToChucTableRowActions } from './tham-hoi-to-chuc-table-row-actions';

interface Props {
  data: ThamHoiToChuc[];
  isLoading: boolean;
  onEdit: (item: ThamHoiToChuc) => void;
  onDelete: (id: string) => void;
  onView?: (item: ThamHoiToChuc) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const ThamHoiToChucTable = memo(function ThamHoiToChucTable({
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
  } = useThamHoiToChucStore();
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
    (colId: string, item: ThamHoiToChuc) => {
      switch (colId) {
        case 'ten_co_so':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Building2 size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">
                {item.ten_co_so ?? txt('common.emptyCell')}
              </span>
            </div>
          );
        case 'dip_tham_hoi':
          return (
            <span className="text-body-sm text-foreground truncate" title={item.dip_tham_hoi}>
              {item.dip_tham_hoi}
            </span>
          );
        case 'thoi_gian_du_kien':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.thoi_gian_du_kien ?? undefined}>
              {item.thoi_gian_du_kien ?? txt('common.emptyCell')}
            </span>
          );
        case 'don_vi_tham_hoi': {
          const label = formatDonViThamHoiDisplay(item);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label}>
              {label}
            </span>
          );
        }
        case 'tien_do':
          return item.tien_do?.trim() ? (
            <EnumBadge value={item.tien_do.trim()} config={tienDoThamHoiBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'ket_qua_thuc_hien':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ket_qua_thuc_hien ?? undefined}>
              {item.ket_qua_thuc_hien ?? txt('common.emptyCell')}
            </span>
          );
        case 'link_ket_qua':
          return item.link_ket_qua?.trim() ? (
            <a
              href={item.link_ket_qua.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Link
              <ExternalLink size={12} aria-hidden />
            </a>
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'tg_cap_nhat':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_cap_nhat ? formatDateTimeShort(item.tg_cap_nhat) : txt('common.emptyCell')}
            </span>
          );
        case 'actions':
          return (
            <ThamHoiToChucTableRowActions
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
    (item: ThamHoiToChuc) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: ThamHoiToChuc, isSelected: boolean) => (
      <div
        className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{item.ten_co_so ?? '—'}</p>
            <p className="text-xs text-muted-foreground truncate">{item.dip_tham_hoi}</p>
          </div>
          {item.tien_do?.trim() ? (
            <EnumBadge value={item.tien_do.trim()} config={tienDoThamHoiBadge} shape="pill" truncate />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {item.thoi_gian_du_kien ? <span>{item.thoi_gian_du_kien}</span> : null}
          <span>· {formatDonViThamHoiDisplay(item)}</span>
        </div>
        <div className="flex justify-end">
          <ThamHoiToChucTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId],
  );

  return (
    <GenericTable<ThamHoiToChuc>
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('danTocThamHoiToChuc.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('danTocThamHoiToChuc.emptyHint')}
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

export default ThamHoiToChucTable;
