import React, { useState, useCallback, memo } from 'react';
import { HandHeart } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { ViNguoiNgheo } from '../core/types';
import { useViNguoiNgheoStore } from '../store/useViNguoiNgheoStore';
import GenericTable from '@/components/shared/GenericTable';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge, { type BadgeConfig } from '@/components/ui/EnumBadge';
import {
  vnnDoiTuongBadge,
  vnnHinhThucBadge,
  vnnLinhVucBadge,
  vnnNguonBadge,
  vnnTrangThaiBadge,
} from '../core/display-badges';
import {
  formatVnnDateTimeDisplay,
  formatVnnNgayDisplay,
  formatVnnNguoiTaoDisplay,
  formatVnnSoTienDisplay,
  trimmedVnnDisplay,
} from '../utils/display-format';
import { VnnTableRowActions } from './vnn-table-row-actions';

interface Props {
  data: ViNguoiNgheo[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (item: ViNguoiNgheo) => void;
  onDelete: (id: string) => void;
  onView?: (item: ViNguoiNgheo) => void;
  emptyTitle?: string;
  serverSidePagination?: boolean;
  serverTotalRecords?: number | null;
  serverHasNextPage?: boolean;
}

/** Cột kiểu badge — giá trị lấy thẳng từ dòng, cấu hình màu theo cột. */
const BADGE_COLUMNS: Partial<Record<keyof ViNguoiNgheo, BadgeConfig>> = {
  linh_vuc_ho_tro: vnnLinhVucBadge,
  hinh_thuc_ho_tro: vnnHinhThucBadge,
  trang_thai: vnnTrangThaiBadge,
  nguon: vnnNguonBadge,
  doi_tuong: vnnDoiTuongBadge,
};

/** Cột chữ thường — hiện chuỗi đã cắt khoảng trắng, trống thì dấu gạch. */
const TEXT_COLUMNS = new Set<string>([
  'ten_xa_phuong',
  'khoi_xom',
  'noi_dung_ho_tro',
  'nguon_ho_tro',
  'ten_don_vi_ho_tro',
  'ghi_chu',
]);

function Badge({ value, config }: { value: string | null | undefined; config: BadgeConfig }) {
  const v = value?.trim();
  if (!v) return <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>;
  return <EnumBadge value={v} config={config} shape="pill" truncate />;
}

const VnnTable = memo(function VnnTable({
  data,
  isLoading,
  isError,
  onRetry,
  onEdit,
  onDelete,
  onView,
  emptyTitle,
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
  } = useViNguoiNgheoStore();
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
    (colId: string, item: ViNguoiNgheo) => {
      const empty = txt('common.emptyCell');
      const badge = BADGE_COLUMNS[colId as keyof ViNguoiNgheo];
      if (badge) {
        return <Badge value={item[colId as keyof ViNguoiNgheo] as string | null} config={badge} />;
      }
      if (TEXT_COLUMNS.has(colId)) {
        const label = trimmedVnnDisplay(item[colId as keyof ViNguoiNgheo] as string | null);
        return (
          <span className="text-body-sm text-muted-foreground truncate" title={label ?? undefined}>
            {label ?? empty}
          </span>
        );
      }
      switch (colId) {
        case 'nam':
          return (
            <span className="text-body-sm font-medium tabular-nums text-foreground">{item.nam}</span>
          );
        case 'ho_ten_nguoi_nhan':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <HandHeart size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span
                className="truncate font-semibold text-foreground text-sm tracking-tight"
                title={item.ho_ten_nguoi_nhan}
              >
                {item.ho_ten_nguoi_nhan}
              </span>
            </div>
          );
        case 'so_tien': {
          const label = formatVnnSoTienDisplay(item.so_tien);
          return (
            <span className="text-body-sm font-medium tabular-nums text-foreground whitespace-nowrap">
              {label || empty}
            </span>
          );
        }
        case 'ngay_cap_nhat_trang_thai': {
          const label = formatVnnNgayDisplay(item.ngay_cap_nhat_trang_thai);
          return (
            <span className="text-body-sm text-muted-foreground whitespace-nowrap tabular-nums">
              {label || empty}
            </span>
          );
        }
        case 'ho_va_ten_nguoi_tao': {
          const label = formatVnnNguoiTaoDisplay(item) || empty;
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label}>
              {label}
            </span>
          );
        }
        case 'tg_cap_nhat': {
          const label = formatVnnDateTimeDisplay(item.tg_cap_nhat);
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {label || empty}
            </span>
          );
        }
        case 'actions':
          return (
            <VnnTableRowActions
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

  const handleRowClick = useCallback((item: ViNguoiNgheo) => onView?.(item), [onView]);

  const renderMobileCard = useCallback(
    (item: ViNguoiNgheo, isSelected: boolean) => (
      <div
        className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate tracking-tight">{item.ho_ten_nguoi_nhan}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <Badge value={item.linh_vuc_ho_tro} config={vnnLinhVucBadge} />
              <Badge value={item.hinh_thuc_ho_tro} config={vnnHinhThucBadge} />
            </div>
          </div>
          <Badge value={item.trang_thai} config={vnnTrangThaiBadge} />
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">{item.nam}</span>
          {trimmedVnnDisplay(item.ten_xa_phuong) ? <span>{item.ten_xa_phuong}</span> : null}
          {trimmedVnnDisplay(item.ten_don_vi_ho_tro) ? <span>{item.ten_don_vi_ho_tro}</span> : null}
          {formatVnnSoTienDisplay(item.so_tien) ? (
            <span className="tabular-nums font-medium text-foreground">
              {formatVnnSoTienDisplay(item.so_tien)}
            </span>
          ) : null}
        </div>
        <div className="flex justify-end">
          <VnnTableRowActions
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

export default VnnTable;
