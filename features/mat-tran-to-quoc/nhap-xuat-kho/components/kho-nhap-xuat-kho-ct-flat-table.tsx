import React, { useCallback, useMemo, memo } from 'react';
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  FileText,
  Package,
  Warehouse,
} from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatCurrency, formatDateShort, formatDecimal } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge, { type BadgeConfig } from '@/components/ui/EnumBadge';
import type { NhapXuatKhoCtFlatRow } from '../core/types';
import type { NhapXuatKhoLoaiPhieu } from '../core/constants';
import { useNhapXuatKhoCtFlatStore } from '../store/useNhapXuatKhoCtFlatStore';

interface Props {
  data: NhapXuatKhoCtFlatRow[];
  isLoading: boolean;
  onView?: (item: NhapXuatKhoCtFlatRow) => void;
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

const NhapXuatKhoCtFlatTable = memo(function NhapXuatKhoCtFlatTable({
  data,
  isLoading,
  onView,
  emptyTitle,
  emptyDescription,
}: Props) {
  const {
    columns,
    pagination,
    setPage,
    setPageSize,
    sort,
    setSort,
    resizeColumn,
    filters,
    setFilter,
  } = useNhapXuatKhoCtFlatStore();

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
      const skipChip =
        (col.id === 'loai_phieu' && filters.loai_phieu != null) ||
        (col.id === 'ten_hang_hoa' && filters.hang_hoa_id != null);
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
          columnSearchActive={Boolean(!skipChip && cs[col.id]?.trim())}
        />
      );
    },
    [filters.columnSearch, filters.loai_phieu, filters.hang_hoa_id, setFilter, setSort, sort],
  );

  const renderCell = useCallback(
    (colId: string, item: NhapXuatKhoCtFlatRow) => {
      const Icon = loaiPhieuIcon(item.loai_phieu);
      switch (colId) {
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
        case 'ten_hang_hoa':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Package size={12} className="shrink-0 text-muted-foreground/70" aria-hidden />
              <span className="truncate text-sm text-foreground">
                {item.ten_hang_hoa ?? `#${item.hang_hoa_id}`}
              </span>
            </div>
          );
        case 'don_vi_tinh':
          return <span className="text-sm text-foreground whitespace-nowrap">{item.don_vi_tinh}</span>;
        case 'so_luong':
          return (
            <span className="text-sm tabular-nums font-medium text-foreground whitespace-nowrap">
              {formatDecimal(item.so_luong)}
            </span>
          );
        case 'don_gia':
          return (
            <span className="text-sm tabular-nums text-muted-foreground whitespace-nowrap">
              {item.don_gia > 0 ? formatCurrency(item.don_gia) : txt('common.emptyCell')}
            </span>
          );
        case 'thanh_tien':
          return (
            <span className="text-sm tabular-nums font-semibold text-foreground whitespace-nowrap">
              {item.thanh_tien > 0 ? formatCurrency(item.thanh_tien) : txt('common.emptyCell')}
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
        case 'ghi_chu':
          return (
            <span
              className="text-body-sm text-muted-foreground truncate max-w-[min(320px,50vw)]"
              title={item.ghi_chu ?? undefined}
            >
              {item.ghi_chu ?? txt('common.emptyCell')}
            </span>
          );
        default:
          return null;
      }
    },
    [loaiBadge],
  );

  const handleRowClick = useCallback(
    (item: NhapXuatKhoCtFlatRow) => {
      onView?.(item);
    },
    [onView],
  );

  const renderMobileCard = useCallback(
    (item: NhapXuatKhoCtFlatRow) => {
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
          className="bg-card rounded-xl border border-border p-4 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Icon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1 gap-2">
                <h4 className="font-semibold text-foreground truncate">{item.ten_hang_hoa ?? `#${item.hang_hoa_id}`}</h4>
                <span className="text-sm tabular-nums font-medium whitespace-nowrap">
                  {formatDecimal(item.so_luong)} {item.don_vi_tinh}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <EnumBadge value={item.loai_phieu} config={loaiBadge} shape="pill" truncate />
                <span className="tabular-nums">{item.so_phieu}</span>
                {item.ngay_phieu ? <span>· {formatDateShort(item.ngay_phieu)}</span> : null}
              </div>
              {item.ten_kho_xuat || item.ten_kho_nhap ? (
                <p className="text-xs text-muted-foreground m-0 truncate">
                  {item.ten_kho_xuat ?? '—'} → {item.ten_kho_nhap ?? '—'}
                </p>
              ) : null}
              {item.thanh_tien > 0 ? (
                <p className="text-xs tabular-nums text-foreground font-medium m-0 mt-1">
                  {txt('matTranNhapXuatKho.store.thanhTienCol')}: {formatCurrency(item.thanh_tien)}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      );
    },
    [handleRowClick, loaiBadge],
  );

  const noopSelectedIds = useMemo<Set<string>>(() => new Set(), []);

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={emptyTitle ?? txt('matTranNhapXuatKho.emptyTitleCt')}
      emptyDescription={emptyDescription ?? txt('matTranNhapXuatKho.emptyHintCt')}
      selectedIds={noopSelectedIds}
      onToggleSelection={() => undefined}
      onToggleAll={() => undefined}
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
      stickyLeftCount={1}
      renderColumnHeaderAccessory={renderColumnHeaderAccessory}
      hideSortOnColumnLabel
    />
  );
});

export default NhapXuatKhoCtFlatTable;
