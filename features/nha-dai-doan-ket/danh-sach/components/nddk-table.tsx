import React, { useState, useCallback, memo } from 'react';
import { Home } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { NhaDaiDoanKet } from '../core/types';
import { useNhaDaiDoanKetStore } from '../store/useNhaDaiDoanKetStore';
import GenericTable from '@/components/shared/GenericTable';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import {
  nddkDoiTuongBadge,
  nddkLoaiHinhBadge,
  nddkNguonBadge,
  nddkTrangThaiBadge,
} from '../core/display-badges';
import {
  formatNddkDateTimeDisplay,
  formatNddkNgayDisplay,
  formatNddkNguoiTaoDisplay,
  formatNddkSoTienDisplay,
  trimmedNddkDisplay,
} from '../utils/display-format';
import { NddkTableRowActions } from './nddk-table-row-actions';

interface Props {
  data: NhaDaiDoanKet[];
  isLoading: boolean;
  /** Query lỗi — bảng hiện thông báo lỗi + nút Thử lại thay vì "Không có dữ liệu". */
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (item: NhaDaiDoanKet) => void;
  onDelete: (id: string) => void;
  onView?: (item: NhaDaiDoanKet) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  serverSidePagination?: boolean;
  serverTotalRecords?: number | null;
  serverHasNextPage?: boolean;
}

const NddkTable = memo(function NddkTable({
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
  } = useNhaDaiDoanKetStore();
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
    (colId: string, item: NhaDaiDoanKet) => {
      const empty = txt('common.emptyCell');
      switch (colId) {
        case 'nam':
          return (
            <span className="text-body-sm font-medium tabular-nums text-foreground">{item.nam}</span>
          );
        case 'ho_ten_chu_ho':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Home size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span
                className="truncate font-semibold text-foreground text-sm tracking-tight"
                title={item.ho_ten_chu_ho}
              >
                {item.ho_ten_chu_ho}
              </span>
            </div>
          );
        case 'ten_xa_phuong': {
          const label = trimmedNddkDisplay(item.ten_xa_phuong);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'khoi_xom': {
          const label = trimmedNddkDisplay(item.khoi_xom);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'loai_hinh_ho_tro':
          return item.loai_hinh_ho_tro?.trim() ? (
            <EnumBadge
              value={item.loai_hinh_ho_tro.trim()}
              config={nddkLoaiHinhBadge}
              shape="pill"
              truncate
            />
          ) : (
            <span className="text-body-sm text-muted-foreground">{empty}</span>
          );
        case 'so_tien': {
          const label = formatNddkSoTienDisplay(item.so_tien);
          return (
            <span className="text-body-sm font-medium tabular-nums text-foreground whitespace-nowrap">
              {label || empty}
            </span>
          );
        }
        case 'trang_thai':
          return item.trang_thai?.trim() ? (
            <EnumBadge
              value={item.trang_thai.trim()}
              config={nddkTrangThaiBadge}
              shape="pill"
              truncate
            />
          ) : (
            <span className="text-body-sm text-muted-foreground">{empty}</span>
          );
        case 'ngay_cap_nhat_trang_thai': {
          const label = formatNddkNgayDisplay(item.ngay_cap_nhat_trang_thai);
          return (
            <span className="text-body-sm text-muted-foreground whitespace-nowrap tabular-nums">
              {label || empty}
            </span>
          );
        }
        case 'noi_dung_ho_tro': {
          const label = trimmedNddkDisplay(item.noi_dung_ho_tro);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'nguon':
          return item.nguon?.trim() ? (
            <EnumBadge value={item.nguon.trim()} config={nddkNguonBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{empty}</span>
          );
        case 'nguon_ho_tro': {
          const label = trimmedNddkDisplay(item.nguon_ho_tro);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'doi_tuong':
          return item.doi_tuong?.trim() ? (
            <EnumBadge
              value={item.doi_tuong.trim()}
              config={nddkDoiTuongBadge}
              shape="pill"
              truncate
            />
          ) : (
            <span className="text-body-sm text-muted-foreground">{empty}</span>
          );
        case 'ghi_chu': {
          const label = trimmedNddkDisplay(item.ghi_chu);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
              {label ?? empty}
            </span>
          );
        }
        case 'ho_va_ten_nguoi_tao': {
          const label = formatNddkNguoiTaoDisplay(item) || empty;
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label}>
              {label}
            </span>
          );
        }
        case 'tg_cap_nhat': {
          const label = formatNddkDateTimeDisplay(item.tg_cap_nhat);
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {label || empty}
            </span>
          );
        }
        case 'actions':
          return (
            <NddkTableRowActions
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
    (item: NhaDaiDoanKet) => {
      onView?.(item);
    },
    [onView],
  );

  const renderMobileCard = useCallback(
    (item: NhaDaiDoanKet, isSelected: boolean) => (
      <div
        className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate tracking-tight">{item.ho_ten_chu_ho}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {item.loai_hinh_ho_tro?.trim() ? (
                <EnumBadge
                  value={item.loai_hinh_ho_tro.trim()}
                  config={nddkLoaiHinhBadge}
                  shape="pill"
                  truncate
                />
              ) : null}
              {item.doi_tuong?.trim() ? (
                <EnumBadge
                  value={item.doi_tuong.trim()}
                  config={nddkDoiTuongBadge}
                  shape="pill"
                  truncate
                />
              ) : null}
            </div>
          </div>
          {item.trang_thai?.trim() ? (
            <EnumBadge
              value={item.trang_thai.trim()}
              config={nddkTrangThaiBadge}
              shape="pill"
              truncate
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">{item.nam}</span>
          {trimmedNddkDisplay(item.ten_xa_phuong) ? (
            <span>{trimmedNddkDisplay(item.ten_xa_phuong)}</span>
          ) : null}
          {trimmedNddkDisplay(item.khoi_xom) ? (
            <span>{trimmedNddkDisplay(item.khoi_xom)}</span>
          ) : null}
          {formatNddkSoTienDisplay(item.so_tien) ? (
            <span className="tabular-nums font-medium text-foreground">
              {formatNddkSoTienDisplay(item.so_tien)}
            </span>
          ) : null}
        </div>
        <div className="flex justify-end">
          <NddkTableRowActions
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

export default NddkTable;
