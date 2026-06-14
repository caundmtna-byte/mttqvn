import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  MessageSquareHeart,
  Building2,
  User,
  CheckCircle2,
  Activity,
  Clock,
  Layers,
  Tag,
  Flag,
  CalendarHeart,
  Download,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { cn, getLanguage } from '@/lib/utils';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import DateRangePicker, { type DateRangeValue } from '@/components/ui/DateRangePicker';
import {
  buildStandardDateRangePresets,
  isStandardDateRangeNonDefault,
} from '@/lib/date-range-presets';
import { StatsKpiGrid, StatsCard, StatsTableCard, ColoredBar } from '@/components/shared/stats';
import { chartFillForCategoricalBar } from '@/lib/constants/chart-colors';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import type { Option } from '@/components/ui/MultiSelect';
import ExportDialog from '@/components/shared/ExportDialog';
import { useExportData } from '@/lib/useExportData';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import ChartTooltip from '@/components/ui/ChartTooltip';
import EnumBadge from '@/components/ui/EnumBadge';
import { tienDoThamHoiBadge } from '../tham-hoi-to-chuc/core/display-badges';
import { useThamHoiToChucList } from '../tham-hoi-to-chuc/hooks/use-tham-hoi-to-chuc';
import { useDipThamHoiOptions } from '../dip-tham-hoi/hooks/use-dip-tham-hoi';
import { buildDipThamHoiFilterOptions } from '../shared/build-filter-options';
import {
  dttgRowVisibleByDonVi,
  useDttgViewer,
} from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';
import { useThamHoiCaNhanList } from '../tham-hoi-ca-nhan/hooks/use-tham-hoi-ca-nhan';
import { formatThoiGianDuKienDisplay } from '../tham-hoi-ca-nhan/utils/thoi-gian-du-kien';
import {
  THAM_HOI_THONG_KE_LOAI,
  TINH_TRANG_THAM_HOI_VALUES,
  type ThamHoiThongKeDimensionFilters,
  type ThamHoiThongKeRow,
  type ThamHoiLookupSortKey,
  combineAndNormalize,
  resolveThamHoiThongKeDateRange,
  resolveThamHoiThongKeTrendChartRange,
  filterRowsForThamHoiThongKe,
  computeThamHoiThongKeKpis,
  pickThamHoiTrendBucket,
  buildTrendSeries,
  buildTinhTrangBarData,
  buildLoaiBarData,
  buildDipThamHoiBarData,
  buildByYearStats,
  buildByYearChartData,
  sortLookupRows,
  formatLoaiLabel,
} from './utils/aggregate-tham-hoi-stats';

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'all',
  customStart: '',
  customEnd: '',
};

const initialDims: ThamHoiThongKeDimensionFilters = {
  loai: [],
  tinh_trang: [],
  dip_tham_hoi: [],
};

const EXPORT_PAGINATION = { page: 1, pageSize: 100_000 };

const loaiThamHoiBadge = {
  [txt('dttgThongKeThamHoi.stats.filterLoaiToChuc')]: { label: txt('dttgThongKeThamHoi.stats.filterLoaiToChuc'), color: 'blue' as const },
  [txt('dttgThongKeThamHoi.stats.filterLoaiCaNhan')]: { label: txt('dttgThongKeThamHoi.stats.filterLoaiCaNhan'), color: 'sky' as const },
};

function buildDimOptions(
  rows: ThamHoiThongKeRow[],
  pick: (r: ThamHoiThongKeRow) => { id: string; label: string },
): Option[] {
  const m = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const { id, label } = pick(r);
    const prev = m.get(id);
    if (prev) prev.count += 1;
    else m.set(id, { label: label || id, count: 1 });
  }
  return [...m.entries()]
    .map(([value, v]) => ({ value, label: v.label, count: v.count }))
    .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
}

const ThongKeThamHoiPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'danTocThamHoiThongKe');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('dttgThongKeThamHoi.noViewPermission'));
    navigate('/dan-toc-ton-giao', { replace: true });
  }, [user, canView, navigate]);

  const { data: toChucRows = [], isLoading: loadingToChuc } = useThamHoiToChucList({ enabled: canView });
  const { data: caNhanRows = [], isLoading: loadingCaNhan } = useThamHoiCaNhanList({ enabled: canView });
  const { data: dipList = [] } = useDipThamHoiOptions({ enabled: canView });
  const isLoading = loadingToChuc || loadingCaNhan;
  const viewer = useDttgViewer('danTocThamHoiThongKe');

  const viewableToChucRows = useMemo(
    () => toChucRows.filter((r) => dttgRowVisibleByDonVi(viewer, [r.don_vi_tham_hoi_id])),
    [toChucRows, viewer],
  );
  const viewableCaNhanRows = useMemo(
    () =>
      caNhanRows.filter((r) =>
        dttgRowVisibleByDonVi(viewer, [r.don_vi_tham_hoi_id, r.xa_phuong_id]),
      ),
    [caNhanRows, viewer],
  );

  const allRows = useMemo(
    () => combineAndNormalize(viewableToChucRows, viewableCaNhanRows),
    [viewableToChucRows, viewableCaNhanRows],
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [dims, setDims] = useState<ThamHoiThongKeDimensionFilters>(initialDims);
  const [sortKey, setSortKey] = useState<ThamHoiLookupSortKey>('ten_doi_tuong');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showExport, setShowExport] = useState(false);

  const presets = useMemo(() => buildStandardDateRangePresets(), []);

  const resolvedRange = useMemo(
    () => resolveThamHoiThongKeDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const filtered = useMemo(
    () => filterRowsForThamHoiThongKe(allRows, resolvedRange, dims),
    [allRows, resolvedRange, dims],
  );

  const kpis = useMemo(() => computeThamHoiThongKeKpis(filtered), [filtered]);

  const chartRange = useMemo(
    () => resolveThamHoiThongKeTrendChartRange(resolvedRange, allRows),
    [resolvedRange, allRows],
  );
  const bucket = useMemo(() => pickThamHoiTrendBucket(chartRange.start, chartRange.end), [chartRange]);
  const trendSeries = useMemo(
    () => buildTrendSeries(filtered, chartRange, bucket),
    [filtered, chartRange, bucket],
  );

  const tinhTrangBar = useMemo(() => buildTinhTrangBarData(filtered), [filtered]);
  const loaiBar = useMemo(
    () =>
      buildLoaiBarData(filtered, (loai) =>
        formatLoaiLabel(
          loai,
          txt('dttgThongKeThamHoi.stats.filterLoaiToChuc'),
          txt('dttgThongKeThamHoi.stats.filterLoaiCaNhan'),
        ),
      ),
    [filtered],
  );
  const dipBar = useMemo(() => buildDipThamHoiBarData(filtered, 10), [filtered]);

  const byYearRows = useMemo(() => buildByYearStats(filtered), [filtered]);
  const byYearChartData = useMemo(() => buildByYearChartData(byYearRows), [byYearRows]);

  const sortedLookupBase = useMemo(
    () => sortLookupRows(filtered, sortKey, sortDir, getLanguage),
    [filtered, sortKey, sortDir],
  );

  const loaiOptions = useMemo(() => {
    const labelOf = (id: (typeof THAM_HOI_THONG_KE_LOAI)[number]) =>
      formatLoaiLabel(
        id,
        txt('dttgThongKeThamHoi.stats.filterLoaiToChuc'),
        txt('dttgThongKeThamHoi.stats.filterLoaiCaNhan'),
      );
    const counts = new Map<string, number>();
    for (const id of THAM_HOI_THONG_KE_LOAI) counts.set(id, 0);
    for (const r of allRows) counts.set(r.loai, (counts.get(r.loai) ?? 0) + 1);
    return THAM_HOI_THONG_KE_LOAI.map((value) => ({
      value,
      label: labelOf(value),
      count: counts.get(value) ?? 0,
    }));
  }, [allRows]);

  const tinhTrangOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of TINH_TRANG_THAM_HOI_VALUES) counts.set(v, 0);
    for (const r of allRows) counts.set(r.tinh_trang, (counts.get(r.tinh_trang) ?? 0) + 1);
    return TINH_TRANG_THAM_HOI_VALUES.map((value) => ({
      value,
      label: value,
      count: counts.get(value) ?? 0,
    }));
  }, [allRows]);

  const dipOptions = useMemo(
    () => buildDipThamHoiFilterOptions(allRows, dipList, dims.dip_tham_hoi),
    [allRows, dipList, dims.dip_tham_hoi],
  );

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'loai',
        label: txt('dttgThongKeThamHoi.stats.filterLoai'),
        icon: Tag,
        options: loaiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.loai,
        onChange: (v) => setDims((d) => ({ ...d, loai: v })),
      },
      {
        key: 'tinh_trang',
        label: txt('dttgThongKeThamHoi.stats.filterTinhTrang'),
        icon: Flag,
        options: tinhTrangOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.tinh_trang,
        onChange: (v) => setDims((d) => ({ ...d, tinh_trang: v })),
      },
      {
        key: 'dip_tham_hoi',
        label: txt('dttgThongKeThamHoi.stats.filterDipThamHoi'),
        icon: CalendarHeart,
        options: dipOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.dip_tham_hoi,
        onChange: (v) => setDims((d) => ({ ...d, dip_tham_hoi: v })),
      },
    ],
    [loaiOptions, tinhTrangOptions, dipOptions, dims],
  );

  const isNonDefaultDateRange = useMemo(
    () => isStandardDateRangeNonDefault(dateRange, 'all'),
    [dateRange],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (isNonDefaultDateRange) n += 1;
    if (dims.loai.length) n += 1;
    if (dims.tinh_trang.length) n += 1;
    if (dims.dip_tham_hoi.length) n += 1;
    return n;
  }, [dims, isNonDefaultDateRange]);

  const clearFilters = useCallback(() => {
    setDims(initialDims);
    setDateRange(initialDateRange);
  }, []);

  const exportColumns = useMemo(
    () => [
      { key: 'loai', label: txt('dttgThongKeThamHoi.stats.tableColLoai') },
      { key: 'ten_doi_tuong', label: txt('dttgThongKeThamHoi.stats.tableColTenDoiTuong') },
      { key: 'loai_hinh', label: txt('dttgThongKeThamHoi.stats.tableColLoaiHinh') },
      { key: 'dip_tham_hoi', label: txt('dttgThongKeThamHoi.stats.tableColDipThamHoi') },
      { key: 'don_vi_tham_hoi', label: txt('dttgThongKeThamHoi.stats.tableColDonViThamHoi') },
      { key: 'tinh_trang', label: txt('dttgThongKeThamHoi.stats.tableColTinhTrang') },
      { key: 'thoi_gian_du_kien', label: txt('dttgThongKeThamHoi.stats.tableColThoiGianDuKien') },
      { key: 'thoi_gian_thuc_te', label: txt('dttgThongKeThamHoi.stats.tableColThoiGianThucTe') },
      { key: 'tg_tao', label: txt('dttgThongKeThamHoi.stats.tableColTgTao') },
      { key: 'range_start', label: txt('dttgThongKeThamHoi.exportRangeFrom') },
      { key: 'range_end', label: txt('dttgThongKeThamHoi.exportRangeTo') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: ThamHoiThongKeRow) => ({
      loai: formatLoaiLabel(
        item.loai,
        txt('dttgThongKeThamHoi.stats.filterLoaiToChuc'),
        txt('dttgThongKeThamHoi.stats.filterLoaiCaNhan'),
      ),
      ten_doi_tuong: item.ten_doi_tuong ?? '',
      loai_hinh: item.loai_hinh ?? '',
      dip_tham_hoi: item.dip_tham_hoi,
      don_vi_tham_hoi: item.don_vi_tham_hoi ?? '',
      tinh_trang: item.tinh_trang,
      thoi_gian_du_kien: item.thoi_gian_du_kien
        ? formatThoiGianDuKienDisplay(item.thoi_gian_du_kien)
        : '',
      thoi_gian_thuc_te: item.thoi_gian_thuc_te ?? '',
      tg_tao: item.tg_tao ? item.tg_tao.slice(0, 10) : '',
      range_start: resolvedRange.start,
      range_end: resolvedRange.end,
    }),
    [resolvedRange.start, resolvedRange.end],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } =
    useExportData({
      data: sortedLookupBase,
      isOpen: showExport,
      mapFn: exportMapFn,
      pagination: EXPORT_PAGINATION,
      selectedIds: new Set(),
      keyExtractor: (r) => r.id,
    });

  const handleExportLookup = () => {
    if (sortedLookupBase.length === 0) {
      toast.warning(txt('dttgThongKeThamHoi.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const toggleSort = (key: ThamHoiLookupSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'tg_tao' || key === 'thoi_gian_du_kien' ? 'desc' : 'asc');
    }
  };

  const dateRangeRow = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 w-full">
      <DateRangePicker
        presets={presets}
        value={dateRange}
        onChange={setDateRange}
        placeholder={txt('dttgThongKeThamHoi.dateRangeLabel')}
        customPresetId={CUSTOM_PRESET}
        className="shrink-0"
      />
    </div>
  );

  const filterPanelDesktop = (
    <>
      <div className="flex shrink-0 items-center">{dateRangeRow}</div>
      <div className="hidden h-6 w-px shrink-0 self-center bg-border sm:block" aria-hidden />
      <FilterChipMultiSelect
        icon={Tag}
        options={loaiOptions}
        value={dims.loai}
        onChange={(v) => setDims((d) => ({ ...d, loai: v }))}
        placeholder={txt('dttgThongKeThamHoi.stats.filterLoai')}
        className="w-[10rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Flag}
        options={tinhTrangOptions}
        value={dims.tinh_trang}
        onChange={(v) => setDims((d) => ({ ...d, tinh_trang: v }))}
        placeholder={txt('dttgThongKeThamHoi.stats.filterTinhTrang')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={CalendarHeart}
        options={dipOptions}
        value={dims.dip_tham_hoi}
        onChange={(v) => setDims((d) => ({ ...d, dip_tham_hoi: v }))}
        placeholder={txt('dttgThongKeThamHoi.stats.filterDipThamHoi')}
        className="w-[11rem] shrink-0"
      />
    </>
  );

  const toolbarActions = (
    <Tooltip content={txt('dttgThongKeThamHoi.stats.exportData')} placement="bottom">
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={handleExportLookup}
        className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
      >
        <Download className="w-4 h-4" />
      </Button>
    </Tooltip>
  );

  const kpiItems = useMemo(
    () => [
      {
        id: 'total',
        label: txt('dttgThongKeThamHoi.stats.kpiTotal'),
        value: kpis.total,
        icon: MessageSquareHeart,
        bg: 'bg-primary/10',
        color: 'text-primary',
        delta: null,
      },
      {
        id: 'to_chuc',
        label: txt('dttgThongKeThamHoi.stats.kpiToChuc'),
        value: kpis.toChuc,
        icon: Building2,
        bg: 'bg-blue-500/10',
        color: 'text-blue-600 dark:text-blue-400',
        delta: null,
      },
      {
        id: 'ca_nhan',
        label: txt('dttgThongKeThamHoi.stats.kpiCaNhan'),
        value: kpis.caNhan,
        icon: User,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
      {
        id: 'hoan_thanh',
        label: txt('dttgThongKeThamHoi.stats.kpiHoanThanh'),
        value: kpis.hoanThanh,
        icon: CheckCircle2,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'dang_th',
        label: txt('dttgThongKeThamHoi.stats.kpiDangThucHien'),
        value: kpis.dangThucHien,
        icon: Activity,
        bg: 'bg-amber-500/10',
        color: 'text-amber-600 dark:text-amber-400',
        delta: null,
      },
      {
        id: 'chua_th',
        label: txt('dttgThongKeThamHoi.stats.kpiChuaThucHien'),
        value: kpis.chuaThucHien,
        icon: Clock,
        bg: 'bg-slate-500/10',
        color: 'text-slate-600 dark:text-slate-400',
        delta: null,
      },
    ],
    [kpis],
  );

  if (!canView) return null;

  return (
    <div className="flex flex-col h-page relative min-h-0" aria-label={txt('dttgThongKeThamHoi.title')}>
      <DashboardToolbar
        className="shrink-0 mb-3"
        onBack={() => navigate('/dan-toc-ton-giao')}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangeRow}</div>
        }
        filters={filterPanelDesktop}
        filterGroups={filterGroups}
        actions={<div className="hidden sm:flex shrink-0">{toolbarActions}</div>}
        mobileActions={toolbarActions}
        activeFilterCount={activeFilterCount}
        onClearFilters={activeFilterCount > 0 ? clearFilters : undefined}
      />

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card shadow-sm p-3 sm:p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{txt('dttgThongKeThamHoi.loading')}</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">{txt('dttgThongKeThamHoi.noData')}</p>
            <p className="text-xs text-muted-foreground">{txt('dttgThongKeThamHoi.noDataHint')}</p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                {txt('dttgThongKeThamHoi.stats.clearFilters')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={3} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('dttgThongKeThamHoi.stats.chartTrend')} icon={MessageSquareHeart} spanTwo={false}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <LineChart data={trendSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name={txt('dttgThongKeThamHoi.stats.tableTwoColValue')}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('dttgThongKeThamHoi.stats.chartTinhTrang')} icon={Flag}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={tinhTrangBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={40} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={tinhTrangBar}
                        dataKey="count"
                        name={txt('dttgThongKeThamHoi.stats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, {
                            badgeConfig: tienDoThamHoiBadge,
                            labelKey: 'label',
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('dttgThongKeThamHoi.stats.chartLoai')} icon={Tag}>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={loaiBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={loaiBar}
                        dataKey="count"
                        name={txt('dttgThongKeThamHoi.stats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, {
                            badgeConfig: loaiThamHoiBadge,
                            labelKey: 'label',
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsTableCard
                title={txt('dttgThongKeThamHoi.stats.chartDipThamHoi')}
                icon={CalendarHeart}
                rows={dipBar.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="dttgThongKeThamHoi.stats.tableTwoColLabel"
                columnValueKey="dttgThongKeThamHoi.stats.tableTwoColValue"
                emptyKey="dttgThongKeThamHoi.noData"
                maxHeight="max-h-[220px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('dttgThongKeThamHoi.stats.chartByYear')} icon={Calendar}>
                <div className="h-[260px] w-full min-w-0">
                  {byYearChartData.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">{txt('dttgThongKeThamHoi.noData')}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                      <BarChart data={byYearChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                        <RechartsTooltip content={<ChartTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar
                          dataKey="soDot"
                          name={txt('dttgThongKeThamHoi.stats.chartSeriesSoDot')}
                          fill="hsl(var(--primary))"
                          maxBarSize={28}
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="tongLuot"
                          name={txt('dttgThongKeThamHoi.stats.chartSeriesTongLuot')}
                          fill="hsl(var(--chart-2))"
                          maxBarSize={28}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </StatsCard>

              <StatsCard title={txt('dttgThongKeThamHoi.stats.tableByYear')} icon={Calendar}>
                <div className="overflow-x-auto max-h-[min(260px,40vh)] overflow-y-auto -m-4">
                  {byYearRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center px-4">{txt('dttgThongKeThamHoi.noData')}</p>
                  ) : (
                    <table className="w-full text-sm min-w-[640px]">
                      <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                        <tr className="text-left text-muted-foreground">
                          <th className="py-2 px-3 font-medium">{txt('dttgThongKeThamHoi.stats.tableColNam')}</th>
                          <th className="py-2 pr-3 font-medium text-right">{txt('dttgThongKeThamHoi.stats.tableColSoDot')}</th>
                          <th className="py-2 pr-3 font-medium text-right">{txt('dttgThongKeThamHoi.stats.tableColTongLuot')}</th>
                          <th className="py-2 pr-3 font-medium text-right">{txt('dttgThongKeThamHoi.stats.kpiToChuc')}</th>
                          <th className="py-2 pr-3 font-medium text-right">{txt('dttgThongKeThamHoi.stats.kpiCaNhan')}</th>
                          <th className="py-2 pr-3 font-medium text-right">{txt('dttgThongKeThamHoi.stats.kpiHoanThanh')}</th>
                          <th className="py-2 pr-3 font-medium text-right">{txt('dttgThongKeThamHoi.stats.kpiDangThucHien')}</th>
                          <th className="py-2 pr-3 font-medium text-right">{txt('dttgThongKeThamHoi.stats.kpiChuaThucHien')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byYearRows.map((row) => (
                          <tr key={row.year} className="border-b border-border/60">
                            <td className="py-2 px-3 tabular-nums font-medium">{row.label}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{row.soDot}</td>
                            <td className="py-2 pr-3 text-right tabular-nums font-medium text-primary">{row.tongLuot}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{row.toChuc}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{row.caNhan}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{row.hoanThanh}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{row.dangThucHien}</td>
                            <td className="py-2 pr-3 text-right tabular-nums">{row.chuaThucHien}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </StatsCard>
            </div>

            <StatsCard title={txt('dttgThongKeThamHoi.stats.tableLookupTitle')} icon={Layers}>
              <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[960px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['loai', txt('dttgThongKeThamHoi.stats.tableColLoai')],
                          ['ten_doi_tuong', txt('dttgThongKeThamHoi.stats.tableColTenDoiTuong')],
                          ['dip_tham_hoi', txt('dttgThongKeThamHoi.stats.tableColDipThamHoi')],
                          ['don_vi_tham_hoi', txt('dttgThongKeThamHoi.stats.tableColDonViThamHoi')],
                          ['tinh_trang', txt('dttgThongKeThamHoi.stats.tableColTinhTrang')],
                          ['thoi_gian_du_kien', txt('dttgThongKeThamHoi.stats.tableColThoiGianDuKien')],
                          ['thoi_gian_thuc_te', txt('dttgThongKeThamHoi.stats.tableColThoiGianThucTe')],
                          ['tg_tao', txt('dttgThongKeThamHoi.stats.tableColTgTao')],
                        ] as const
                      ).map(([key, label]) => (
                        <th key={key} className="py-2 pr-3 font-medium whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => toggleSort(key)}
                            className={cn(
                              'inline-flex items-center gap-1 hover:text-foreground',
                              sortKey === key && 'text-foreground',
                            )}
                          >
                            {label}
                            {sortKey === key && <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLookupBase.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatLoaiLabel(
                            row.loai,
                            txt('dttgThongKeThamHoi.stats.filterLoaiToChuc'),
                            txt('dttgThongKeThamHoi.stats.filterLoaiCaNhan'),
                          )}
                        </td>
                        <td className="py-2 pr-3 max-w-[200px] truncate font-medium">{row.ten_doi_tuong ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[160px] truncate">{row.dip_tham_hoi}</td>
                        <td className="py-2 pr-3 max-w-[160px] truncate">{row.don_vi_tham_hoi ?? '—'}</td>
                        <td className="py-2 pr-3">
                          <EnumBadge value={row.tinh_trang} config={tienDoThamHoiBadge} />
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {row.thoi_gian_du_kien
                            ? formatThoiGianDuKienDisplay(row.thoi_gian_du_kien)
                            : '—'}
                        </td>
                        <td className="py-2 pr-3 whitespace-nowrap tabular-nums">
                          {row.thoi_gian_thuc_te ?? '—'}
                        </td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                          {row.tg_tao ? row.tg_tao.slice(0, 10) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StatsCard>
          </>
        )}
      </div>

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        columns={exportColumns}
        data={exportData}
        paginatedData={paginatedExportData}
        selectedData={selectedExportData}
        fileName={txt('dttgThongKeThamHoi.exportFileName')}
      />
    </div>
  );
};

export default ThongKeThamHoiPage;
