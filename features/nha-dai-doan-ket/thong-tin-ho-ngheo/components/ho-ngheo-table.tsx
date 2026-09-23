import React, { useState, useCallback, memo } from 'react';
import { Users } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { HoNgheo } from '../core/types';
import { useHoNgheoStore } from '../store/useHoNgheoStore';
import GenericTable from '@/components/shared/GenericTable';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import { hnghDoiTuongBadge, hnghTonGiaoBadge, hnghTrangThaiBadge } from '../core/display-badges';
import {
  formatHnghDateTimeDisplay,
  formatHnghDienThoaiDisplay,
  formatHnghNgayDisplay,
  formatHnghNguoiTaoDisplay,
  trimmedHnghDisplay,
} from '../utils/display-format';
import { HoNgheoTableRowActions } from './ho-ngheo-table-row-actions';

interface Props {
  data: HoNgheo[];
  isLoading: boolean;
  /** Query lỗi — bảng hiện thông báo lỗi + nút Thử lại thay vì "Không có dữ liệu". */
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (item: HoNgheo) => void;
  onDelete: (id: string) => void;
  onView?: (item: HoNgheo) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  serverSidePagination?: boolean;
  serverTotalRecords?: number | null;
  serverHasNextPage?: boolean;
}

const HoNgheoTable = memo(function HoNgheoTable({
  data,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  onView,
  emptyTitle,
  emptyDescription,
  serverSidePagination,
  serverTotalRecords,
  serverHasNextPage,
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
  } = useHoNgheoStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
      if (col.id === 'actions') return null;
      const columnSearchEl = (
        <ColumnHeaderSearch
          variant="inDropdown"
          value={cs[col.id] ?? ''}
          onChange={(v) => setFilter('columnSearch', { ...cs, [col.id]: v })}
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
    (colId: string, item: HoNgheo) => {
      const empty = txt('common.emptyCell');
      switch (colId) {
        case 'ho_ten_dai_dien':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Users size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-medium text-foreground" title={item.ho_ten_dai_dien}>
                {item.ho_ten_dai_dien || empty}
              </span>
            </div>
          );
        case 'so_cccd': {
          const label = trimmedHnghDisplay(item.so_cccd);
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'ten_xa_phuong': {
          const label = trimmedHnghDisplay(item.ten_xa_phuong);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'khoi_xom': {
          const label = trimmedHnghDisplay(item.khoi_xom);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'doi_tuong':
          return item.doi_tuong?.trim() ? (
            <EnumBadge value={item.doi_tuong.trim()} config={hnghDoiTuongBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{empty}</span>
          );
        case 'dien_thoai': {
          const label = formatHnghDienThoaiDisplay(item.dien_thoai);
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground whitespace-nowrap">
              {label || empty}
            </span>
          );
        }
        case 'ten_dan_toc': {
          const label = trimmedHnghDisplay(item.ten_dan_toc);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'ton_giao':
          return item.ton_giao?.trim() ? (
            <EnumBadge value={item.ton_giao.trim()} config={hnghTonGiaoBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{empty}</span>
          );
        case 'so_tai_khoan': {
          const label = trimmedHnghDisplay(item.so_tai_khoan);
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'ngan_hang': {
          const label = trimmedHnghDisplay(item.ngan_hang);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'trang_thai':
          return item.trang_thai?.trim() ? (
            <EnumBadge value={item.trang_thai.trim()} config={hnghTrangThaiBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{empty}</span>
          );
        case 'ngay_cap_nhat_trang_thai': {
          const label = formatHnghNgayDisplay(item.ngay_cap_nhat_trang_thai);
          return (
            <span className="text-body-sm text-muted-foreground whitespace-nowrap tabular-nums">
              {label || empty}
            </span>
          );
        }
        case 'ghi_chu': {
          const label = trimmedHnghDisplay(item.ghi_chu);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'ho_va_ten_nguoi_tao': {
          const label = formatHnghNguoiTaoDisplay(item);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label || undefined}>
              {label || empty}
            </span>
          );
        }
        case 'tg_cap_nhat': {
          const label = formatHnghDateTimeDisplay(item.tg_cap_nhat);
          return (
            <span className="text-body-sm text-muted-foreground whitespace-nowrap tabular-nums">
              {label || empty}
            </span>
          );
        }
        case 'actions':
          return (
            <HoNgheoTableRowActions
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
    (item: HoNgheo) => {
      onView?.(item);
    },
    [onView],
  );

  const renderMobileCard = useCallback(
    (item: HoNgheo) => (
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium text-foreground">{item.ho_ten_dai_dien}</div>
            <div className="truncate text-xs text-muted-foreground">
              {[trimmedHnghDisplay(item.ten_xa_phuong), trimmedHnghDisplay(item.khoi_xom)]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          {item.trang_thai?.trim() ? (
            <EnumBadge value={item.trang_thai.trim()} config={hnghTrangThaiBadge} shape="pill" truncate />
          ) : null}
        </div>
        <div className="flex justify-end">
          <HoNgheoTableRowActions
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
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      isError={isError}
      onRetry={onRetry}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      serverSidePagination={serverSidePagination}
      serverTotalRecords={serverTotalRecords ?? undefined}
      serverHasNextPage={serverHasNextPage}
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
      onRowClick={onView ? handleRowClick : undefined}
      keyExtractor={(item) => item.id}
      onResizeColumn={resizeColumn}
      stickyLeftCount={3}
      listBreakpoint="sm"
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
    />
  );
});

export default HoNgheoTable;
