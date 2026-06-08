import React, { useState, useCallback, useMemo, memo } from 'react';
import { Star } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { ThongTinToChucQuanTrong } from '../core/types';
import { useThongTinToChucQuanTrongStore } from '../store/useThongTinToChucQuanTrongStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import type { BadgeConfig } from '@/components/ui/EnumBadge';
import { ThongTinToChucQuanTrongTableRowActions } from './thong-tin-to-chuc-quan-trong-table-row-actions';

interface Props {
  data: ThongTinToChucQuanTrong[];
  isLoading: boolean;
  onEdit: (item: ThongTinToChucQuanTrong) => void;
  onDelete: (id: string) => void;
  onView?: (item: ThongTinToChucQuanTrong) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const ThongTinToChucQuanTrongTable = memo(function ThongTinToChucQuanTrongTable({
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
  } = useThongTinToChucQuanTrongStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const trangThaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      'Đang hoạt động': { label: txt('position.active'), color: 'emerald' },
      'Ngừng hoạt động': { label: txt('position.inactive'), color: 'slate' },
    };
  }, []);

  const loaiHinhBadge = useMemo((): BadgeConfig<string> => {
    return {
      Chùa: { label: 'Chùa', color: 'violet' },
      'Giáo xứ': { label: 'Giáo xứ', color: 'blue' },
      'Nghĩa trang': { label: 'Nghĩa trang', color: 'slate' },
      Khác: { label: 'Khác', color: 'amber' },
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
    (colId: string, item: ThongTinToChucQuanTrong) => {
      switch (colId) {
        case 'loai_hinh':
          return item.loai_hinh?.trim() ? (
            <EnumBadge value={item.loai_hinh.trim()} config={loaiHinhBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'ten_co_so':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Star size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.ten_co_so}</span>
            </div>
          );
        case 'chu_tri':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.chu_tri ?? undefined}>
              {item.chu_tri ?? txt('common.emptyCell')}
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
            <ThongTinToChucQuanTrongTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, trangThaiBadge, loaiHinhBadge],
  );

  const handleRowClick = useCallback(
    (item: ThongTinToChucQuanTrong) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: ThongTinToChucQuanTrong, isSelected: boolean) => (
      <div
        className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{item.ten_co_so}</p>
            <p className="text-xs text-muted-foreground truncate">{item.chu_tri ?? '—'}</p>
          </div>
          {item.trang_thai?.trim() ? (
            <EnumBadge value={item.trang_thai.trim()} config={trangThaiBadge} shape="pill" truncate />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          {item.loai_hinh?.trim() ? (
            <EnumBadge value={item.loai_hinh.trim()} config={loaiHinhBadge} shape="pill" truncate />
          ) : null}
          {item.ten_don_vi ? <span>{item.ten_don_vi}</span> : null}
        </div>
        <div className="flex justify-end">
          <ThongTinToChucQuanTrongTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, trangThaiBadge, loaiHinhBadge],
  );

  return (
    <GenericTable<ThongTinToChucQuanTrong>
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('danTocToChucQuanTrong.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('danTocToChucQuanTrong.emptyHint')}
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

export default ThongTinToChucQuanTrongTable;
