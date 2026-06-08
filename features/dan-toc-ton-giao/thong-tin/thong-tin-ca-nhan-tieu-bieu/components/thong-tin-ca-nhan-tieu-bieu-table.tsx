import React, { useState, useCallback, useMemo, memo } from 'react';
import { UserRound } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { ThongTinCaNhanTieuBieu } from '../core/types';
import { useThongTinCaNhanTieuBieuStore } from '../store/useThongTinCaNhanTieuBieuStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import type { BadgeConfig } from '@/components/ui/EnumBadge';
import { ThongTinCaNhanTieuBieuTableRowActions } from './thong-tin-ca-nhan-tieu-bieu-table-row-actions';

interface Props {
  data: ThongTinCaNhanTieuBieu[];
  isLoading: boolean;
  onEdit: (item: ThongTinCaNhanTieuBieu) => void;
  onDelete: (id: string) => void;
  onView?: (item: ThongTinCaNhanTieuBieu) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const ThongTinCaNhanTieuBieuTable = memo(function ThongTinCaNhanTieuBieuTable({
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
  } = useThongTinCaNhanTieuBieuStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const trangThaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      'Đang hoạt động': { label: txt('position.active'), color: 'emerald' },
      'Ngừng hoạt động': { label: txt('position.inactive'), color: 'slate' },
    };
  }, []);

  const doiTuongBadge = useMemo((): BadgeConfig<string> => {
    return {
      'Chức sắc': { label: 'Chức sắc', color: 'violet' },
      'Người uy tín': { label: 'Người uy tín', color: 'blue' },
      'Người có công': { label: 'Người có công', color: 'amber' },
    };
  }, []);

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
    (colId: string, item: ThongTinCaNhanTieuBieu) => {
      switch (colId) {
        case 'ho_va_ten':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <UserRound size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.ho_va_ten}</span>
            </div>
          );
        case 'doi_tuong':
          return item.doi_tuong?.trim() ? (
            <EnumBadge value={item.doi_tuong.trim()} config={doiTuongBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'chuc_vu_vi_tri':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.chuc_vu_vi_tri ?? undefined}>
              {item.chuc_vu_vi_tri ?? txt('common.emptyCell')}
            </span>
          );
        case 'ton_giao_dan_toc':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ton_giao_dan_toc ?? undefined}>
              {item.ton_giao_dan_toc ?? txt('common.emptyCell')}
            </span>
          );
        case 'ten_don_vi':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_don_vi ?? undefined}>
              {item.ten_don_vi ?? txt('common.emptyCell')}
            </span>
          );
        case 'so_dien_thoai':
          return (
            <span className="text-body-sm text-muted-foreground truncate tabular-nums" title={item.so_dien_thoai ?? undefined}>
              {item.so_dien_thoai ?? txt('common.emptyCell')}
            </span>
          );
        case 'trang_thai':
          return item.trang_thai?.trim() ? (
            <EnumBadge value={item.trang_thai.trim()} config={trangThaiBadge} shape="pill" truncate />
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
            <ThongTinCaNhanTieuBieuTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, trangThaiBadge, doiTuongBadge],
  );

  const handleRowClick = useCallback(
    (item: ThongTinCaNhanTieuBieu) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: ThongTinCaNhanTieuBieu, isSelected: boolean) => (
      <div
        className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{item.ho_va_ten}</p>
            <p className="text-xs text-muted-foreground truncate">{item.chuc_vu_vi_tri ?? '—'}</p>
          </div>
          {item.trang_thai?.trim() ? (
            <EnumBadge value={item.trang_thai.trim()} config={trangThaiBadge} shape="pill" truncate />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {item.doi_tuong?.trim() ? (
            <EnumBadge value={item.doi_tuong.trim()} config={doiTuongBadge} shape="pill" truncate />
          ) : null}
          {item.ten_don_vi ? <span>{item.ten_don_vi}</span> : null}
        </div>
        <div className="flex justify-end">
          <ThongTinCaNhanTieuBieuTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, trangThaiBadge, doiTuongBadge],
  );

  return (
    <GenericTable<ThongTinCaNhanTieuBieu>
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('danTocCaNhanTieuBieu.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('danTocCaNhanTieuBieu.emptyHint')}
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

export default ThongTinCaNhanTieuBieuTable;
