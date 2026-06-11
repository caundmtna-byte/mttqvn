import React, { useState, useCallback, memo } from 'react';
import { ExternalLink, Megaphone } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { ThucHienPhanBien } from '../core/types';
import { useThucHienPhanBienStore } from '../store/useThucHienPhanBienStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import { loaiHinhBadge, tinhTrangBadge } from '../core/display-badges';
import { tinhTienDo } from '../core/display-tien-do';
import { formatTenDonViThucHien } from '../utils/display-don-vi-thuc-hien';
import { ThucHienPhanBienTableRowActions } from './thuc-hien-phan-bien-table-row-actions';

interface Props {
  data: ThucHienPhanBien[];
  isLoading: boolean;
  onEdit: (item: ThucHienPhanBien) => void;
  onDelete: (id: string) => void;
  onView?: (item: ThucHienPhanBien) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const ThucHienPhanBienTable = memo(function ThucHienPhanBienTable({
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
  } = useThucHienPhanBienStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
      if (col.id === 'actions' || col.id === 'tien_do') return null;
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
    (colId: string, item: ThucHienPhanBien) => {
      switch (colId) {
        case 'loai_hinh':
          return item.loai_hinh?.trim() ? (
            <EnumBadge value={item.loai_hinh.trim()} config={loaiHinhBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'don_vi_thuc_hien': {
          const label = formatTenDonViThucHien(item);
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label}>
              {label}
            </span>
          );
        }
        case 'noi_dung':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Megaphone size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm" title={item.noi_dung}>
                {item.noi_dung}
              </span>
            </div>
          );
        case 'tien_do': {
          const label = tinhTienDo(item.ngay_ket_thuc) ?? item.mo_ta_thoi_gian ?? txt('common.emptyCell');
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label}>
              {label}
            </span>
          );
        }
        case 'tinh_trang':
          return item.tinh_trang?.trim() ? (
            <EnumBadge value={item.tinh_trang.trim()} config={tinhTrangBadge} shape="pill" truncate />
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'ten_don_vi_chu_tri':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_don_vi_chu_tri ?? undefined}>
              {item.ten_don_vi_chu_tri ?? txt('common.emptyCell')}
            </span>
          );
        case 'so_lan_hoan_thanh':
          return (
            <span className="text-body-sm font-medium tabular-nums text-foreground">
              {item.so_lan_hoan_thanh}
            </span>
          );
        case 'so_lan_khao_sat':
          return (
            <span className="text-body-sm font-medium tabular-nums text-foreground">
              {item.so_lan_khao_sat}
            </span>
          );
        case 'phan_tram_hoan_thanh':
          return (
            <span className="text-body-sm font-medium tabular-nums text-foreground">
              {item.phan_tram_hoan_thanh}%
            </span>
          );
        case 'cap_thuc_hien':
          return <span className="text-body-sm text-muted-foreground">{item.cap_thuc_hien}</span>;
        case 'ten_doi_tuong':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_doi_tuong ?? undefined}>
              {item.ten_doi_tuong ?? txt('common.emptyCell')}
            </span>
          );
        case 'ten_hinh_thuc':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_hinh_thuc ?? undefined}>
              {item.ten_hinh_thuc ?? txt('common.emptyCell')}
            </span>
          );
        case 'ngay_bat_dau':
          return (
            <span className="text-body-sm text-muted-foreground whitespace-nowrap">
              {item.ngay_bat_dau ? formatDateShort(item.ngay_bat_dau) : txt('common.emptyCell')}
            </span>
          );
        case 'ngay_ket_thuc':
          return (
            <span className="text-body-sm text-muted-foreground whitespace-nowrap">
              {item.ngay_ket_thuc ? formatDateShort(item.ngay_ket_thuc) : txt('common.emptyCell')}
            </span>
          );
        case 'mo_ta_thoi_gian':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.mo_ta_thoi_gian ?? undefined}>
              {item.mo_ta_thoi_gian ?? txt('common.emptyCell')}
            </span>
          );
        case 'ten_phong_ban':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_phong_ban ?? undefined}>
              {item.ten_phong_ban ?? txt('common.emptyCell')}
            </span>
          );
        case 'ket_qua_kien_nghi':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ket_qua_kien_nghi ?? undefined}>
              {item.ket_qua_kien_nghi ?? txt('common.emptyCell')}
            </span>
          );
        case 'link_ket_qua':
          return item.link_ket_qua?.trim() ? (
            <a
              href={item.link_ket_qua.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Link
              <ExternalLink size={12} aria-hidden />
            </a>
          ) : (
            <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>
          );
        case 'ho_va_ten_nguoi_tao': {
          const label =
            item.ho_va_ten_nguoi_tao?.trim() || item.ten_tai_khoan_nguoi_tao?.trim() || txt('common.emptyCell');
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={label}>
              {label}
            </span>
          );
        }
        case 'tg_cap_nhat':
          return (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDateShort(item.tg_cap_nhat)}
            </span>
          );
        case 'actions':
          return (
            <ThucHienPhanBienTableRowActions
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
    (item: ThucHienPhanBien) => {
      onView?.(item);
    },
    [onView],
  );

  const renderMobileCard = useCallback(
    (item: ThucHienPhanBien, isSelected: boolean) => (
      <div
        className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{item.noi_dung}</p>
            <p className="text-xs text-muted-foreground truncate">{item.loai_hinh}</p>
          </div>
          {item.tinh_trang?.trim() ? (
            <EnumBadge value={item.tinh_trang.trim()} config={tinhTrangBadge} shape="pill" truncate />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs text-muted-foreground">
          <span>{formatTenDonViThucHien(item)}</span>
          {item.ten_don_vi_chu_tri ? <span>{item.ten_don_vi_chu_tri}</span> : null}
          <span className="tabular-nums">
            {item.so_lan_hoan_thanh}/{item.so_lan_khao_sat}
          </span>
          <span className="tabular-nums">{item.phan_tram_hoan_thanh}%</span>
        </div>
        <div className="flex justify-end">
          <ThucHienPhanBienTableRowActions
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
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
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
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
    />
  );
});

export default ThucHienPhanBienTable;
