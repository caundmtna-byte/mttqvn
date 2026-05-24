import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Package, Warehouse, FolderOpen } from 'lucide-react';
import { useKhoList } from '../../../kho-van/danh-sach-kho/hooks/use-kho';
import { useFarmDanhMucCap2WithParent } from '../../hang-hoa-phan-thuoc/hooks/use-farm-danh-muc';
import { useFarmTonKhoPTDisplay } from '../hooks/use-farm-ton-kho-pt';
import { aggregateTonKhoPTByProduct } from '../utils/aggregate-ton-kho-pt-by-product';
import { exportTonKhoPTByProductToExcel } from '../utils/export-ton-kho-pt';
import type { TonKhoPTProductAgg } from '../core/types';
import type { TonKhoFilters } from '../../../kho-van/ton-kho/store/useTonKhoStore';
import { useTonKhoPTByProductStore } from '../store/useTonKhoPTByProductStore';
import { useSearchInputCommit } from '../../../../lib/hooks/use-search-input-commit';
import { useListWithFilter } from '../../../../lib/hooks';
import { getColumnCellStyle } from '../../../../store/createGenericStore';
import type { ColumnConfig } from '../../../../store/createGenericStore';
import TonKhoToolbar from '../../../kho-van/ton-kho/components/TonKhoToolbar';
import FilterChipMultiSelect from '../../../../components/shared/FilterChipMultiSelect';
import EmptyState from '../../../../components/shared/EmptyState';
import ListPageSkeleton from '../../../../components/shared/ListPageSkeleton';
import TablePaginationFooter from '../../../../components/shared/TablePaginationFooter';
import TonKhoPTProductDetail from './TonKhoPTProductDetail';
import { cn, formatNumberVN } from '../../../../lib/utils';

const TonSanPhamPTTab: React.FC = () => {
  const { t } = useTranslation();
  const { data: khoList = [] } = useKhoList();
  const { data: danhMucCap2 = [] } = useFarmDanhMucCap2WithParent();
  const { data: displayRows = [], isLoading, isFetching } = useFarmTonKhoPTDisplay();

  const searchTerm = useTonKhoPTByProductStore((s) => s.searchTerm);
  const commitSearchTerm = useTonKhoPTByProductStore((s) => s.commitSearchTerm);
  const filters = useTonKhoPTByProductStore((s) => s.filters);
  const setFilter = useTonKhoPTByProductStore((s) => s.setFilter);
  const resetState = useTonKhoPTByProductStore((s) => s.resetState);
  const pagination = useTonKhoPTByProductStore((s) => s.pagination);
  const setPage = useTonKhoPTByProductStore((s) => s.setPage);
  const setPageSize = useTonKhoPTByProductStore((s) => s.setPageSize);
  const columns = useTonKhoPTByProductStore((s) => s.columns);
  const toggleColumn = useTonKhoPTByProductStore((s) => s.toggleColumn);
  const reorderColumns = useTonKhoPTByProductStore((s) => s.reorderColumns);
  const resetColumns = useTonKhoPTByProductStore((s) => s.resetColumns);

  const { inputValue: searchInput, setInputValue: setSearchInput } = useSearchInputCommit({
    committedTerm: searchTerm,
    commit: commitSearchTerm,
  });

  const flatFiltered = useMemo(() => {
    let r = displayRows;
    if ((filters.warehouseIds?.length ?? 0) > 0) {
      const wh = new Set(filters.warehouseIds!.map(String));
      r = r.filter((x) => wh.has(String(x.id_kho)));
    }
    if ((filters.categoryIds?.length ?? 0) > 0) {
      const cat = new Set(filters.categoryIds!.map(String));
      r = r.filter((x) => x.danh_muc_id && cat.has(String(x.danh_muc_id)));
    }
    return r;
  }, [displayRows, filters.warehouseIds, filters.categoryIds]);

  const aggregated = useMemo(() => aggregateTonKhoPTByProduct(flatFiltered), [flatFiltered]);

  const filterFn = useCallback((item: TonKhoPTProductAgg, term: string, _f: TonKhoFilters) => {
    const q = term.trim().toLowerCase();
    if (!q) return true;
    return (
      item.ma_hang.toLowerCase().includes(q) ||
      item.ten_hang.toLowerCase().includes(q) ||
      (item.ten_danh_muc ?? '').toLowerCase().includes(q)
    );
  }, []);

  const filteredList = useListWithFilter(aggregated, searchTerm, filters, filterFn);

  const handleExport = useCallback(() => {
    if (filteredList.length === 0) {
      toast.warning(t('tonKhoPhanThuoc.byProduct.noExportData'));
      return;
    }
    void exportTonKhoPTByProductToExcel(filteredList, t)
      .then(() => toast.success(t('tonKhoPhanThuoc.export.success')))
      .catch(() => toast.error(t('tonKhoPhanThuoc.export.error')));
  }, [filteredList, t]);

  const khoOptions = useMemo(
    () =>
      khoList.map((k) => ({
        value: k.id,
        label: k.ten_kho,
        count: displayRows.filter((r) => String(r.id_kho) === String(k.id)).length || 0,
      })),
    [khoList, displayRows]
  );

  const categoryOptions = useMemo(
    () =>
      danhMucCap2.map((d) => ({
        value: d.id,
        label: d.ten_danh_muc_cha ? `${d.ten_danh_muc_cha} › ${d.ten_danh_muc}` : d.ten_danh_muc,
        count: displayRows.filter((r) => String(r.danh_muc_id) === String(d.id)).length || 0,
      })),
    [danhMucCap2, displayRows]
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
        label: t('tonKhoPhanThuoc.toolbar.warehouse'),
        icon: Warehouse,
        options: khoOptions,
        value: filters.warehouseIds ?? [],
        onChange: (val: string[]) => setFilter('warehouseIds', val),
      },
      {
        key: 'categoryIds',
        label: t('tonKhoPhanThuoc.toolbar.category'),
        icon: FolderOpen,
        options: categoryOptions,
        value: filters.categoryIds ?? [],
        onChange: (val: string[]) => setFilter('categoryIds', val),
      },
    ],
    [t, khoOptions, categoryOptions, filters.warehouseIds, filters.categoryIds, setFilter]
  );

  const renderFilters = (
    <div className="flex flex-wrap items-center gap-2">
      <FilterChipMultiSelect
        options={khoOptions}
        value={filters.warehouseIds ?? []}
        onChange={(val) => setFilter('warehouseIds', val)}
        placeholder={t('tonKhoPhanThuoc.toolbar.warehouse')}
        icon={Warehouse}
        className="w-full sm:w-[170px]"
        size="md"
      />
      <FilterChipMultiSelect
        options={categoryOptions}
        value={filters.categoryIds ?? []}
        onChange={(val) => setFilter('categoryIds', val)}
        placeholder={t('tonKhoPhanThuoc.toolbar.category')}
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

  const [detail, setDetail] = useState<TonKhoPTProductAgg | null>(null);

  const renderCell = (item: TonKhoPTProductAgg, col: ColumnConfig) => {
    switch (col.id) {
      case 'ma_hang':
        return (
          <td key={col.id} className="px-4 py-3" style={getColumnCellStyle(col)}>
            <span className="font-mono text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded border border-border">
              {item.ma_hang}
            </span>
          </td>
        );
      case 'ten_hang':
        return (
          <td key={col.id} className="px-4 py-3" style={getColumnCellStyle(col)}>
            <span className="font-medium text-foreground">{item.ten_hang}</span>
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
            <span className="font-medium tabular-nums">{formatNumberVN(item.tong_so_luong)}</span>
          </td>
        );
      default:
        return <td key={col.id} className="px-4 py-3" style={getColumnCellStyle(col)} />;
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <TonKhoToolbar
          searchTerm={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder={t('tonKhoPhanThuoc.byProduct.searchPlaceholder')}
          columns={columns}
          onToggleColumn={toggleColumn}
          onReorderColumns={reorderColumns}
          onResetColumns={resetColumns}
          filters={renderFilters}
          activeFilterCount={activeFilterCount}
          onClearAllFilters={handleClearAllFilters}
          filterGroups={filterGroups}
          onExport={handleExport}
        />

        <div className="flex-1 min-h-0 flex flex-col bg-card overflow-hidden relative">
          {isFetching && !isLoading ? (
            <div
              className="absolute inset-0 z-[25] pointer-events-none flex items-start justify-center pt-3 bg-background/30 backdrop-blur-[1px]"
              aria-busy="true"
              aria-live="polite"
            >
              <div className="h-6 w-6 rounded-full border-2 border-primary/35 border-t-primary animate-spin shadow-sm" aria-hidden />
            </div>
          ) : null}
          {isLoading ? (
            <ListPageSkeleton
              loadingText={t('common.loading')}
              tableColumns={visibleColumns.length}
              tableRowCount={8}
              tableColumnWithSubline={0}
              cardCount={0}
            />
          ) : filteredList.length === 0 ? (
            <div className="flex-1 min-h-0 flex items-center justify-center p-4">
              <EmptyState
                icon={<Package size={40} className="text-muted-foreground opacity-20" />}
                title={t('tonKhoPhanThuoc.byProduct.empty')}
                description={t('tonKhoPhanThuoc.byProduct.emptyHint')}
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
                        key={item.id_hang_hoa}
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
                  recordsLabel={t('tonKho.records')}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {detail && <TonKhoPTProductDetail agg={detail} onClose={() => setDetail(null)} />}
    </div>
  );
};

export default TonSanPhamPTTab;
