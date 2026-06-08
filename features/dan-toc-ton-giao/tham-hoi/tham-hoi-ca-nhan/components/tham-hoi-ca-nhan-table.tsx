import React, { useState, useCallback, useMemo, memo } from 'react';
import { ExternalLink, User } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { ThamHoiCaNhan } from '../core/types';
import { useThamHoiCaNhanStore } from '../store/useThamHoiCaNhanStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import { trangThaiThamHoiBadge } from '../core/display-badges';
import { formatDonViThamHoiDisplay } from '../core/display-don-vi';
import { formatThoiGianDuKienDisplay } from '../utils/thoi-gian-du-kien';
import { ThamHoiCaNhanTableRowActions } from './tham-hoi-ca-nhan-table-row-actions';

interface Props {
  data: ThamHoiCaNhan[];
  isLoading: boolean;
  onEdit: (item: ThamHoiCaNhan) => void;
  onDelete: (id: string) => void;
  onView?: (item: ThamHoiCaNhan) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const ThamHoiCaNhanTable = memo(function ThamHoiCaNhanTable({
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
  } = useThamHoiCaNhanStore();
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
    (colId: string, item: ThamHoiCaNhan) => {
      switch (colId) {
        case 'ho_va_ten':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <User size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">
                {item.ho_va_ten ?? txt('common.emptyCell')}
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
            <span
              className="text-body-sm text-muted-foreground truncate tabular-nums"
              title={formatThoiGianDuKienDisplay(item.thoi_gian_du_kien) || undefined}
            >
              {formatThoiGianDuKienDisplay(item.thoi_gian_du_kien) || txt('common.emptyCell')}
            </span>
          );
        case 'don_vi_tham_hoi':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate"
              title={formatDonViThamHoiDisplay(item)}
            >
              {formatDonViThamHoiDisplay(item)}
            </span>
          );
        case 'ten_phong_ban':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_phong_ban ?? undefined}>
              {item.ten_phong_ban ?? txt('common.emptyCell')}
            </span>
          );
        case 'trang_thai':
          return item.trang_thai?.trim() ? (
            <EnumBadge value={item.trang_thai.trim()} config={trangThaiThamHoiBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'ket_qua_ghi_chu':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ket_qua_ghi_chu ?? undefined}>
              {item.ket_qua_ghi_chu ?? txt('common.emptyCell')}
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
            <ThamHoiCaNhanTableRowActions
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
    (item: ThamHoiCaNhan) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: ThamHoiCaNhan, isSelected: boolean) => (
      <div
        className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{item.ho_va_ten ?? '—'}</p>
            <p className="text-xs text-muted-foreground truncate">{item.dip_tham_hoi}</p>
          </div>
          {item.trang_thai?.trim() ? (
            <EnumBadge value={item.trang_thai.trim()} config={trangThaiThamHoiBadge} shape="pill" truncate />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {item.thoi_gian_du_kien ? <span>{formatThoiGianDuKienDisplay(item.thoi_gian_du_kien)}</span> : null}
          {item.ten_phong_ban ? <span>· {item.ten_phong_ban}</span> : null}
        </div>
        <div className="flex justify-end">
          <ThamHoiCaNhanTableRowActions
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
    <GenericTable<ThamHoiCaNhan>
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('danTocThamHoiCaNhan.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('danTocThamHoiCaNhan.emptyHint')}
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

export default ThamHoiCaNhanTable;
