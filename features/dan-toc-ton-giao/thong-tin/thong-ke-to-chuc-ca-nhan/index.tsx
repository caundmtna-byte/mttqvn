import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  lazy,
  Suspense,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
} from 'recharts';
import {
  Building2,
  User,
  CheckCircle2,
  Power,
  Layers,
  Tag,
  Flag,
  MapPin,
  Star,
  Download,
  FileText,
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
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import ChartTooltip from '@/components/ui/ChartTooltip';
import EnumBadge from '@/components/ui/EnumBadge';
import type { BadgeConfig } from '@/components/ui/EnumBadge';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import { LOAI_HINH_VALUES } from '../thong-tin-to-chuc-quan-trong/core/constants';
import { DOI_TUONG_VALUES } from '../thong-tin-ca-nhan-tieu-bieu/core/constants';
import { useThongTinToChucQuanTrongList } from '../thong-tin-to-chuc-quan-trong/hooks/use-thong-tin-to-chuc-quan-trong';
import { useThongTinCaNhanTieuBieuList } from '../thong-tin-ca-nhan-tieu-bieu/hooks/use-thong-tin-ca-nhan-tieu-bieu';
import type { ThongTinToChucQuanTrong } from '../thong-tin-to-chuc-quan-trong/core/types';
import type { ThongTinCaNhanTieuBieu } from '../thong-tin-ca-nhan-tieu-bieu/core/types';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import {
  DTTG_STATS_DON_VI_NONE,
  DTTG_THONG_TIN_LOAI,
  type DttgThongTinDimensionFilters,
  type DttgThongTinThongKeRow,
  type DttgLookupSortKey,
  combineAndNormalize,
  resolveDttgThongTinDateRange,
  resolveDttgThongTinTrendChartRange,
  filterRowsForDttgThongTin,
  computeDttgThongTinKpis,
  pickDttgTrendBucket,
  buildTrendSeries,
  buildTrangThaiBarData,
  buildLoaiBarData,
  buildLoaiHinhBarData,
  buildDoiTuongBarData,
  aggregateByDonViTable,
  sortLookupRows,
  formatLoaiLabel,
  formatDonViLabel,
} from './utils/aggregate-dttg-thong-tin-stats';
import { exportDttgThongTinReportToExcel } from './utils/export-dttg-thong-tin-report';

const ThongTinToChucQuanTrongDetail = lazy(
  () => import('../thong-tin-to-chuc-quan-trong/components/thong-tin-to-chuc-quan-trong-detail'),
);
const ThongTinCaNhanTieuBieuDetail = lazy(
  () => import('../thong-tin-ca-nhan-tieu-bieu/components/thong-tin-ca-nhan-tieu-bieu-detail'),
);

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'all',
  customStart: '',
  customEnd: '',
};

const initialDims: DttgThongTinDimensionFilters = {
  loai: [],
  trang_thai: [],
  loai_hinh: [],
  doi_tuong: [],
  don_vi_id: [],
};

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div
      className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"
      aria-hidden
    />
  </div>
);

function buildDimOptions(
  rows: DttgThongTinThongKeRow[],
  pick: (r: DttgThongTinThongKeRow) => { id: string; label: string },
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

const loaiBadge: BadgeConfig<string> = {
  [txt('dttgThongKeToChucCaNhan.stats.filterLoaiToChuc')]: {
    label: txt('dttgThongKeToChucCaNhan.stats.filterLoaiToChuc'),
    color: 'blue',
  },
  [txt('dttgThongKeToChucCaNhan.stats.filterLoaiCaNhan')]: {
    label: txt('dttgThongKeToChucCaNhan.stats.filterLoaiCaNhan'),
    color: 'sky',
  },
};

const trangThaiBadge: BadgeConfig<string> = {
  'Đang hoạt động': { label: txt('position.active'), color: 'emerald' },
  'Ngừng hoạt động': { label: txt('position.inactive'), color: 'slate' },
};

const ThongKeToChucCaNhanPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'danTocThongKeToChucCaNhan');
  const canOpenToChucDetail = useCan('view', 'danTocToChucQuanTrong');
  const canOpenCaNhanDetail = useCan('view', 'danTocCaNhanTieuBieu');
  const { canExport } = useResourcePermissions('danTocThongKeToChucCaNhan');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('dttgThongKeToChucCaNhan.noViewPermission'));
    navigate('/dan-toc-ton-giao', { replace: true });
  }, [user, canView, navigate]);

  const { data: toChucRows = [], isLoading: loadingToChuc } = useThongTinToChucQuanTrongList({
    enabled: canView,
  });
  const { data: caNhanRows = [], isLoading: loadingCaNhan } = useThongTinCaNhanTieuBieuList({
    enabled: canView,
  });
  const isLoading = loadingToChuc || loadingCaNhan;

  const allRows = useMemo(
    () => combineAndNormalize(toChucRows, caNhanRows),
    [toChucRows, caNhanRows],
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [dims, setDims] = useState<DttgThongTinDimensionFilters>(initialDims);
  const [sortKey, setSortKey] = useState<DttgLookupSortKey>('ten');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [exporting, setExporting] = useState(false);
  const [viewingToChuc, setViewingToChuc] = useState<ThongTinToChucQuanTrong | null>(null);
  const [viewingCaNhan, setViewingCaNhan] = useState<ThongTinCaNhanTieuBieu | null>(null);

  const presets = useMemo(() => buildStandardDateRangePresets(), []);

  const resolvedRange = useMemo(
    () => resolveDttgThongTinDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const filtered = useMemo(
    () => filterRowsForDttgThongTin(allRows, resolvedRange, dims),
    [allRows, resolvedRange, dims],
  );

  const kpis = useMemo(() => computeDttgThongTinKpis(filtered), [filtered]);

  const chartRange = useMemo(
    () => resolveDttgThongTinTrendChartRange(resolvedRange, allRows),
    [resolvedRange, allRows],
  );
  const bucket = useMemo(() => pickDttgTrendBucket(chartRange.start, chartRange.end), [chartRange]);
  const trendSeries = useMemo(
    () => buildTrendSeries(filtered, chartRange, bucket),
    [filtered, chartRange, bucket],
  );

  const trangThaiBar = useMemo(() => buildTrangThaiBarData(filtered), [filtered]);
  const loaiBar = useMemo(
    () =>
      buildLoaiBarData(filtered, (loai) =>
        formatLoaiLabel(
          loai,
          txt('dttgThongKeToChucCaNhan.stats.filterLoaiToChuc'),
          txt('dttgThongKeToChucCaNhan.stats.filterLoaiCaNhan'),
        ),
      ),
    [filtered],
  );
  const loaiHinhBar = useMemo(() => buildLoaiHinhBarData(filtered), [filtered]);
  const doiTuongBar = useMemo(() => buildDoiTuongBarData(filtered), [filtered]);
  const donViTable = useMemo(() => aggregateByDonViTable(filtered), [filtered]);

  const sortedLookupBase = useMemo(
    () => sortLookupRows(filtered, sortKey, sortDir, getLanguage),
    [filtered, sortKey, sortDir],
  );

  const loaiOptions = useMemo(() => {
    const labelOf = (id: (typeof DTTG_THONG_TIN_LOAI)[number]) =>
      formatLoaiLabel(
        id,
        txt('dttgThongKeToChucCaNhan.stats.filterLoaiToChuc'),
        txt('dttgThongKeToChucCaNhan.stats.filterLoaiCaNhan'),
      );
    const counts = new Map<string, number>();
    for (const id of DTTG_THONG_TIN_LOAI) counts.set(id, 0);
    for (const r of allRows) counts.set(r.loai, (counts.get(r.loai) ?? 0) + 1);
    return DTTG_THONG_TIN_LOAI.map((value) => ({
      value,
      label: labelOf(value),
      count: counts.get(value) ?? 0,
    }));
  }, [allRows]);

  const trangThaiOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of TRANG_THAI_HOAT_DONG) counts.set(v, 0);
    for (const r of allRows) counts.set(r.trang_thai, (counts.get(r.trang_thai) ?? 0) + 1);
    return TRANG_THAI_HOAT_DONG.map((value) => ({
      value,
      label: value,
      count: counts.get(value) ?? 0,
    }));
  }, [allRows]);

  const loaiHinhOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of LOAI_HINH_VALUES) counts.set(v, 0);
    for (const r of allRows) {
      if (r.loai === 'to_chuc') counts.set(r.phan_loai, (counts.get(r.phan_loai) ?? 0) + 1);
    }
    return LOAI_HINH_VALUES.map((value) => ({
      value,
      label: value,
      count: counts.get(value) ?? 0,
    }));
  }, [allRows]);

  const doiTuongOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of DOI_TUONG_VALUES) counts.set(v, 0);
    for (const r of allRows) {
      if (r.loai === 'ca_nhan') counts.set(r.phan_loai, (counts.get(r.phan_loai) ?? 0) + 1);
    }
    return DOI_TUONG_VALUES.map((value) => ({
      value,
      label: value,
      count: counts.get(value) ?? 0,
    }));
  }, [allRows]);

  const donViOptions = useMemo(
    () =>
      buildDimOptions(allRows, (r) => {
        const id = r.don_vi_id?.trim() ? String(r.don_vi_id) : DTTG_STATS_DON_VI_NONE;
        return { id, label: formatDonViLabel(r) };
      }),
    [allRows],
  );

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'loai',
        label: txt('dttgThongKeToChucCaNhan.stats.filterLoai'),
        icon: Tag,
        options: loaiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.loai,
        onChange: (v) => setDims((d) => ({ ...d, loai: v })),
      },
      {
        key: 'trang_thai',
        label: txt('dttgThongKeToChucCaNhan.stats.filterTrangThai'),
        icon: Flag,
        options: trangThaiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.trang_thai,
        onChange: (v) => setDims((d) => ({ ...d, trang_thai: v })),
      },
      {
        key: 'loai_hinh',
        label: txt('dttgThongKeToChucCaNhan.stats.filterLoaiHinh'),
        icon: Building2,
        options: loaiHinhOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.loai_hinh,
        onChange: (v) => setDims((d) => ({ ...d, loai_hinh: v })),
      },
      {
        key: 'doi_tuong',
        label: txt('dttgThongKeToChucCaNhan.stats.filterDoiTuong'),
        icon: User,
        options: doiTuongOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.doi_tuong,
        onChange: (v) => setDims((d) => ({ ...d, doi_tuong: v })),
      },
      {
        key: 'don_vi_id',
        label: txt('dttgThongKeToChucCaNhan.stats.filterDonVi'),
        icon: MapPin,
        options: donViOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.don_vi_id,
        onChange: (v) => setDims((d) => ({ ...d, don_vi_id: v })),
      },
    ],
    [loaiOptions, trangThaiOptions, loaiHinhOptions, doiTuongOptions, donViOptions, dims],
  );

  const isNonDefaultDateRange = useMemo(
    () => isStandardDateRangeNonDefault(dateRange, 'all'),
    [dateRange],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (isNonDefaultDateRange) n += 1;
    if (dims.loai.length) n += 1;
    if (dims.trang_thai.length) n += 1;
    if (dims.loai_hinh.length) n += 1;
    if (dims.doi_tuong.length) n += 1;
    if (dims.don_vi_id.length) n += 1;
    return n;
  }, [dims, isNonDefaultDateRange]);

  const clearFilters = useCallback(() => {
    setDims(initialDims);
    setDateRange(initialDateRange);
  }, []);

  const handleExportReport = useCallback(async () => {
    if (filtered.length === 0) {
      toast.warning(txt('dttgThongKeToChucCaNhan.noExportData'));
      return;
    }
    setExporting(true);
    try {
      await exportDttgThongTinReportToExcel({
        kpis,
        donViRows: donViTable,
        loaiHinhRows: loaiHinhBar,
        doiTuongRows: doiTuongBar,
        trangThaiRows: trangThaiBar,
        lookupRows: sortedLookupBase,
        range: resolvedRange,
        trendRange: chartRange,
      });
      toast.success(txt('dttgThongKeToChucCaNhan.stats.exportSuccess'), {
        description: txt('dttgThongKeToChucCaNhan.stats.exportSuccessDesc'),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : txt('dttgThongKeToChucCaNhan.stats.exportError'));
    } finally {
      setExporting(false);
    }
  }, [
    filtered.length,
    kpis,
    donViTable,
    loaiHinhBar,
    doiTuongBar,
    trangThaiBar,
    sortedLookupBase,
    resolvedRange,
    chartRange,
  ]);

  const toggleSort = (key: DttgLookupSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'tg_tao' ? 'desc' : 'asc');
    }
  };

  const handleOpenDetail = (row: DttgThongTinThongKeRow) => {
    if (row.loai === 'to_chuc') {
      if (!canOpenToChucDetail) {
        toast.error(txt('dttgThongKeToChucCaNhan.noDetailPermission'));
        return;
      }
      const source = toChucRows.find((r) => r.id === row.source_id);
      if (source) setViewingToChuc(source);
      return;
    }
    if (!canOpenCaNhanDetail) {
      toast.error(txt('dttgThongKeToChucCaNhan.noDetailPermission'));
      return;
    }
    const source = caNhanRows.find((r) => r.id === row.source_id);
    if (source) setViewingCaNhan(source);
  };

  const canOpenAnyDetail = canOpenToChucDetail || canOpenCaNhanDetail;

  const dateRangeRow = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 w-full">
      <DateRangePicker
        presets={presets}
        value={dateRange}
        onChange={setDateRange}
        placeholder={txt('dttgThongKeToChucCaNhan.dateRangeLabel')}
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
        placeholder={txt('dttgThongKeToChucCaNhan.stats.filterLoai')}
        className="w-[10rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Flag}
        options={trangThaiOptions}
        value={dims.trang_thai}
        onChange={(v) => setDims((d) => ({ ...d, trang_thai: v }))}
        placeholder={txt('dttgThongKeToChucCaNhan.stats.filterTrangThai')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Building2}
        options={loaiHinhOptions}
        value={dims.loai_hinh}
        onChange={(v) => setDims((d) => ({ ...d, loai_hinh: v }))}
        placeholder={txt('dttgThongKeToChucCaNhan.stats.filterLoaiHinh')}
        className="w-[10rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={User}
        options={doiTuongOptions}
        value={dims.doi_tuong}
        onChange={(v) => setDims((d) => ({ ...d, doi_tuong: v }))}
        placeholder={txt('dttgThongKeToChucCaNhan.stats.filterDoiTuong')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={MapPin}
        options={donViOptions}
        value={dims.don_vi_id}
        onChange={(v) => setDims((d) => ({ ...d, don_vi_id: v }))}
        placeholder={txt('dttgThongKeToChucCaNhan.stats.filterDonVi')}
        className="w-[11rem] shrink-0"
      />
    </>
  );

  const toolbarActions = canExport ? (
    <Tooltip content={txt('dttgThongKeToChucCaNhan.stats.exportReport')} placement="bottom">
      <Button
        variant="outline"
        size="sm"
        type="button"
        disabled={exporting}
        onClick={() => void handleExportReport()}
        className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
      >
        <Download className="w-4 h-4" />
      </Button>
    </Tooltip>
  ) : null;

  const kpiItems = useMemo(
    () => [
      {
        id: 'total',
        label: txt('dttgThongKeToChucCaNhan.stats.kpiTotal'),
        value: kpis.total,
        icon: FileText,
        bg: 'bg-primary/10',
        color: 'text-primary',
        delta: null,
      },
      {
        id: 'to_chuc',
        label: txt('dttgThongKeToChucCaNhan.stats.kpiToChuc'),
        value: kpis.toChuc,
        icon: Building2,
        bg: 'bg-blue-500/10',
        color: 'text-blue-600 dark:text-blue-400',
        delta: null,
      },
      {
        id: 'ca_nhan',
        label: txt('dttgThongKeToChucCaNhan.stats.kpiCaNhan'),
        value: kpis.caNhan,
        icon: User,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
      {
        id: 'dang_hd',
        label: txt('dttgThongKeToChucCaNhan.stats.kpiDangHoatDong'),
        value: kpis.dangHoatDong,
        icon: CheckCircle2,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'ngung_hd',
        label: txt('dttgThongKeToChucCaNhan.stats.kpiNgungHoatDong'),
        value: kpis.ngungHoatDong,
        icon: Power,
        bg: 'bg-slate-500/10',
        color: 'text-slate-600 dark:text-slate-400',
        delta: null,
      },
    ],
    [kpis],
  );

  if (!canView) return null;

  return (
    <div className="flex flex-col h-page relative min-h-0" aria-label={txt('dttgThongKeToChucCaNhan.title')}>
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
          <p className="text-sm text-muted-foreground py-8 text-center">
            {txt('dttgThongKeToChucCaNhan.loading')}
          </p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">{txt('dttgThongKeToChucCaNhan.noData')}</p>
            <p className="text-xs text-muted-foreground">{txt('dttgThongKeToChucCaNhan.noDataHint')}</p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                {txt('dttgThongKeToChucCaNhan.stats.clearFilters')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={3} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('dttgThongKeToChucCaNhan.stats.chartTrend')} icon={Star} spanTwo={false}>
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
                        name={txt('dttgThongKeToChucCaNhan.stats.tableTwoColValue')}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('dttgThongKeToChucCaNhan.stats.chartTrangThai')} icon={Flag}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={trangThaiBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={40} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={trangThaiBar}
                        dataKey="count"
                        name={txt('dttgThongKeToChucCaNhan.stats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, {
                            badgeConfig: trangThaiBadge,
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
              <StatsCard title={txt('dttgThongKeToChucCaNhan.stats.chartLoai')} icon={Tag}>
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
                        name={txt('dttgThongKeToChucCaNhan.stats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, {
                            badgeConfig: loaiBadge,
                            labelKey: 'label',
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsTableCard
                title={txt('dttgThongKeToChucCaNhan.stats.chartDonVi')}
                icon={MapPin}
                rows={donViTable.map((r) => ({
                  id: r.id,
                  label: `${r.label} (${txt('dttgThongKeToChucCaNhan.stats.tableColToChuc')}: ${r.toChuc}, ${txt('dttgThongKeToChucCaNhan.stats.tableColCaNhan')}: ${r.caNhan})`,
                  value: r.total,
                }))}
                columnLabelKey="dttgThongKeToChucCaNhan.stats.tableColDonVi"
                columnValueKey="dttgThongKeToChucCaNhan.stats.tableColTotal"
                emptyKey="dttgThongKeToChucCaNhan.noData"
                maxHeight="max-h-[220px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('dttgThongKeToChucCaNhan.stats.chartLoaiHinh')} icon={Building2}>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={loaiHinhBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={40} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={loaiHinhBar}
                        dataKey="count"
                        name={txt('dttgThongKeToChucCaNhan.stats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(_row, i) => chartFillForCategoricalBar(loaiHinhBar[i], i)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('dttgThongKeToChucCaNhan.stats.chartDoiTuong')} icon={User}>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={doiTuongBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-12} textAnchor="end" height={40} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={doiTuongBar}
                        dataKey="count"
                        name={txt('dttgThongKeToChucCaNhan.stats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(_row, i) => chartFillForCategoricalBar(doiTuongBar[i], i)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <StatsCard title={txt('dttgThongKeToChucCaNhan.stats.tableLookupTitle')} icon={Layers}>
              <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[880px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['loai', txt('dttgThongKeToChucCaNhan.stats.tableColLoai')],
                          ['ten', txt('dttgThongKeToChucCaNhan.stats.tableColTen')],
                          ['phan_loai', txt('dttgThongKeToChucCaNhan.stats.tableColPhanLoai')],
                          ['don_vi', txt('dttgThongKeToChucCaNhan.stats.tableColDonVi')],
                          ['trang_thai', txt('dttgThongKeToChucCaNhan.stats.tableColTrangThai')],
                          ['tg_tao', txt('dttgThongKeToChucCaNhan.stats.tableColTgTao')],
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
                            {sortKey === key && (
                              <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                            )}
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLookupBase.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-border/60',
                          canOpenAnyDetail && 'hover:bg-muted/40 cursor-pointer',
                        )}
                        onClick={() => handleOpenDetail(row)}
                      >
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {formatLoaiLabel(
                            row.loai,
                            txt('dttgThongKeToChucCaNhan.stats.filterLoaiToChuc'),
                            txt('dttgThongKeToChucCaNhan.stats.filterLoaiCaNhan'),
                          )}
                        </td>
                        <td className="py-2 pr-3 max-w-[200px] truncate font-medium">{row.ten}</td>
                        <td className="py-2 pr-3 max-w-[140px] truncate">{row.phan_loai}</td>
                        <td className="py-2 pr-3 max-w-[180px] truncate">{formatDonViLabel(row)}</td>
                        <td className="py-2 pr-3">
                          <EnumBadge value={row.trang_thai} config={trangThaiBadge} />
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

      <AnimatePresence>
        {viewingToChuc && canOpenToChucDetail && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ThongTinToChucQuanTrongDetail
              data={viewingToChuc}
              onClose={() => setViewingToChuc(null)}
              onEdit={() => {
                setViewingToChuc(null);
                navigate('/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong');
              }}
              onDelete={() => setViewingToChuc(null)}
            />
          </Suspense>
        )}
        {viewingCaNhan && canOpenCaNhanDetail && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ThongTinCaNhanTieuBieuDetail
              data={viewingCaNhan}
              onClose={() => setViewingCaNhan(null)}
              onEdit={() => {
                setViewingCaNhan(null);
                navigate('/dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu');
              }}
              onDelete={() => setViewingCaNhan(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThongKeToChucCaNhanPage;
