import React, {
  useState,
  useMemo,
  useCallback,
  lazy,
  Suspense,
  useEffect,
  useRef,
} from 'react';
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
  Megaphone,
  Activity,
  CheckCircle2,
  CalendarClock,
  AlertTriangle,
  Percent,
  Layers,
  Flag,
  Tag,
  Building2,
  Download,
  FileText,
  Gauge,
  MapPin,
  Trophy,
  User,
  ClipboardList,
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
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { AnimatePresence } from 'framer-motion';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import ChartTooltip from '@/components/ui/ChartTooltip';
import { congViecDeadlineChipClass } from '@/features/quan-ly-giao-viec/cong-viec/core/display-badges';
import type { CongViecDeadlineChipTone } from '@/features/quan-ly-giao-viec/cong-viec/core/display-badges';
import { useThucHienPhanBienList } from '../thuc-hien-phan-bien-xa-hoi/hooks/use-thuc-hien-phan-bien';
import type { ThucHienPhanBien } from '../thuc-hien-phan-bien-xa-hoi/core/types';
import {
  CAP_THUC_HIEN_VALUES,
  LOAI_HINH_VALUES,
  TINH_TRANG_VALUES,
} from '../thuc-hien-phan-bien-xa-hoi/core/constants';
import { loaiHinhBadge, tinhTrangBadge } from '../thuc-hien-phan-bien-xa-hoi/core/display-badges';
import {
  PBXH_STATS_DON_VI_NONE,
  PBXH_TIEN_DO_FILTER_IDS,
  type PbxhThongKeDimensionFilters,
  type PbxhLookupSortKey,
  resolvePbxhThongKeDateRange,
  resolvePbxhThongKeTrendChartRange,
  filterRowsForPbxhThongKe,
  computePbxhThongKeKpis,
  pickPbxhTrendBucket,
  buildPbxhTrendSeries,
  buildPbxhTinhTrangBarData,
  buildPbxhLoaiHinhBarData,
  buildPbxhCapThucHienBarData,
  aggregatePbxhTopDonViChuTri,
  aggregatePbxhByDonViChuTriTable,
  aggregatePbxhLoaiHinhMatrix,
  aggregatePbxhByNguoiTaoTable,
  aggregatePbxhTopNguoiTaoByTyLe,
  aggregatePbxhTopHoatDongByPhanTram,
  buildPbxhAvgPhanTramByLoaiHinhBarData,
  buildPbxhAvgPhanTramTrendSeries,
  sortPbxhLookupRows,
  formatPbxhTienDoLabel,
  getPbxhTienDoFilterId,
} from './utils/aggregate-pbxh-thong-ke-stats';
import { exportPbxhThongKeReportToExcel } from './utils/export-pbxh-thong-ke-report';

const ThucHienPhanBienDetail = lazy(
  () => import('../thuc-hien-phan-bien-xa-hoi/components/thuc-hien-phan-bien-detail'),
);

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'thisMonth',
  customStart: '',
  customEnd: '',
};

const initialDims: PbxhThongKeDimensionFilters = {
  cap_thuc_hien: [],
  loai_hinh: [],
  tinh_trang: [],
  don_vi_chu_tri_id: [],
  tien_do: [],
};

const TOP_N = 10;

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
  rows: ThucHienPhanBien[],
  pick: (r: ThucHienPhanBien) => { id: string; label: string },
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

function pbxhTienDoChipTone(row: ThucHienPhanBien): CongViecDeadlineChipTone {
  const cat = getPbxhTienDoFilterId(row);
  if (row.tinh_trang === 'Đã hoàn thành') return 'slate';
  if (cat === 'qua_han') return 'rose';
  if (cat === 'sap_den_han') return 'amber';
  if (cat === 'khong_co_han') return 'slate';
  return 'emerald';
}

const ThongKePhanBienXaHoiPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'phanBienThongKe');
  const canOpenDetail = useCan('view', 'phanBienThucHien');
  const { canExport } = useResourcePermissions('phanBienThongKe');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('pbxhThongKe.noViewPermission'));
    navigate('/phan-bien-xa-hoi', { replace: true });
  }, [user, canView, navigate]);

  const { data: rows = [], isLoading } = useThucHienPhanBienList({ enabled: canView });

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [dims, setDims] = useState<PbxhThongKeDimensionFilters>(initialDims);
  const [sortKey, setSortKey] = useState<PbxhLookupSortKey>('noi_dung');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewing, setViewing] = useState<ThucHienPhanBien | null>(null);
  const [exporting, setExporting] = useState(false);

  const presets = useMemo(() => buildStandardDateRangePresets(), []);

  const resolvedRange = useMemo(
    () => resolvePbxhThongKeDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const filtered = useMemo(
    () => filterRowsForPbxhThongKe(rows, resolvedRange, dims),
    [rows, resolvedRange, dims],
  );

  const kpis = useMemo(() => computePbxhThongKeKpis(filtered), [filtered]);
  const chartRange = useMemo(
    () => resolvePbxhThongKeTrendChartRange(resolvedRange, rows),
    [resolvedRange, rows],
  );
  const bucket = useMemo(() => pickPbxhTrendBucket(chartRange.start, chartRange.end), [chartRange]);
  const trendSeries = useMemo(
    () => buildPbxhTrendSeries(filtered, chartRange, bucket),
    [filtered, chartRange, bucket],
  );
  const tinhTrangBar = useMemo(() => buildPbxhTinhTrangBarData(filtered), [filtered]);
  const loaiHinhBar = useMemo(() => buildPbxhLoaiHinhBarData(filtered), [filtered]);
  const capBar = useMemo(() => buildPbxhCapThucHienBarData(filtered), [filtered]);
  const topDonVi = useMemo(() => aggregatePbxhTopDonViChuTri(filtered, TOP_N), [filtered]);
  const donViTable = useMemo(() => aggregatePbxhByDonViChuTriTable(filtered), [filtered]);
  const matrixRows = useMemo(() => aggregatePbxhLoaiHinhMatrix(filtered), [filtered]);
  const nguoiTaoTable = useMemo(() => aggregatePbxhByNguoiTaoTable(filtered), [filtered]);
  const topNguoiTao = useMemo(() => aggregatePbxhTopNguoiTaoByTyLe(filtered, TOP_N), [filtered]);
  const topHoatDong = useMemo(() => aggregatePbxhTopHoatDongByPhanTram(filtered, TOP_N), [filtered]);
  const avgPhanTramLoaiHinh = useMemo(() => buildPbxhAvgPhanTramByLoaiHinhBarData(filtered), [filtered]);
  const avgPhanTramTrend = useMemo(
    () => buildPbxhAvgPhanTramTrendSeries(filtered, chartRange, bucket),
    [filtered, chartRange, bucket],
  );

  const sortedLookupBase = useMemo(
    () => sortPbxhLookupRows(filtered, sortKey, sortDir, getLanguage),
    [filtered, sortKey, sortDir],
  );

  const capOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of CAP_THUC_HIEN_VALUES) counts.set(v, 0);
    for (const r of rows) counts.set(r.cap_thuc_hien, (counts.get(r.cap_thuc_hien) ?? 0) + 1);
    return CAP_THUC_HIEN_VALUES.map((value) => ({
      value,
      label: value,
      count: counts.get(value) ?? 0,
    }));
  }, [rows]);

  const loaiHinhOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of LOAI_HINH_VALUES) counts.set(v, 0);
    for (const r of rows) counts.set(r.loai_hinh, (counts.get(r.loai_hinh) ?? 0) + 1);
    return LOAI_HINH_VALUES.map((value) => ({
      value,
      label: value,
      count: counts.get(value) ?? 0,
    }));
  }, [rows]);

  const tinhTrangOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of TINH_TRANG_VALUES) counts.set(v, 0);
    for (const r of rows) counts.set(r.tinh_trang, (counts.get(r.tinh_trang) ?? 0) + 1);
    return TINH_TRANG_VALUES.map((value) => ({
      value,
      label: value,
      count: counts.get(value) ?? 0,
    }));
  }, [rows]);

  const donViChuTriOptions = useMemo(
    () =>
      buildDimOptions(rows, (r) => ({
        id: r.don_vi_chu_tri_id?.trim() ? String(r.don_vi_chu_tri_id) : PBXH_STATS_DON_VI_NONE,
        label: (r.ten_don_vi_chu_tri ?? '').trim() || txt('pbxhThongKe.stats.donViChuaGan'),
      })),
    [rows],
  );

  const tienDoOptions = useMemo(() => {
    const labelOf = (id: (typeof PBXH_TIEN_DO_FILTER_IDS)[number]) => {
      switch (id) {
        case 'qua_han':
          return txt('pbxhThongKe.stats.filterTienDoQuaHan');
        case 'sap_den_han':
          return txt('pbxhThongKe.stats.filterTienDoSapDenHan');
        case 'con_han':
          return txt('pbxhThongKe.stats.filterTienDoConHan');
        case 'khong_co_han':
          return txt('pbxhThongKe.stats.filterTienDoKhongCoHan');
        default:
          return id;
      }
    };
    const counts = new Map<string, number>();
    for (const id of PBXH_TIEN_DO_FILTER_IDS) counts.set(id, 0);
    for (const r of rows) {
      const k = getPbxhTienDoFilterId(r);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return PBXH_TIEN_DO_FILTER_IDS.map((value) => ({
      value,
      label: labelOf(value),
      count: counts.get(value) ?? 0,
    }));
  }, [rows]);

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'cap_thuc_hien',
        label: txt('pbxhThongKe.stats.filterCapThucHien'),
        icon: MapPin,
        options: capOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.cap_thuc_hien,
        onChange: (v) => setDims((d) => ({ ...d, cap_thuc_hien: v })),
      },
      {
        key: 'loai_hinh',
        label: txt('pbxhThongKe.stats.filterLoaiHinh'),
        icon: Tag,
        options: loaiHinhOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.loai_hinh,
        onChange: (v) => setDims((d) => ({ ...d, loai_hinh: v })),
      },
      {
        key: 'tinh_trang',
        label: txt('pbxhThongKe.stats.filterTinhTrang'),
        icon: Flag,
        options: tinhTrangOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.tinh_trang,
        onChange: (v) => setDims((d) => ({ ...d, tinh_trang: v })),
      },
      {
        key: 'don_vi_chu_tri_id',
        label: txt('pbxhThongKe.stats.filterDonViChuTri'),
        icon: Building2,
        options: donViChuTriOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.don_vi_chu_tri_id,
        onChange: (v) => setDims((d) => ({ ...d, don_vi_chu_tri_id: v })),
      },
      {
        key: 'tien_do',
        label: txt('pbxhThongKe.stats.filterTienDo'),
        icon: Gauge,
        options: tienDoOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.tien_do,
        onChange: (v) => setDims((d) => ({ ...d, tien_do: v })),
      },
    ],
    [capOptions, loaiHinhOptions, tinhTrangOptions, donViChuTriOptions, tienDoOptions, dims],
  );

  const isNonDefaultDateRange = useMemo(
    () => isStandardDateRangeNonDefault(dateRange, 'thisMonth'),
    [dateRange],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (isNonDefaultDateRange) n += 1;
    if (dims.cap_thuc_hien.length) n += 1;
    if (dims.loai_hinh.length) n += 1;
    if (dims.tinh_trang.length) n += 1;
    if (dims.don_vi_chu_tri_id.length) n += 1;
    if (dims.tien_do.length) n += 1;
    return n;
  }, [dims, isNonDefaultDateRange]);

  const clearFilters = useCallback(() => {
    setDims(initialDims);
    setDateRange(initialDateRange);
  }, []);

  const handleExportReport = useCallback(async () => {
    if (filtered.length === 0) {
      toast.warning(txt('pbxhThongKe.noExportData'));
      return;
    }
    setExporting(true);
    try {
      await exportPbxhThongKeReportToExcel({
        kpis,
        donViRows: donViTable,
        nguoiTaoRows: nguoiTaoTable,
        topHoatDongRows: topHoatDong,
        loaiHinhRows: loaiHinhBar,
        avgPhanTramLoaiHinhRows: avgPhanTramLoaiHinh,
        matrixRows,
        lookupRows: sortedLookupBase,
        range: resolvedRange,
      });
      toast.success(txt('pbxhThongKe.stats.exportSuccess'), {
        description: txt('pbxhThongKe.stats.exportSuccessDesc'),
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : txt('pbxhThongKe.stats.exportError'));
    } finally {
      setExporting(false);
    }
  }, [
    filtered.length,
    kpis,
    donViTable,
    nguoiTaoTable,
    topHoatDong,
    loaiHinhBar,
    avgPhanTramLoaiHinh,
    matrixRows,
    sortedLookupBase,
    resolvedRange,
  ]);

  const kpiItems = useMemo(
    () => [
      {
        id: 'total',
        label: txt('pbxhThongKe.stats.kpiTotal'),
        value: kpis.total,
        icon: Megaphone,
        bg: 'bg-primary/10',
        color: 'text-primary',
        delta: null,
      },
      {
        id: 'dth',
        label: txt('pbxhThongKe.stats.kpiDangThucHien'),
        value: kpis.dangThucHien,
        icon: Activity,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
      {
        id: 'ht',
        label: txt('pbxhThongKe.stats.kpiHoanThanh'),
        value: kpis.hoanThanh,
        icon: CheckCircle2,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'kh',
        label: txt('pbxhThongKe.stats.kpiKeHoachDuKien'),
        value: kpis.keHoachDuKien,
        icon: CalendarClock,
        bg: 'bg-amber-500/10',
        color: 'text-amber-600 dark:text-amber-400',
        delta: null,
      },
      {
        id: 'qh',
        label: txt('pbxhThongKe.stats.kpiQuaHan'),
        value: kpis.quaHan,
        icon: AlertTriangle,
        bg: 'bg-rose-500/10',
        color: 'text-rose-600 dark:text-rose-400',
        delta: null,
      },
      {
        id: 'avg',
        label: txt('pbxhThongKe.stats.kpiAvgPhanTram'),
        value: `${kpis.avgPhanTram}%`,
        icon: Percent,
        bg: 'bg-violet-500/10',
        color: 'text-violet-600 dark:text-violet-400',
        delta: null,
      },
      {
        id: 'tyle',
        label: txt('pbxhThongKe.stats.kpiTyLeThucTe'),
        value: `${kpis.tyLeThucTe}%`,
        icon: Trophy,
        bg: 'bg-amber-500/10',
        color: 'text-amber-600 dark:text-amber-400',
        delta: null,
      },
      {
        id: 'sumht',
        label: txt('pbxhThongKe.stats.kpiSumLanHoanThanh'),
        value: kpis.sumSoLanHoanThanh,
        icon: CheckCircle2,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'sumks',
        label: txt('pbxhThongKe.stats.kpiSumLanKhaoSat'),
        value: kpis.sumSoLanKhaoSat,
        icon: ClipboardList,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
    ],
    [kpis],
  );

  const topNguoiTaoChartData = useMemo(
    () =>
      [...topNguoiTao]
        .map((r) => ({
          name: r.label.length > 18 ? `${r.label.slice(0, 16)}…` : r.label,
          tyLe: r.tyLeThucTe,
          avgPhanTram: r.avgPhanTram,
        }))
        .reverse(),
    [topNguoiTao],
  );

  const toggleSort = (key: PbxhLookupSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'phan_tram_hoan_thanh' || key === 'so_lan_hoan_thanh' || key === 'so_lan_khao_sat' || key === 'tien_do' ? 'desc' : 'asc');
    }
  };

  const handleOpenDetail = (row: ThucHienPhanBien) => {
    if (!canOpenDetail) {
      toast.error(txt('pbxhThongKe.noDetailPermission'));
      return;
    }
    setViewing(row);
  };

  const dateRangeRow = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 w-full">
      <DateRangePicker
        presets={presets}
        value={dateRange}
        onChange={setDateRange}
        placeholder={txt('pbxhThongKe.dateRangeLabel')}
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
        icon={MapPin}
        options={capOptions}
        value={dims.cap_thuc_hien}
        onChange={(v) => setDims((d) => ({ ...d, cap_thuc_hien: v }))}
        placeholder={txt('pbxhThongKe.stats.filterCapThucHien')}
        className="w-[10rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Tag}
        options={loaiHinhOptions}
        value={dims.loai_hinh}
        onChange={(v) => setDims((d) => ({ ...d, loai_hinh: v }))}
        placeholder={txt('pbxhThongKe.stats.filterLoaiHinh')}
        className="w-[10rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Flag}
        options={tinhTrangOptions}
        value={dims.tinh_trang}
        onChange={(v) => setDims((d) => ({ ...d, tinh_trang: v }))}
        placeholder={txt('pbxhThongKe.stats.filterTinhTrang')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Building2}
        options={donViChuTriOptions}
        value={dims.don_vi_chu_tri_id}
        onChange={(v) => setDims((d) => ({ ...d, don_vi_chu_tri_id: v }))}
        placeholder={txt('pbxhThongKe.stats.filterDonViChuTri')}
        className="w-[11rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Gauge}
        options={tienDoOptions}
        value={dims.tien_do}
        onChange={(v) => setDims((d) => ({ ...d, tien_do: v }))}
        placeholder={txt('pbxhThongKe.stats.filterTienDo')}
        className="w-[9.5rem] shrink-0"
      />
    </>
  );

  const toolbarActions = canExport ? (
    <Tooltip content={txt('pbxhThongKe.stats.exportReport')} placement="bottom">
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

  if (!canView) return null;

  return (
    <div className="flex flex-col min-h-0 flex-1">
      <DashboardToolbar
        onBack={() => navigate('/phan-bien-xa-hoi')}
        filters={filterPanelDesktop}
        actions={toolbarActions}
        mobileActions={toolbarActions}
        filterGroups={filterGroups}
        activeFilterCount={activeFilterCount}
        onClearFilters={activeFilterCount > 0 ? clearFilters : undefined}
        row2Content={filterPanelDesktop}
        row2ContentMobileOnly
        mobileRow2Content={dateRangeRow}
        desktopToolbarWrap
        filtersWrapperClassName="flex-1 min-w-0"
      />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{txt('pbxhThongKe.loading')}</p>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm font-medium text-foreground">{txt('pbxhThongKe.noData')}</p>
            <p className="text-sm text-muted-foreground mt-1">{txt('pbxhThongKe.noDataHint')}</p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                {txt('pbxhThongKe.stats.clearFilters')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('pbxhThongKe.stats.chartTrend')} icon={FileText} spanTwo={false}>
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
                        name={txt('pbxhThongKe.stats.tableTwoColValue')}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('pbxhThongKe.stats.chartTinhTrang')} icon={Flag}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={tinhTrangBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={tinhTrangBar}
                        dataKey="count"
                        name={txt('pbxhThongKe.stats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, {
                            badgeConfig: tinhTrangBadge,
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
              <StatsCard title={txt('pbxhThongKe.stats.chartLoaiHinh')} icon={Tag}>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={loaiHinhBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={45} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={loaiHinhBar}
                        dataKey="count"
                        name={txt('pbxhThongKe.stats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, {
                            badgeConfig: loaiHinhBadge,
                            labelKey: 'label',
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('pbxhThongKe.stats.chartCapThucHien')} icon={MapPin}>
                <div className="h-[220px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={capBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={capBar}
                        dataKey="count"
                        name={txt('pbxhThongKe.stats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) => chartFillForCategoricalBar(row, i, { labelKey: 'label' })}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('pbxhThongKe.stats.chartAvgPhanTramTrend')} icon={Percent}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <LineChart data={avgPhanTramTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="avgPhanTram"
                        name={txt('pbxhThongKe.stats.kpiAvgPhanTram')}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('pbxhThongKe.stats.chartAvgPhanTramLoaiHinh')} icon={Tag}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                    <BarChart data={avgPhanTramLoaiHinh} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={45} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={avgPhanTramLoaiHinh}
                        dataKey="avgPhanTram"
                        name={txt('pbxhThongKe.stats.tableColAvgPhanTramLoai')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, {
                            badgeConfig: loaiHinhBadge,
                            labelKey: 'label',
                          })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <StatsCard title={txt('pbxhThongKe.stats.chartTopNguoiTaoTyLe')} icon={Trophy} spanTwo>
              <div className="h-[300px] w-full min-w-0">
                {topNguoiTaoChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">{txt('pbxhThongKe.noData')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={topNguoiTaoChartData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar
                        dataKey="tyLe"
                        name={txt('pbxhThongKe.stats.tableColTyLeThucTe')}
                        fill="hsl(var(--primary))"
                        maxBarSize={18}
                        radius={[0, 4, 4, 0]}
                      />
                      <Bar
                        dataKey="avgPhanTram"
                        name={txt('pbxhThongKe.stats.kpiAvgPhanTram')}
                        fill="hsl(var(--chart-2))"
                        maxBarSize={18}
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </StatsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('pbxhThongKe.stats.tableNguoiTaoRank')} icon={User}>
                <div className="overflow-x-auto max-h-[min(320px,40vh)] overflow-y-auto -m-4">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 px-3 font-medium w-10">{txt('pbxhThongKe.stats.tableColRank')}</th>
                        <th className="py-2 pr-3 font-medium">{txt('pbxhThongKe.stats.tableColNguoiTao')}</th>
                        <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColTotal')}</th>
                        <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColSoLanHoanThanh')}</th>
                        <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColSoLanKhaoSat')}</th>
                        <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColTyLeThucTe')}</th>
                        <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColAvgPhanTram')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nguoiTaoTable.map((row, idx) => (
                        <tr key={row.id} className="border-b border-border/60">
                          <td className="py-2 px-3 tabular-nums text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 pr-3 max-w-[180px] truncate">{row.label}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.total}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.sumSoLanHoanThanh}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.sumSoLanKhaoSat}</td>
                          <td className="py-2 pr-3 text-right tabular-nums font-medium text-primary">{row.tyLeThucTe}%</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.avgPhanTram}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </StatsCard>

              <StatsCard title={txt('pbxhThongKe.stats.tableTopHoatDong')} icon={Trophy}>
                <div className="overflow-x-auto max-h-[min(320px,40vh)] overflow-y-auto -m-4">
                  <table className="w-full text-sm min-w-[860px]">
                    <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 px-3 font-medium w-10">{txt('pbxhThongKe.stats.tableColRank')}</th>
                        <th className="py-2 pr-3 font-medium">{txt('pbxhThongKe.stats.tableColNoiDung')}</th>
                        <th className="py-2 pr-3 font-medium">{txt('pbxhThongKe.stats.tableColNguoiTao')}</th>
                        <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColPhanTram')}</th>
                        <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColSoLanHoanThanh')}</th>
                        <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColSoLanKhaoSat')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topHoatDong.map((row, idx) => (
                        <tr key={row.id} className="border-b border-border/60">
                          <td className="py-2 px-3 tabular-nums text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 pr-3 max-w-[200px] truncate font-medium" title={row.noi_dung}>
                            {row.noi_dung}
                          </td>
                          <td className="py-2 pr-3 max-w-[120px] truncate">{row.nguoi_tao_label}</td>
                          <td className="py-2 pr-3 text-right tabular-nums font-medium text-primary">{row.phan_tram_hoan_thanh}%</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.so_lan_hoan_thanh}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.so_lan_khao_sat}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsTableCard
                title={txt('pbxhThongKe.stats.chartTopDonViChuTri')}
                icon={Building2}
                rows={topDonVi.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="pbxhThongKe.stats.tableTwoColLabel"
                columnValueKey="pbxhThongKe.stats.tableTwoColValue"
                emptyKey="pbxhThongKe.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('pbxhThongKe.stats.tableMatrix')}
                icon={Layers}
                rows={matrixRows.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="pbxhThongKe.stats.tableMatrixCol"
                columnValueKey="pbxhThongKe.stats.tableTwoColValue"
                emptyKey="pbxhThongKe.noData"
                maxHeight="max-h-[220px]"
              />
            </div>

            <StatsCard title={txt('pbxhThongKe.stats.tableDonViChuTri')} icon={Building2}>
              <div className="overflow-x-auto max-h-[min(320px,40vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[860px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2 px-4 font-medium">{txt('pbxhThongKe.stats.tableColDonVi')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColTotal')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColDangTh')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColHoanThanh')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColSoLanHoanThanh')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColSoLanKhaoSat')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColTyLeDonVi')}</th>
                      <th className="py-2 pr-3 font-medium text-right">{txt('pbxhThongKe.stats.tableColAvgPhanTram')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donViTable.map((row) => (
                      <tr key={row.id} className="border-b border-border/60">
                        <td className="py-2 px-4 max-w-[240px] truncate">{row.label}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{row.total}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{row.dangThucHien}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{row.hoanThanh}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{row.sumSoLanHoanThanh}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{row.sumSoLanKhaoSat}</td>
                        <td className="py-2 pr-3 text-right tabular-nums font-medium">{row.tyLeThucTe}%</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{row.avgPhanTram}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StatsCard>

            <StatsCard title={txt('pbxhThongKe.stats.tableLookupTitle')} icon={Layers}>
              <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[900px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['noi_dung', txt('pbxhThongKe.stats.tableColNoiDung')],
                          ['loai_hinh', txt('pbxhThongKe.stats.tableColLoaiHinh')],
                          ['tinh_trang', txt('pbxhThongKe.stats.tableColTinhTrang')],
                          ['ten_don_vi_chu_tri', txt('pbxhThongKe.stats.tableColDonViChuTri')],
                          ['tien_do', txt('pbxhThongKe.stats.tableColTienDo')],
                          ['so_lan_hoan_thanh', txt('pbxhThongKe.stats.tableColSoLanHoanThanh')],
                          ['so_lan_khao_sat', txt('pbxhThongKe.stats.tableColSoLanKhaoSat')],
                          ['phan_tram_hoan_thanh', txt('pbxhThongKe.stats.tableColPhanTram')],
                          ['ngay_ket_thuc', txt('pbxhThongKe.stats.tableColNgayKetThuc')],
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
                          canOpenDetail && 'hover:bg-muted/40 cursor-pointer',
                        )}
                        onClick={() => handleOpenDetail(row)}
                      >
                        <td className="py-2 pr-3 max-w-[220px] truncate font-medium">{row.noi_dung}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{row.loai_hinh}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{row.tinh_trang}</td>
                        <td className="py-2 pr-3 max-w-[160px] truncate">{row.ten_don_vi_chu_tri?.trim() || '—'}</td>
                        <td className="py-2 pr-3 max-w-[180px]">
                          <span
                            className={congViecDeadlineChipClass(
                              pbxhTienDoChipTone(row),
                              'text-xs max-w-full truncate',
                            )}
                          >
                            {formatPbxhTienDoLabel(row)}
                          </span>
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{row.so_lan_hoan_thanh}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.so_lan_khao_sat}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.phan_tram_hoan_thanh}%</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{row.ngay_ket_thuc ?? '—'}</td>
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
        {viewing && canOpenDetail && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <ThucHienPhanBienDetail
              data={viewing}
              onClose={() => setViewing(null)}
              onEdit={() => {
                setViewing(null);
                navigate('/phan-bien-xa-hoi/thuc-hien-phan-bien-xa-hoi');
              }}
              onDelete={() => setViewing(null)}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ThongKePhanBienXaHoiPage;
