import React, { useState, useCallback, useMemo, memo } from 'react';
import { Award } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { Option } from '@/components/ui/MultiSelect';
import type { MttqKhenThuongListRow } from '../core/types';
import { useMttqKhenThuongStore } from '../store/useMttqKhenThuongStore';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils';
import { getKhenThuongTrangThaiBadgeConfig } from '../utils/display-format';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import { MttqKhenThuongTableRowActions } from './mttq-khen-thuong-table-row-actions';

export interface MttqKhenThuongTrangThaiHeaderOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  data: MttqKhenThuongListRow[];
  isLoading: boolean;
  /** Options + count cho MultiSelect header cột trạng thái (đồng bộ toolbar). */
  trangThaiHeaderOptions: MttqKhenThuongTrangThaiHeaderOption[];
  onEdit: (item: MttqKhenThuongListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: MttqKhenThuongListRow) => void;
}

const MttqKhenThuongTable = memo(function MttqKhenThuongTable({
  data,
  isLoading,
  trangThaiHeaderOptions,
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
  } = useMttqKhenThuongStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const trangThaiBadgeConfig = useMemo(() => getKhenThuongTrangThaiBadgeConfig(), []);

  const trangThaiMultiOptions: Option[] = useMemo(
    () =>
      trangThaiHeaderOptions.map((o) => ({
        label: o.label,
        value: o.value,
        count: o.count,
      })),
    [trangThaiHeaderOptions],
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
        case 'trang_thai':
          return (
            <ColumnHeaderFilter
              options={trangThaiMultiOptions}
              value={filters.trang_thai}
              onChange={(v) => setFilter('trang_thai', v)}
              ariaLabel={col.label}
              sortColumnId="trang_thai"
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
    [filters.columnSearch, filters.trang_thai, setFilter, setSort, sort, trangThaiMultiOptions],
  );

  const renderCell = useCallback(
    (colId: string, item: MttqKhenThuongListRow) => {
      switch (colId) {
        case 'so_qd':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Award size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.so_qd}</span>
            </div>
          );
        case 'ngay_khen_thuong':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">
              {item.ngay_khen_thuong ? formatDateShort(item.ngay_khen_thuong) : txt('common.emptyCell')}
            </span>
          );
        case 'don_vi_de_xuat':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.don_vi_de_xuat ?? undefined}>
              {item.don_vi_de_xuat ?? txt('common.emptyCell')}
            </span>
          );
        case 'trang_thai':
          return (
            <EnumBadge
              value={item.trang_thai}
              config={trangThaiBadgeConfig}
              truncate
              shape="pill"
            />
          );
        case 'so_dong':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground">{String(item.so_dong)}</span>
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
            <MttqKhenThuongTableRowActions
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
    (item: MttqKhenThuongListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: MttqKhenThuongListRow, isSelected: boolean) => (
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
            <Award size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.so_qd}</h4>
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
                {item.ngay_khen_thuong ? formatDateShort(item.ngay_khen_thuong) : txt('common.emptyCell')}
              </span>
              {item.trang_thai ? (
                <EnumBadge value={item.trang_thai} config={trangThaiBadgeConfig} shape="pill" truncate />
              ) : null}
              {item.so_dong != null ? (
                <span className="tabular-nums shrink-0">· {item.so_dong} người</span>
              ) : null}
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <MttqKhenThuongTableRowActions
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
      emptyTitle={txt('matTranKhenThuong.emptyTitle')}
      emptyDescription={txt('matTranKhenThuong.emptyHint')}
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

export default MttqKhenThuongTable;
