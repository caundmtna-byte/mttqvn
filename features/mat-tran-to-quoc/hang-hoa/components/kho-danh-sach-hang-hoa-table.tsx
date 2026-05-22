import React, { useState, useCallback, useMemo, memo } from 'react';
import { Package } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { KhoDanhSachHangHoaListRow } from '../core/types';
import { useKhoDanhSachHangHoaStore } from '../store/useKhoDanhSachHangHoaStore';
import GenericTable from '@/components/shared/GenericTable';
import { formatDateTimeShort } from '@/lib/utils';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge from '@/components/ui/EnumBadge';
import type { BadgeConfig } from '@/components/ui/EnumBadge';
import { KhoDanhSachHangHoaTableRowActions } from './kho-danh-sach-hang-hoa-table-row-actions';

interface Props {
  data: KhoDanhSachHangHoaListRow[];
  isLoading: boolean;
  onEdit: (item: KhoDanhSachHangHoaListRow) => void;
  onDelete: (id: string) => void;
  onView?: (item: KhoDanhSachHangHoaListRow) => void;
}

const KhoDanhSachHangHoaTable = memo(function KhoDanhSachHangHoaTable({
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
  } = useKhoDanhSachHangHoaStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const trangThaiBadge = useMemo((): BadgeConfig<string> => {
    return {
      'Đang hoạt động': { label: txt('position.active'), color: 'emerald' },
      'Ngừng hoạt động': { label: txt('position.inactive'), color: 'slate' },
    };
  }, []);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
      const skipMoTa = filters.mo_ta_bucket === 'has' || filters.mo_ta_bucket === 'empty';
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
          columnSearchActive={Boolean(!skipMoTa && cs[col.id]?.trim())}
        />
      );
    },
    [filters.columnSearch, filters.mo_ta_bucket, setFilter, setSort, sort],
  );

  const renderCell = useCallback(
    (colId: string, item: KhoDanhSachHangHoaListRow) => {
      switch (colId) {
        case 'ten_danh_muc_nhom':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.ten_danh_muc_nhom}>
              {item.ten_danh_muc_nhom || txt('common.emptyCell')}
            </span>
          );
        case 'ten_hang_hoa':
          return (
            <div className="flex min-w-0 items-center gap-2">
              <Package size={14} className="shrink-0 text-primary/70" aria-hidden />
              <span className="truncate font-semibold text-foreground text-sm">{item.ten_hang_hoa}</span>
            </div>
          );
        case 'don_vi_tinh':
          return <span className="text-body-sm tabular-nums">{item.don_vi_tinh}</span>;
        case 'quy_cach':
          return (
            <span className="text-body-sm text-muted-foreground truncate" title={item.quy_cach ?? undefined}>
              {item.quy_cach ?? txt('common.emptyCell')}
            </span>
          );
        case 'mo_ta':
          return (
            <span className="text-body-sm text-muted-foreground truncate max-w-[min(280px,50vw)]" title={item.mo_ta ?? undefined}>
              {item.mo_ta ?? txt('common.emptyCell')}
            </span>
          );
        case 'thu_tu':
          return <span className="text-sm font-medium text-muted-foreground tabular-nums">{item.thu_tu}</span>;
        case 'trang_thai':
          return <EnumBadge value={item.trang_thai} config={trangThaiBadge} shape="pill" truncate />;
        case 'tg_cap_nhat':
          return (
            <span className="text-xs tabular-nums text-muted-foreground whitespace-nowrap">
              {item.tg_cap_nhat ? formatDateTimeShort(item.tg_cap_nhat) : txt('common.emptyCell')}
            </span>
          );
        case 'actions':
          return (
            <KhoDanhSachHangHoaTableRowActions
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
    [onEdit, onDelete, rowMenuOpenId, trangThaiBadge],
  );

  const handleRowClick = useCallback(
    (item: KhoDanhSachHangHoaListRow) => {
      (onView ?? onEdit)(item);
    },
    [onView, onEdit],
  );

  const renderMobileCard = useCallback(
    (item: KhoDanhSachHangHoaListRow, isSelected: boolean) => (
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
            <Package size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-1">
              <h4 className="font-semibold text-foreground truncate">{item.ten_hang_hoa}</h4>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(item.id)}
                onClick={(e) => e.stopPropagation()}
                aria-label={txt('common.select')}
                className="w-5 h-5 rounded border-border text-primary accent-primary"
              />
            </div>
            <p className="text-xs text-muted-foreground m-0 truncate">
              {item.ten_danh_muc_nhom} · {item.don_vi_tinh}
              {item.quy_cach ? ` · ${item.quy_cach}` : ''}
            </p>
            {item.mo_ta ? <p className="text-xs text-muted-foreground mt-1 line-clamp-2 m-0">{item.mo_ta}</p> : null}
            <div className="flex justify-end pt-2 border-t border-border">
              <KhoDanhSachHangHoaTableRowActions
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
    [handleRowClick, onEdit, onDelete, rowMenuOpenId, toggleSelection],
  );

  return (
    <GenericTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      loadingText={txt('common.loadingData')}
      emptyTitle={txt('matTranHangHoa.emptyHang')}
      emptyDescription={txt('matTranKhoDanhSach.emptyHint')}
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

export default KhoDanhSachHangHoaTable;
