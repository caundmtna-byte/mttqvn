import React, { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarRange, Download, Eye, HandHeart, Home, MapPin, Package, Search, Users, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
import { useServerPagedList } from '@/hooks/use-server-paged-list';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import GenericTable from '@/components/shared/GenericTable';
import ExportDialog from '@/components/shared/ExportDialog';
import ErrorState from '@/components/shared/ErrorState';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import FilterChipSingleSelect from '@/components/shared/FilterChipSingleSelect';
import { ColumnHeaderSortMenu } from '@/components/shared/column-header';
import { TableRowIconButton } from '@/components/shared/row-actions';
import { StatsKpiGrid, type StatsKpiCardItem } from '@/components/shared/stats';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Tooltip from '@/components/ui/Tooltip';
import EnumBadge from '@/components/ui/EnumBadge';
import { useExportData } from '@/lib/useExportData';
import type { ColumnConfig } from '@/store/createGenericStore';
import { buildNddkNamOptions } from '../../danh-sach/utils/nam-options';
import { useNddkXaPhuongOptions } from '../../danh-sach/hooks/use-nddk-xa-phuong-options';
import { HNGH_DOI_TUONG_VALUES } from '../core/constants';
import { hnghDoiTuongBadge } from '../core/display-badges';
import type { HnghNhanHoTroRow } from '../core/nhan-ho-tro';
import { getHnghNhanHoTroAllForExport, getHnghNhanHoTroPage, getHnghNhanHoTroTong } from '../services/nhan-ho-tro-service';
import { useHnghNhanHoTroStore } from '../store/useHnghNhanHoTroStore';
import { isHoNgheoScopedToXaPhuong, useHoNgheoViewer } from '../hooks/use-ho-ngheo-viewer';

const T = (k: string, p?: Record<string, unknown>) => txt(`hoNgheoNhanHoTro.${k}`, p);
const TIEN_COLS = new Set(['vnn_tien', 'vnn_hien_vat', 'nddk_tien', 'kho_gia_tri', 'tong_gia_tri']);
const SO_COLS = new Set(['vnn_so_khoan', 'nddk_so_can', 'kho_so_phieu']);
const SORTABLE: Record<string, string> = {
  ho_ten_dai_dien: 'ho_ten_dai_dien',
  ten_xa_phuong: 'ten_xa_phuong',
  vnn_tien: 'vnn_tong',
  nddk_tien: 'nddk_tien',
  kho_gia_tri: 'kho_gia_tri',
  tong_gia_tri: 'tong_gia_tri',
};

function tien(n: number): string {
  return n ? `${Math.round(n).toLocaleString('vi-VN')} đ` : '';
}

interface Props {
  tabsSlot?: React.ReactNode;
  onPageBack: () => void;
  canExport: boolean;
  /** Chỉ bật khi tab đang mở — tránh gọi RPC tổng hợp khi không xem. */
  queryEnabled: boolean;
  /** Bấm một hộ ⇒ mở chi tiết hộ ở trang cha. */
  onOpenHo: (id: string) => void;
}

/**
 * Tab "Thống kê nhận hỗ trợ": mỗi hộ đã nhận bao nhiêu, theo từng nguồn. 7.800+ hộ
 * ⇒ phân trang ở máy chủ; KPI lấy từ RPC tổng riêng (cộng trên TOÀN bộ bộ lọc, không
 * chỉ trang đang xem).
 */
const HoNgheoNhanHoTroPanel: React.FC<Props> = ({ tabsSlot, onPageBack, canExport, queryEnabled, onOpenHo }) => {
  const viewer = useHoNgheoViewer();
  const scopedToXa = isHoNgheoScopedToXaPhuong(viewer);
  const xaPhuongOptions = useNddkXaPhuongOptions(scopedToXa ? viewer.viewerDonViId : null);
  const [showExport, setShowExport] = useState(false);

  const {
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    sort,
    setSort,
    pagination,
    setPage,
    setPageSize,
    columns,
    resizeColumn,
    selectedIds,
    toggleSelection,
    toggleAllSelection,
  } = useHnghNhanHoTroStore();

  const extraParams = useMemo(
    () => ({
      nam: filters.nam_filter,
      xaPhuongIds: filters.xa_phuong_filter,
      doiTuong: filters.doi_tuong_filter,
      chiHoDaNhan: filters.pham_vi !== 'tat_ca',
    }),
    [filters],
  );

  const { rows, totalRecords, hasNextPage, isLoading, isError, refetch, params } = useServerPagedList({
    pagination,
    searchTerm,
    sort,
    extraParams,
    queryKey: queryKeys.hoNgheo.nhanHoTroPage,
    fetchFn: getHnghNhanHoTroPage,
    enabled: queryEnabled,
  });

  const tongParams = useMemo(() => ({ search: searchTerm, ...extraParams }), [searchTerm, extraParams]);
  const { data: tong } = useQuery({
    queryKey: queryKeys.hoNgheo.nhanHoTroTong(tongParams),
    queryFn: () => getHnghNhanHoTroTong(tongParams),
    enabled: queryEnabled,
    ...listQueryOptions,
  });

  const kpiItems: StatsKpiCardItem[] = useMemo(
    () => [
      {
        id: 'soHo',
        label: T('kpi.soHoDaNhan'),
        value: (tong?.so_ho_da_nhan ?? 0).toLocaleString('vi-VN'),
        icon: Users,
        color: 'text-primary',
        bg: 'bg-primary/10',
        pct: tong && tong.so_ho > 0 ? `/ ${tong.so_ho.toLocaleString('vi-VN')}` : null,
      },
      { id: 'vnn', label: T('kpi.vnn'), value: tien((tong?.vnn_tien ?? 0) + (tong?.vnn_hien_vat ?? 0)) || '0 đ', icon: HandHeart, color: 'text-amber-600', bg: 'bg-amber-500/10' },
      { id: 'nddk', label: T('kpi.nddk'), value: tien(tong?.nddk_tien ?? 0) || '0 đ', icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
      { id: 'kho', label: T('kpi.kho'), value: tien(tong?.kho_gia_tri ?? 0) || '0 đ', icon: Package, color: 'text-sky-600', bg: 'bg-sky-500/10' },
    ],
    [tong],
  );

  // ----- Bộ lọc -----
  const namOptions = useMemo(() => buildNddkNamOptions(), []);
  const doiTuongOptions = useMemo(() => HNGH_DOI_TUONG_VALUES.map((v) => ({ value: v, label: v })), []);
  const xaOptions = useMemo(() => xaPhuongOptions.map((o) => ({ value: String(o.value), label: o.label })), [xaPhuongOptions]);
  const phamViOptions = useMemo(
    () => [
      { value: 'da_nhan', label: T('chiHoDaNhan') },
      { value: 'tat_ca', label: T('tatCaHo') },
    ],
    [],
  );

  const activeFilterCount =
    (searchTerm ? 1 : 0) +
    (filters.nam_filter.length > 0 ? 1 : 0) +
    (filters.xa_phuong_filter.length > 0 ? 1 : 0) +
    (filters.doi_tuong_filter.length > 0 ? 1 : 0);

  const clearFilters = () => {
    setSearchTerm('');
    setFilter('nam_filter', []);
    setFilter('xa_phuong_filter', []);
    setFilter('doi_tuong_filter', []);
  };

  const filterGroups = [
    { key: 'nam', label: T('filterNam'), icon: CalendarRange, options: namOptions, value: filters.nam_filter, onChange: (v: string[]) => setFilter('nam_filter', v) },
    ...(!scopedToXa
      ? [{ key: 'xa', label: T('filterXaPhuong'), icon: MapPin, options: xaOptions, value: filters.xa_phuong_filter, onChange: (v: string[]) => setFilter('xa_phuong_filter', v) }]
      : []),
    { key: 'doi_tuong', label: T('filterDoiTuong'), icon: Users, options: doiTuongOptions, value: filters.doi_tuong_filter, onChange: (v: string[]) => setFilter('doi_tuong_filter', v) },
  ];

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <div className="w-full sm:w-56">
        <Input
          icon={Search}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={txt('common.search')}
          aria-label={txt('common.search')}
        />
      </div>
      <FilterChipMultiSelect options={namOptions} value={filters.nam_filter} onChange={(v) => setFilter('nam_filter', v)} placeholder={T('filterNam')} icon={CalendarRange} className="shrink-0" />
      {!scopedToXa && (
        <FilterChipMultiSelect options={xaOptions} value={filters.xa_phuong_filter} onChange={(v) => setFilter('xa_phuong_filter', v)} placeholder={T('filterXaPhuong')} icon={MapPin} className="shrink-0" />
      )}
      <FilterChipMultiSelect options={doiTuongOptions} value={filters.doi_tuong_filter} onChange={(v) => setFilter('doi_tuong_filter', v)} placeholder={T('filterDoiTuong')} icon={Users} className="shrink-0" />
      <FilterChipSingleSelect
        options={phamViOptions}
        value={filters.pham_vi}
        onChange={(v) => setFilter('pham_vi', v === 'tat_ca' ? 'tat_ca' : 'da_nhan')}
        placeholder={T('chiHoDaNhan')}
        icon={Wallet}
        className="shrink-0"
      />
    </div>
  );

  // ----- Xuất file -----
  const exportColumns = useMemo(() => columns.map((c) => ({ key: c.id, label: c.label })), [columns]);
  const exportMapFn = useCallback(
    (r: HnghNhanHoTroRow) =>
      Object.fromEntries(
        columns.map((c) => {
          const v = (r as unknown as Record<string, unknown>)[c.id];
          return [c.id, TIEN_COLS.has(c.id) || SO_COLS.has(c.id) ? Number(v ?? 0) : (v ?? '')];
        }),
      ),
    [columns],
  );
  const { exportData, paginatedData, selectedData } = useExportData({
    data: rows,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination,
    selectedIds,
    keyExtractor: (r) => r.id,
  });
  const fetchAllData = useCallback(async () => (await getHnghNhanHoTroAllForExport(params)).map(exportMapFn), [params, exportMapFn]);

  const actions = canExport ? (
    <Tooltip content={txt('common.export')} placement="bottom">
      <Button
        variant="outline"
        size="sm"
        onClick={() => (totalRecords === 0 ? toast.warning(T('noExportData')) : setShowExport(true))}
        className="inline-flex h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
      >
        <Download className="w-4 h-4" />
      </Button>
    </Tooltip>
  ) : undefined;

  // ----- Bảng -----
  const renderColumnHeaderAccessory = useCallback(
    (col: ColumnConfig) =>
      SORTABLE[col.id] ? (
        <ColumnHeaderSortMenu ariaLabel={col.label} sortColumnId={SORTABLE[col.id]} sort={sort} setSort={setSort} />
      ) : null,
    [sort, setSort],
  );

  const renderCell = useCallback((colId: string, r: HnghNhanHoTroRow) => {
    const empty = txt('common.emptyCell');
    // GenericTable luôn vẽ cột Thao tác — dùng cho nút mở chi tiết hộ.
    if (colId === 'actions') {
      return <TableRowIconButton icon={Eye} label={txt('common.view')} onClick={() => onOpenHo(r.id)} />;
    }
    if (TIEN_COLS.has(colId)) {
      const v = tien((r as unknown as Record<string, number>)[colId]);
      return (
        <span className={`tabular-nums whitespace-nowrap text-body-sm ${colId === 'tong_gia_tri' ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
          {v || empty}
        </span>
      );
    }
    if (SO_COLS.has(colId)) {
      return <span className="tabular-nums text-body-sm">{(r as unknown as Record<string, number>)[colId] || empty}</span>;
    }
    if (colId === 'doi_tuong') {
      return r.doi_tuong ? <EnumBadge value={r.doi_tuong} config={hnghDoiTuongBadge} shape="pill" truncate /> : <span className="text-muted-foreground">{empty}</span>;
    }
    if (colId === 'ho_ten_dai_dien') {
      return <span className="truncate font-semibold text-sm">{r.ho_ten_dai_dien}</span>;
    }
    const v = (r as unknown as Record<string, unknown>)[colId];
    return <span className="truncate text-body-sm text-muted-foreground">{v ? String(v) : empty}</span>;
  }, [onOpenHo]);

  const renderMobileCard = useCallback(
    (r: HnghNhanHoTroRow, isSelected: boolean) => (
      <div className={`rounded-lg border p-3 space-y-1 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}>
        <div className="flex items-start justify-between gap-2">
          <p className="font-semibold text-sm truncate">{r.ho_ten_dai_dien}</p>
          <span className="tabular-nums font-semibold text-sm">{tien(r.tong_gia_tri) || '0 đ'}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{[r.ten_xa_phuong, r.khoi_xom, r.doi_tuong].filter(Boolean).join(' · ')}</p>
      </div>
    ),
    [],
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <DashboardToolbar
        filters={filtersSlot}
        actions={actions}
        filterGroups={filterGroups}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        onBack={onPageBack}
        tabSlot={tabsSlot}
      />
      <div className="flex-1 min-h-0 flex flex-col gap-3 px-3 sm:px-4 py-3">
        <StatsKpiGrid items={kpiItems} columns={4} />
        <p className="text-xs text-muted-foreground">
          {T('hint')}{' '}
          {tong ? <span className="font-semibold text-foreground">{T('kpi.tong')}: {tien(tong.tong_gia_tri) || '0 đ'}</span> : null}
        </p>
        <div className="flex-1 min-h-[320px] flex flex-col rounded-xl border border-border bg-card overflow-hidden">
          {isError ? (
            <div className="flex-1 flex items-center justify-center p-4">
              <ErrorState className="w-full max-w-md" message={T('listLoadErrorHint')} onRetry={() => void refetch()} primaryButtons />
            </div>
          ) : (
            <GenericTable
              data={rows}
              columns={columns}
              isLoading={isLoading}
              loadingText={txt('common.loadingData')}
              emptyTitle={T('empty')}
              serverSidePagination
              serverTotalRecords={totalRecords}
              serverHasNextPage={hasNextPage}
              selectedIds={selectedIds}
              onToggleSelection={toggleSelection}
              onToggleAll={toggleAllSelection}
              renderMobileCard={renderMobileCard}
              page={pagination.page}
              pageSize={pagination.pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              sort={sort}
              onSort={setSort}
              renderCell={renderCell}
              onRowClick={(r) => onOpenHo(r.id)}
              keyExtractor={(r) => r.id}
              onResizeColumn={resizeColumn}
              stickyLeftCount={1}
              listBreakpoint="sm"
              renderColumnHeaderAccessory={renderColumnHeaderAccessory}
              hideSortOnColumnLabel
            />
          )}
        </div>
      </div>
      {showExport && (
        <ExportDialog
          open={showExport}
          onClose={() => setShowExport(false)}
          columns={exportColumns}
          data={exportData}
          paginatedData={paginatedData}
          selectedData={selectedData}
          fileName={T('exportFileName')}
          visibleColumnKeys={columns.filter((c) => c.visible).map((c) => c.id)}
          serverTotalRecords={totalRecords}
          fetchAllData={fetchAllData}
        />
      )}
    </div>
  );
};

export default HoNgheoNhanHoTroPanel;
