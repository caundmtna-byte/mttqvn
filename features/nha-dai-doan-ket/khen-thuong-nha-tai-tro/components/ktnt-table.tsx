import React, { useState, useCallback, memo } from 'react';
import { Award } from 'lucide-react';
import { txt } from '@/lib/text';
import type { ColumnConfig } from '@/store/createGenericStore';
import type { KhenThuongNhaTaiTro } from '../core/types';
import { useKhenThuongNhaTaiTroStore } from '../store/useKhenThuongNhaTaiTroStore';
import GenericTable from '@/components/shared/GenericTable';
import { ColumnHeaderSortMenu, ColumnHeaderSearch } from '@/components/shared/column-header';
import EnumBadge, { type BadgeConfig } from '@/components/ui/EnumBadge';
import { ktntCapKhenBadge, ktntTrangThaiBadge } from '../core/display-badges';
import { getKtntColumnDisplayValue } from '../utils/column-display';
import { KtntTableRowActions } from './ktnt-table-row-actions';

interface Props {
  data: KhenThuongNhaTaiTro[];
  isLoading: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (item: KhenThuongNhaTaiTro) => void;
  onDelete: (id: string) => void;
  onView?: (item: KhenThuongNhaTaiTro) => void;
  emptyTitle?: string;
  serverSidePagination?: boolean;
  serverTotalRecords?: number | null;
  serverHasNextPage?: boolean;
}

const BADGE_COLUMNS: Record<string, BadgeConfig> = {
  cap_khen: ktntCapKhenBadge,
  trang_thai: ktntTrangThaiBadge,
};

/** Cột số / tiền — căn phải, chữ số đều. */
const NUMERIC_COLUMNS = new Set([
  'so_khoan_ho_tro',
  'so_nguoi_duoc_ho_tro',
  'tong_tien_ho_tro',
  'tong_gia_tri',
]);

const DATE_COLUMNS = new Set(['ngay_khen', 'ngay_cap_nhat_trang_thai', 'tg_cap_nhat']);

function Badge({ value, config }: { value: string | null | undefined; config: BadgeConfig }) {
  const v = value?.trim();
  if (!v) return <span className="text-body-sm text-muted-foreground">{txt('common.emptyCell')}</span>;
  return <EnumBadge value={v} config={config} shape="pill" truncate />;
}

const KtntTable = memo(function KtntTable({
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
  } = useKhenThuongNhaTaiTroStore();
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) => {
      const cs = filters.columnSearch;
      if (col.id === 'actions') return null;
      return (
        <ColumnHeaderSortMenu
          ariaLabel={col.label}
          sortColumnId={col.id}
          sort={sort}
          setSort={setSort}
          columnSearch={
            <ColumnHeaderSearch
              variant="inDropdown"
              value={cs[col.id] ?? ''}
              onChange={(v) => setFilter('columnSearch', { ...cs, [col.id]: v })}
              ariaLabel={`${col.label} — ${txt('common.search')}`}
            />
          }
          columnSearchActive={Boolean(cs[col.id]?.trim())}
        />
      );
    },
    [filters.columnSearch, setFilter, setSort, sort],
  );

  const renderCell = useCallback(
    (colId: string, item: KhenThuongNhaTaiTro) => {
      const empty = txt('common.emptyCell');
      if (BADGE_COLUMNS[colId]) {
        return (
          <Badge
            value={(item as unknown as Record<string, string | null>)[colId]}
            config={BADGE_COLUMNS[colId]}
          />
        );
      }
      if (colId === 'actions') {
        return (
          <KtntTableRowActions
            item={item}
            menuOpenId={rowMenuOpenId}
            onMenuOpenChange={setRowMenuOpenId}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      }
      if (colId === 'ten_nha_tai_tro') {
        return (
          <div className="flex min-w-0 items-center gap-2">
            <Award size={14} className="shrink-0 text-primary/70" aria-hidden />
            <span
              className="truncate font-semibold text-foreground text-sm tracking-tight"
              title={item.ten_nha_tai_tro ?? undefined}
            >
              {item.ten_nha_tai_tro || empty}
            </span>
          </div>
        );
      }
      const label = getKtntColumnDisplayValue(item, colId);
      if (NUMERIC_COLUMNS.has(colId)) {
        return (
          <span className="block text-right text-body-sm font-medium tabular-nums text-foreground whitespace-nowrap">
            {label || empty}
          </span>
        );
      }
      if (DATE_COLUMNS.has(colId)) {
        return (
          <span className="text-body-sm tabular-nums text-muted-foreground whitespace-nowrap">
            {label || empty}
          </span>
        );
      }
      return (
        <span className="text-body-sm text-muted-foreground truncate" title={label || undefined}>
          {label || empty}
        </span>
      );
    },
    [onEdit, onDelete, rowMenuOpenId],
  );

  const handleRowClick = useCallback((item: KhenThuongNhaTaiTro) => onView?.(item), [onView]);

  const renderMobileCard = useCallback(
    (item: KhenThuongNhaTaiTro, isSelected: boolean) => (
      <div
        className={`rounded-lg border p-3 space-y-2 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate tracking-tight">{item.ten_nha_tai_tro}</p>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.noi_dung_khen}</p>
          </div>
          <Badge value={item.trang_thai} config={ktntTrangThaiBadge} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="tabular-nums">{getKtntColumnDisplayValue(item, 'ngay_khen')}</span>
          <Badge value={item.cap_khen} config={ktntCapKhenBadge} />
          {item.tong_gia_tri > 0 ? (
            <span className="tabular-nums font-medium text-foreground">
              {getKtntColumnDisplayValue(item, 'tong_gia_tri')}
            </span>
          ) : null}
        </div>
        <div className="flex justify-end">
          <KtntTableRowActions
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

export default KtntTable;
