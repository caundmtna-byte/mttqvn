import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Building2,
  Calendar,
  FileText,
  HandHeart,
  Warehouse,
} from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge, { type BadgeConfig } from '@/components/ui/EnumBadge';
import type { NhapXuatKhoListRow } from '../core/types';
import type { NhapXuatKhoLoaiPhieu } from '../core/constants';
import { useNhapXuatKhoStore } from '../store/useNhapXuatKhoStore';
import { NhapXuatKhoTableRowActions } from './kho-nhap-xuat-kho-table-row-actions';

interface Props {
  data: NhapXuatKhoListRow[];
  isLoading: boolean;
  onEdit: (item: NhapXuatKhoListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: NhapXuatKhoListRow) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

function loaiPhieuIcon(loai: NhapXuatKhoLoaiPhieu) {
  switch (loai) {
    case 'nhap_ngoai':
      return ArrowDownToLine;
    case 'xuat_ngoai':
      return ArrowUpFromLine;
    case 'chuyen_kho':
      return ArrowLeftRight;
  }
}

const NhapXuatKhoTable = memo(function NhapXuatKhoTable({
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
  } = useNhapXuatKhoStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const loaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      nhap_ngoai: { label: txt('matTranNhapXuatKho.loaiPhieu.nhap_ngoai'), color: 'emerald' },
      xuat_ngoai: { label: txt('matTranNhapXuatKho.loaiPhieu.xuat_ngoai'), color: 'rose' },
      chuyen_kho: { label: txt('matTranNhapXuatKho.loaiPhieu.chuyen_kho'), color: 'sky' },
    };
  }, []);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
      const skipChip = col.id === 'loai_phieu' && filters.loai_phieu != null;
      const columnSearchEl = (
        <ColumnHeaderSearch
          variant="inDropdown"
          value={cs[col.id] ?? ''}
          onChange={(v) => setFilter('columnSearch', { ...cs, [col.id]: v })}
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
          columnSearchActive={Boolean(!skipChip && cs[col.id]?.trim())}
        />
      );
    },
    [filters.columnSearch, filters.loai_phieu, setFilter, setSort, sort],
  );

  const renderCell = useCallback(
    (colId: string, item: NhapXuatKhoListRow) => {
      const Icon = loaiPhieuIcon(item.loai_phieu);
      switch (colId) {
        case 'tt':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">{item.tt}</span>
          );
        case 'so_phieu':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <FileText size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm tabular-nums">{item.so_phieu}</span>
            </div>
          );
        case 'loai_phieu':
          return (
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <Icon size={14} className="shrink-0 text-muted-foreground/70" aria-hidden />
              <EnumBadge value={item.loai_phieu} config={loaiBadge} shape="pill" truncate />
            </span>
          );
        case 'ngay_phieu':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.ngay_phieu ? formatDateShort(item.ngay_phieu) : txt('common.emptyCell')}
            </span>
          );
        case 'ten_kho_xuat':
          return item.ten_kho_xuat ? (
            <div className="flex min-w-0 items-center gap-2">
              <Warehouse size={12} className="shrink-0 text-muted-foreground/70" aria-hidden />
              <span className="truncate text-sm text-foreground">{item.ten_kho_xuat}</span>
            </div>
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'ten_kho_nhap':
          return item.ten_kho_nhap ? (
            <div className="flex min-w-0 items-center gap-2">
              <Warehouse size={12} className="shrink-0 text-muted-foreground/70" aria-hidden />
              <span className="truncate text-sm text-foreground">{item.ten_kho_nhap}</span>
            </div>
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'ten_don_vi_cuu_tro':
          return item.ten_don_vi_cuu_tro ? (
            <div className="flex min-w-0 items-center gap-2">
              <Building2 size={12} className="shrink-0 text-muted-foreground/70" aria-hidden />
              <span className="truncate text-sm text-foreground">{item.ten_don_vi_cuu_tro}</span>
            </div>
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'ten_dot_cuu_tro':
          return item.ten_dot_cuu_tro ? (
            <div className="flex min-w-0 items-center gap-2">
              <HandHeart size={12} className="shrink-0 text-muted-foreground/70" aria-hidden />
              <span className="truncate text-sm text-foreground">{item.ten_dot_cuu_tro}</span>
            </div>
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'so_dong':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">{item.so_dong}</span>
          );
        case 'tg_cap_nhat':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_cap_nhat ? formatDateTimeShort(item.tg_cap_nhat) : txt('common.emptyCell')}
            </span>
          );
        case 'actions':
          return (
            <NhapXuatKhoTableRowActions
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
    [loaiBadge, onDelete, onEdit, rowMenuOpenId],
  );

  const handleRowClick = useCallback(
    (item: NhapXuatKhoListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: NhapXuatKhoListRow, isSelected: boolean) => {
      const Icon = loaiPhieuIcon(item.loai_phieu);
      return (
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
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1 gap-2">
                <h4 className="font-semibold text-foreground truncate tabular-nums">{item.so_phieu}</h4>
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelection(item.id)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={txt('common.select')}
                  className="w-5 h-5 rounded border-border text-primary accent-primary shrink-0"
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <EnumBadge value={item.loai_phieu} config={loaiBadge} shape="pill" truncate />
                {item.ngay_phieu ? (
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} aria-hidden />
                    {formatDateShort(item.ngay_phieu)}
                  </span>
                ) : null}
                <span>· {item.so_dong} dòng</span>
              </div>
              {item.ten_kho_xuat || item.ten_kho_nhap ? (
                <p className="text-xs text-muted-foreground m-0 truncate">
                  {item.ten_kho_xuat ?? '—'} → {item.ten_kho_nhap ?? '—'}
                </p>
              ) : null}
              {item.ten_don_vi_cuu_tro ? (
                <p className="text-xs text-muted-foreground m-0 truncate">
                  {txt('matTranNhapXuatKho.store.donViCuuTroCol')}: {item.ten_don_vi_cuu_tro}
                </p>
              ) : null}
              {item.ten_dot_cuu_tro ? (
                <p className="text-xs text-muted-foreground m-0 truncate">
                  {txt('matTranNhapXuatKho.store.dotCuuTroCol')}: {item.ten_dot_cuu_tro}
                </p>
              ) : null}
              <div className="flex justify-end pt-2 border-t border-border">
                <NhapXuatKhoTableRowActions
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
      );
    },
    [handleRowClick, loaiBadge, onDelete, onEdit, rowMenuOpenId, toggleSelection],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('matTranNhapXuatKho.emptyTitleList')}
      emptyDescription={emptyDescription ?? txt('matTranNhapXuatKho.emptyHintList')}
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

export default NhapXuatKhoTable;
