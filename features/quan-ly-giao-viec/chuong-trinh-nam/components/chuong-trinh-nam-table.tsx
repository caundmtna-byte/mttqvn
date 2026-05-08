import React, { useState, useCallback, useMemo, memo } from 'react';
import { CalendarRange } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { ChuongTrinhNamListRow } from '../core/types';
import { useChuongTrinhNamStore } from '../store/useChuongTrinhNamStore';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils';
import { getChuongTrinhNamTrangThaiBadgeConfig } from '../core/constants';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import { ChuongTrinhNamTableRowActions } from './chuong-trinh-nam-table-row-actions';

interface Props {
  data: ChuongTrinhNamListRow[];
  isLoading: boolean;
  onEdit: (item: ChuongTrinhNamListRow) => void;
  onDelete: (id: string) => void;
  /** Mặc định: click dòng mở chi tiết (drawer đọc). */
  onView?: (item: ChuongTrinhNamListRow) => void;
}

const ChuongTrinhNamTable = memo(function ChuongTrinhNamTable({
  data,
  isLoading,
  onEdit,
  onDelete,
  onView,
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
  } = useChuongTrinhNamStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const trangThaiBadgeConfig = useMemo(() => getChuongTrinhNamTrangThaiBadgeConfig(), []);

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
    (colId: string, item: ChuongTrinhNamListRow) => {
      switch (colId) {
        case 'ten_chuong_trinh':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <CalendarRange size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">
                {item.ten_chuong_trinh}
              </span>
            </div>
          );
        case 'ngay_bat_dau':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {item.ngay_bat_dau ? formatDateShort(item.ngay_bat_dau) : txt('common.emptyCell')}
            </span>
          );
        case 'ngay_ket_thuc':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {item.ngay_ket_thuc ? formatDateShort(item.ngay_ket_thuc) : txt('common.emptyCell')}
            </span>
          );
        case 'trang_thai':
          return (
            <EnumBadge value={item.trang_thai} config={trangThaiBadgeConfig} truncate shape="pill" />
          );
        case 'ten_phong_ban':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_phong_ban ?? undefined}>
              {item.ten_phong_ban ?? txt('common.emptyCell')}
            </span>
          );
        case 'ho_va_ten_nguoi_tao':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate"
              title={item.ho_va_ten_nguoi_tao ?? undefined}
            >
              {item.ho_va_ten_nguoi_tao ?? item.ten_tai_khoan_nguoi_tao ?? txt('common.emptyCell')}
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
            <ChuongTrinhNamTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, trangThaiBadgeConfig],
  );

  const handleRowClick = useCallback(
    (item: ChuongTrinhNamListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: ChuongTrinhNamListRow, isSelected: boolean) => (
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
            <CalendarRange size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ten_chuong_trinh}</h4>
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
              <EnumBadge value={item.trang_thai} config={trangThaiBadgeConfig} shape="pill" truncate />
              <span className="tabular-nums shrink-0">
                {formatDateShort(item.ngay_bat_dau)} → {formatDateShort(item.ngay_ket_thuc)}
              </span>
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <ChuongTrinhNamTableRowActions
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
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection, trangThaiBadgeConfig],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={txt('chuongTrinhNam.emptyTitle')}
      emptyDescription={txt('chuongTrinhNam.emptyHint')}
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

export default ChuongTrinhNamTable;
