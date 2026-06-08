import React, { memo, useCallback, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateShort, formatCurrency } from '@/lib/utils';
import { formatTenDonViCongTacDisplay } from '@/lib/format-ten-don-vi-cap-quan-ly';
import {
  ColumnHeaderFilter,
  ColumnHeaderSortMenu,
  ColumnHeaderSearch,
} from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import type { MttqTangLuongListRow } from '../core/types';
import { useMttqTangLuongStore } from '../store/useMttqTangLuongStore';
import { getTangLuongLoaiKyBadgeConfig, formatNgachBacLabel } from '../utils/display-format';
import { MttqTangLuongTableRowActions } from './mttq-tang-luong-table-row-actions';
import { useTangLuongChipOptions } from '../hooks/use-tang-luong-chip-options';

interface Props {
  data: MttqTangLuongListRow[];
  /** Dòng nguồn cho filter header cột (trước client filter); mặc định = `data`. */
  optionRows?: MttqTangLuongListRow[];
  isLoading: boolean;
  onView: (item: MttqTangLuongListRow) => void;
  onEdit: (item: MttqTangLuongListRow) => void;
  onDelete: (item: MttqTangLuongListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const loaiKyBadge = getTangLuongLoaiKyBadgeConfig();
const ec = txt('common.emptyCell');

const MttqTangLuongTable = memo(function MttqTangLuongTable({
  data,
  optionRows,
  isLoading,
  onView,
  onEdit,
  onDelete,
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
    searchTerm,
  } = useMttqTangLuongStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const headerChipOptions = useTangLuongChipOptions(optionRows ?? data, searchTerm, filters);
  const chucVuHeaderOptions = headerChipOptions.chucVu;
  const donViHeaderOptions = headerChipOptions.donVi;

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      if (col.id === 'actions') return null;
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
        case 'ten_chuc_vu':
          return (
            <ColumnHeaderFilter
              options={chucVuHeaderOptions}
              value={filters.chuc_vu_id ?? []}
              onChange={(v) => setFilter('chuc_vu_id', v)}
              ariaLabel={txt('matTranTangLuong.store.chucVuCol')}
              sortColumnId="ten_chuc_vu"
              sort={sort}
              setSort={setSort}
              columnSearch={columnSearchEl}
              columnSearchActive={Boolean(cs[col.id]?.trim())}
            />
          );
        case 'ten_don_vi':
          return (
            <ColumnHeaderFilter
              options={donViHeaderOptions}
              value={filters.don_vi_id ?? []}
              onChange={(v) => setFilter('don_vi_id', v)}
              ariaLabel={txt('matTranTangLuong.store.donViCol')}
              sortColumnId="ten_don_vi"
              sort={sort}
              setSort={setSort}
              columnSearch={columnSearchEl}
              columnSearchActive={Boolean(cs[col.id]?.trim())}
            />
          );
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
    [chucVuHeaderOptions, donViHeaderOptions, filters.chuc_vu_id, filters.don_vi_id, filters.columnSearch, setFilter, setSort, sort],
  );

  const renderCell = useCallback(
    (colId: string, item: MttqTangLuongListRow) => {
      switch (colId) {
        case 'ngay_nang_luong':
          return (
            <span className="text-sm tabular-nums whitespace-nowrap" title={item.ngay_nang_luong}>
              {formatDateShort(item.ngay_nang_luong)}
            </span>
          );
        case 'ho_ten_can_bo':
          return (
            <span className="text-sm font-medium truncate block min-w-0" title={item.ho_ten_can_bo}>
              {item.ho_ten_can_bo}
            </span>
          );
        case 'ten_chuc_vu':
          return (
            <span className="text-sm text-muted-foreground truncate block min-w-0" title={item.ten_chuc_vu ?? undefined}>
              {item.ten_chuc_vu?.trim() || ec}
            </span>
          );
        case 'ten_don_vi': {
          const display = formatTenDonViCongTacDisplay(item.chuc_vu_cap_quan_ly, item.ten_don_vi);
          return (
            <span className="text-sm text-muted-foreground truncate block min-w-0" title={display}>
              {display}
            </span>
          );
        }
        case 'loai_ky':
          return <EnumBadge value={item.loai_ky} config={loaiKyBadge} truncate />;
        case 'ten_ngach_moi':
          return (
            <span className="text-sm truncate block" title={formatNgachBacLabel(item.ten_ngach_moi, item.ma_bac_moi)}>
              {formatNgachBacLabel(item.ten_ngach_moi, item.ma_bac_moi)}
            </span>
          );
        case 'luong':
          return (
            <span className="text-sm tabular-nums text-foreground whitespace-nowrap text-right block w-full" title={formatCurrency(item.luong)}>
              {item.luong > 0 ? formatCurrency(item.luong) : '—'}
            </span>
          );
        case 'ten_ngach_cu':
          return (
            <span className="text-sm text-muted-foreground truncate block" title={formatNgachBacLabel(item.ten_ngach_cu, item.ma_bac_cu)}>
              {formatNgachBacLabel(item.ten_ngach_cu, item.ma_bac_cu)}
            </span>
          );
        case 'ghi_chu':
          return (
            <span className="text-xs text-muted-foreground line-clamp-2" title={item.ghi_chu ?? ''}>
              {item.ghi_chu?.trim() || '—'}
            </span>
          );
        case 'actions':
          return (
            <MttqTangLuongTableRowActions
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
    [onDelete, onEdit, rowMenuOpenId],
  );

  const handleRowClick = useCallback((item: MttqTangLuongListRow) => onView(item), [onView]);

  const renderMobileCard = useCallback(
    (item: MttqTangLuongListRow, isSelected: boolean) => (
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
            <TrendingUp size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ho_ten_can_bo}</h4>
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
              <span className="tabular-nums shrink-0">{formatDateShort(item.ngay_nang_luong)}</span>
              <EnumBadge value={item.loai_ky} config={loaiKyBadge} shape="pill" truncate />
            </div>
            <p className="text-xs text-muted-foreground truncate">
              {[item.ten_chuc_vu, formatTenDonViCongTacDisplay(item.chuc_vu_cap_quan_ly, item.ten_don_vi)]
                .filter((s) => s && s !== ec && s !== '-')
                .join(' · ')}
            </p>
            <p className="text-xs text-muted-foreground truncate mt-1">
              {formatNgachBacLabel(item.ten_ngach_moi, item.ma_bac_moi)}
              {item.luong > 0 ? ` · ${formatCurrency(item.luong)}` : ''}
            </p>
            <div className="flex justify-end pt-2 border-t border-border mt-2">
              <MttqTangLuongTableRowActions
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
    [handleRowClick, onDelete, onEdit, rowMenuOpenId, toggleSelection],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('matTranTangLuong.emptyTitle')}
      emptyDescription={emptyDescription ?? txt('matTranTangLuong.emptyHint')}
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
      onRowClick={handleRowClick}
      keyExtractor={(item) => item.id}
      onResizeColumn={resizeColumn}
      stickyLeftCount={2}
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
      listBreakpoint="sm"
      renderMobileCard={renderMobileCard}
    />
  );
});

export default MttqTangLuongTable;
