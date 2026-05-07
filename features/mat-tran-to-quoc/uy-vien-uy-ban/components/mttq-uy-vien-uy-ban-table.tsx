import React, { useState, useCallback, useMemo, memo } from 'react';
import { Users } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { Option } from '@/components/ui/MultiSelect';
import type { MttqUyVienUyBanListRow } from '../core/types';
import { useMttqUyVienUyBanStore } from '../store/useMttqUyVienUyBanStore';
import GenericTable from '@/components/shared/GenericTable';
import EnumBadge from '@/components/ui/EnumBadge';
import { formatDateTimeShort } from '@/lib/utils';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import { MttqUyVienUyBanTableRowActions } from './mttq-uy-vien-uy-ban-table-row-actions';
import { donViDisplayLabel } from '../utils/column-search';
import {
  formatUyVienListDate,
  formatUyVienMaUvDisplay,
  getUyVienTrangThamGiaBadgeConfig,
} from '../utils/display-format';

export interface MttqUyVienUyBanHeaderOption {
  value: string;
  label: string;
  count?: number;
}

interface Props {
  data: MttqUyVienUyBanListRow[];
  isLoading: boolean;
  nhiemKyHeaderOptions: MttqUyVienUyBanHeaderOption[];
  donViHeaderOptions: MttqUyVienUyBanHeaderOption[];
  onEdit: (item: MttqUyVienUyBanListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: MttqUyVienUyBanListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
}

const MttqUyVienUyBanTable = memo(function MttqUyVienUyBanTable({
  data,
  isLoading,
  nhiemKyHeaderOptions,
  donViHeaderOptions,
  onEdit,
  onDelete,
  onView,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: Props) {
  const tinhCap = txt('matTranUyVienUyBan.tinhCap');
  const emptyCell = txt('common.emptyCell');
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
  } = useMttqUyVienUyBanStore();
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
      setFilter,
      setSort,
      sort,
      nhiemKyMultiOptions,
      donViMultiOptions,
    ],
  );

  const renderCell = useCallback(
    (colId: string, item: MttqUyVienUyBanListRow) => {
      switch (colId) {
        case 'ho_va_ten':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Users size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.ho_va_ten}</span>
            </div>
          );
        case 'ma_uv': {
          const disp = formatUyVienMaUvDisplay(item.ma_uv);
          return (
            <span className="font-mono tabular-nums text-body-sm text-muted-foreground tracking-tight">
              {disp || emptyCell}
            </span>
          );
        }
        case 'ngay_sinh':
          return (
            <span className="text-body-sm tabular-nums text-muted-foreground whitespace-nowrap">
              {formatUyVienListDate(item.ngay_sinh, emptyCell)}
            </span>
          );
        case 'ten_nhiem_ky':
          return (
            <span className="truncate font-semibold text-foreground text-sm tracking-tight">{item.ten_nhiem_ky}</span>
          );
        case 'ten_don_vi':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={donViDisplayLabel(item, tinhCap)}>
              {donViDisplayLabel(item, tinhCap)}
            </span>
          );
        case 'chuc_vu_don_vi':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.chuc_vu_don_vi ?? undefined}>
              {item.chuc_vu_don_vi ?? emptyCell}
            </span>
          );
        case 'trang_thai_tham_gia': {
          const raw = item.trang_thai_tham_gia?.trim();
          if (!raw) return <span className="text-body-sm text-muted-foreground">{emptyCell}</span>;
          return (
            <EnumBadge
              value={raw}
              config={getUyVienTrangThamGiaBadgeConfig()}
              fallbackLabel={raw}
              truncate
              className="max-w-full"
            />
          );
        }
        case 'ho_va_ten_nguoi_tao':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ho_va_ten_nguoi_tao ?? undefined}>
              {item.ho_va_ten_nguoi_tao ?? emptyCell}
            </span>
          );
        case 'tg_cap_nhat':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_cap_nhat ? formatDateTimeShort(item.tg_cap_nhat) : emptyCell}
            </span>
          );
        case 'actions':
          return (
            <MttqUyVienUyBanTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, tinhCap, emptyCell],
  );

  const handleRowClick = useCallback(
    (item: MttqUyVienUyBanListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: MttqUyVienUyBanListRow, isSelected: boolean) => (
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
            <Users size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ho_va_ten}</h4>
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
              <span className="truncate max-w-full">{item.ten_nhiem_ky}</span>
              <span className="truncate max-w-full">{donViDisplayLabel(item, tinhCap)}</span>
              {(() => {
                const m = formatUyVienMaUvDisplay(item.ma_uv);
                const d = formatUyVienListDate(item.ngay_sinh, '');
                const bits = [m, d].filter(Boolean);
                return bits.length ? (
                  <span className="font-mono tabular-nums tracking-tight">{bits.join(' · ')}</span>
                ) : null;
              })()}
            </div>
            <div className="flex justify-end pt-2 border-t border-border">
              <MttqUyVienUyBanTableRowActions
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
      emptyTitle={emptyTitle ?? txt('matTranUyVienUyBan.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('matTranUyVienUyBan.emptyHint')}
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

export default MttqUyVienUyBanTable;
