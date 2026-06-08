import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Package, Warehouse, FolderOpen } from 'lucide-react';
import { useKhoDanhSachKhoList } from '../../danh-sach-kho/hooks/use-kho-danh-sach-kho';
import { useKhoDanhMucHangHoaList } from '../../hang-hoa/hooks/use-kho-danh-muc-hang-hoa';
import { useTonKhoDisplay } from '../hooks/use-kho-ton-kho';
import { useKhoTonKhoViewer, getViewerKhoIds } from '../hooks/use-kho-ton-kho-viewer';
import { aggregateTonKhoByProduct } from '../utils/aggregate-ton-kho-by-product';
import { exportTonKhoByProductToExcel } from '../utils/export-ton-kho';
import type { TonKhoByProductFilters, TonKhoProductAgg } from '../core/types';
import { useTonKhoByProductStore } from '../store/useTonKhoByProductStore';
import { useListWithFilter } from '@/lib/hooks';
import { getColumnCellStyle } from '@/store/createGenericStore';
import type { ColumnConfig } from '@/store/createGenericStore';
import TonKhoToolbar from './ton-kho-toolbar';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import ListPageSkeleton from '@/components/shared/ListPageSkeleton';
import TablePaginationFooter from '@/components/shared/TablePaginationFooter';
import TonKhoProductDetail from './ton-kho-product-detail';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { txt } from '@/lib/text';
import { cn, formatDecimal } from '@/lib/utils';

const TonSanPhamTab: React.FC<{
  onBack?: () => void;
  listQueryEnabled: boolean;
  waitingMatrixHydrate: boolean;
}> = ({ onBack, listQueryEnabled, waitingMatrixHydrate }) => {
  const { canExport } = useResourcePermissions('matTranReliefInventory');
  const viewer = useKhoTonKhoViewer();
  const { data: khoList = [] } = useKhoDanhSachKhoList({ enabled: listQueryEnabled });
  const viewerKhoIds = useMemo(() => getViewerKhoIds(viewer, khoList), [viewer, khoList]);
  const { data: danhMucList = [] } = useKhoDanhMucHangHoaList({ enabled: listQueryEnabled });
  const {
    data: displayRows = [],
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useTonKhoDisplay({ enabled: listQueryEnabled });
  const isListLoading = isLoading || waitingMatrixHydrate;

  const filters = useTonKhoByProductStore((s) => s.filters);
  const searchTerm = useTonKhoByProductStore((s) => s.searchTerm);
  const setSearchTerm = useTonKhoByProductStore((s) => s.setSearchTerm);
  const setFilter = useTonKhoByProductStore((s) => s.setFilter);
  const resetState = useTonKhoByProductStore((s) => s.resetState);
  const pagination = useTonKhoByProductStore((s) => s.pagination);
  const setPage = useTonKhoByProductStore((s) => s.setPage);
  const setPageSize = useTonKhoByProductStore((s) => s.setPageSize);
  const columns = useTonKhoByProductStore((s) => s.columns);
  const toggleColumn = useTonKhoByProductStore((s) => s.toggleColumn);
  const reorderColumns = useTonKhoByProductStore((s) => s.reorderColumns);
  const resetColumns = useTonKhoByProductStore((s) => s.resetColumns);

  const viewableDisplayRows = useMemo(
    () =>
      viewerKhoIds
        ? displayRows.filter((r) => viewerKhoIds.includes(String(r.kho_id)))
        : displayRows,
    [displayRows, viewerKhoIds],
  );

  const flatFiltered = useMemo(() => {
    let r = viewableDisplayRows;
    if ((filters.warehouseIds?.length ?? 0) > 0) {
      const wh = new Set(filters.warehouseIds!.map(String));
      r = r.filter((x) => wh.has(String(x.kho_id)));
    }
    if ((filters.categoryIds?.length ?? 0) > 0) {
      const cat = new Set(filters.categoryIds!.map(String));
      r = r.filter((x) => x.id_danh_muc && cat.has(String(x.id_danh_muc)));
    }
    return r;
  }, [viewableDisplayRows, filters.warehouseIds, filters.categoryIds]);

  const aggregated = useMemo(() => aggregateTonKhoByProduct(flatFiltered), [flatFiltered]);

  const filterFn = useCallback((item: TonKhoProductAgg, term: string, _f: TonKhoByProductFilters) => {
    const q = term.trim().toLowerCase();
    if (!q) return true;
    return (
      item.hang_hoa_id.toLowerCase().includes(q) ||
      item.ten_hang_hoa.toLowerCase().includes(q) ||
      (item.ten_danh_muc ?? '').toLowerCase().includes(q)
    );
  }, []);

  const filteredList = useListWithFilter(aggregated, searchTerm, filters, filterFn);

  const handleExport = useCallback(() => {
    if (filteredList.length === 0) {
      toast.warning(txt('matTranTonKho.byProduct.noExportData'));
      return;
    }
    void exportTonKhoByProductToExcel(filteredList)
      .then(() => toast.success(txt('matTranTonKho.export.success')))
      .catch(() => toast.error(txt('matTranTonKho.export.error')));
  }, [filteredList]);

  const viewableKhoList = useMemo(
    () =>
      viewerKhoIds
        ? khoList.filter((k) => viewerKhoIds.includes(k.id))
        : khoList,
    [khoList, viewerKhoIds],
  );

  const khoOptions = useMemo(
    () =>
      viewableKhoList.map((k) => ({
        value: k.id,
        label: k.ten_kho,
        count: viewableDisplayRows.filter((r) => String(r.kho_id) === String(k.id)).length || 0,
      })),
    [viewableKhoList, viewableDisplayRows]
  );

  const categoryOptions = useMemo(
    () =>
      danhMucList.map((d) => ({
        value: d.id,
        label: d.ten_danh_muc,
        count: viewableDisplayRows.filter((r) => String(r.id_danh_muc) === String(d.id)).length || 0,
      })),
    [danhMucList, viewableDisplayRows]
  );

  const activeFilterCount = (filters.warehouseIds?.length ?? 0) + (filters.categoryIds?.length ?? 0);
  const handleClearAllFilters = useCallback(() => {
    setFilter('warehouseIds', []);
    setFilter('categoryIds', []);
  }, [setFilter]);

  const filterGroups = useMemo(
    () => [
      {
        key: 'warehouseIds',
        label: txt('matTranTonKho.toolbar.warehouse'),
        icon: Warehouse,
        options: khoOptions,
        value: filters.warehouseIds ?? [],
        onChange: (val: string[]) => setFilter('warehouseIds', val),
      },
      {
        key: 'categoryIds',
        label: txt('matTranTonKho.toolbar.category'),
        icon: FolderOpen,
        options: categoryOptions,
        value: filters.categoryIds ?? [],
        onChange: (val: string[]) => setFilter('categoryIds', val),
      },
    ],
    [khoOptions, categoryOptions, filters.warehouseIds, filters.categoryIds, setFilter]
  );

  const renderFilters = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChipMultiSelect
        options={khoOptions}
        value={filters.warehouseIds ?? []}
        onChange={(val) => setFilter('warehouseIds', val)}
        placeholder={txt('matTranTonKho.toolbar.warehouse')}
        icon={Warehouse}
        className="w-full sm:w-[170px]"
        size="md"
      />
      <FilterChipMultiSelect
        options={categoryOptions}
        value={filters.categoryIds ?? []}
        onChange={(val) => setFilter('categoryIds', val)}
        placeholder={txt('matTranTonKho.toolbar.category')}
        icon={FolderOpen}
        className="w-full sm:w-[200px]"
        size="md"
      />
    </div>
  );

  useEffect(() => () => resetState(), [resetState]);

  useEffect(() => {
    setPage(1);
  }, [filteredList.length, setPage]);

  const maxPage = Math.max(1, Math.ceil(filteredList.length / pagination.pageSize));
  useEffect(() => {
    if (pagination.page > maxPage) setPage(maxPage);
  }, [pagination.page, pagination.pageSize, maxPage, setPage]);

  const visibleColumns = useMemo(
    () => columns.filter((c) => c.visible).sort((a, b) => a.order - b.order),
    [columns]
  );

  const paginatedData = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    return filteredList.slice(start, start + pagination.pageSize);
  }, [filteredList, pagination.page, pagination.pageSize]);

  const [detail, setDetail] = useState<TonKhoProductAgg | null>(null);

  const renderCell = (item: TonKhoProductAgg, col: ColumnConfig) => {
    switch (col.id) {
      case 'ma_hang':
        return (
          <td key={col.id} className="px-4 py-3" style={getColumnCellStyle(col)}>
            <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
              {item.hang_hoa_id}
            </span>
          </td>
        );
      case 'ten_hang':
        return (
          <td key={col.id} className="px-4 py-3" style={getColumnCellStyle(col)}>
            <span className="font-medium text-foreground">{item.ten_hang_hoa}</span>
          </td>
        );
      case 'ten_danh_muc':
        return (
          <td key={col.id} className="px-4 py-3 text-muted-foreground" style={getColumnCellStyle(col)}>
            {item.ten_danh_muc ?? '—'}
          </td>
        );
      case 'don_vi_tinh':
        return (
          <td key={col.id} className="px-4 py-3 text-muted-foreground" style={getColumnCellStyle(col)}>
            {item.don_vi_tinh}
          </td>
        );
      case 'so_kho_co_ton':
        return (
          <td key={col.id} className="px-4 py-3 text-right tabular-nums" style={getColumnCellStyle(col)}>
            {item.so_kho_co_ton}
          </td>
        );
      case 'tong_so_luong':
        return (
          <td key={col.id} className="px-4 py-3 text-right" style={getColumnCellStyle(col)}>
            <span className="font-medium tabular-nums">{formatDecimal(item.tong_so_luong)}</span>
          </td>
        );
      default:
        return <td key={col.id} className="px-4 py-3" style={getColumnCellStyle(col)} />;
    }
  };

  if (isError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <ErrorState
          title={txt('common.error')}
          message={error instanceof Error ? error.message : txt('matTranTonKho.listLoadErrorHint')}
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <TonKhoToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={txt('matTranTonKho.byProduct.searchPlaceholder')}
          columns={columns}
          onToggleColumn={toggleColumn}
          onReorderColumns={reorderColumns}
          onResetColumns={resetColumns}
          filters={renderFilters}
          activeFilterCount={activeFilterCount}
          onClearAllFilters={handleClearAllFilters}
          filterGroups={filterGroups}
          onExport={handleExport}
          canExport={canExport}
          showBack={Boolean(onBack)}
          onBack={onBack}
        />

        <div className="flex-1 min-h-0 flex flex-col bg-card overflow-hidden relative">
          {isFetching && !isListLoading ? (
            <div
              className="absolute inset-0 z-[25] pointer-events-none flex items-start justify-center pt-3 bg-background/30 backdrop-blur-[1px]"
              aria-busy="true"
              aria-live="polite"
            >
              <div
                className="h-6 w-6 rounded-full border-2 border-primary/35 border-t-primary animate-spin shadow-sm"
                aria-hidden
              />
            </div>
          ) : null}
          {isListLoading ? (
            <ListPageSkeleton
              loadingText={txt('common.loading')}
              tableColumns={visibleColumns.length}
              tableRowCount={8}
              tableColumnWithSubline={0}
              cardCount={0}
            />
          ) : filteredList.length === 0 ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <EmptyState
                icon={<Package size={40} className="text-muted-foreground opacity-20" />}
                title={txt('matTranTonKho.byProduct.empty')}
                description={txt('matTranTonKho.byProduct.emptyHint')}
              />
            </div>
          ) : (
            <>
              <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-muted/95 border-b border-border">
                    <tr>
                      {visibleColumns.map((col) => {
                        const isNumeric = col.id === 'tong_so_luong' || col.id === 'so_kho_co_ton';
                        return (
                          <th
                            key={col.id}
                            className={cn(
                              'px-4 py-3 font-semibold text-muted-foreground text-xs whitespace-nowrap',
                              isNumeric && 'text-right'
                            )}
                            style={getColumnCellStyle(col)}
                          >
                            {col.label}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border [&>tr:last-child>td]:border-b [&>tr:last-child>td]:border-border">
                    {paginatedData.map((item) => (
                      <tr
                        key={item.hang_hoa_id}
                        className="group hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => setDetail(item)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') setDetail(item);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {visibleColumns.map((col) => renderCell(item, col))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="shrink-0 border-t border-border bg-muted/30">
                <TablePaginationFooter
                  totalRecords={filteredList.length}
                  page={pagination.page}
                  pageSize={pagination.pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  selectedCount={0}
                  recordsLabel={txt('matTranTonKho.records')}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {detail && <TonKhoProductDetail agg={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};

export default TonSanPhamTab;
