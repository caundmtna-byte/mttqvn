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
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, BarChart } from 'recharts';
import {
  Users,
  User,
  Building2,
  MapPin,
  Briefcase,
  Flag,
  Layers,
  Download,
  FileText,
  Heart,
  GraduationCap,
  BookOpen,
  Landmark,
  Binary,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { cn, getLanguage } from '@/lib/utils';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import DateRangePicker, { type DateRangeValue } from '@/components/ui/DateRangePicker';
import { StatsKpiGrid, StatsCard, StatsTableCard, ColoredBar } from '@/components/shared/stats';
import { CHART_FILL_FALLBACK, GIOI_TINH_CHART_COLORS } from '@/lib/constants/chart-colors';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import type { Option } from '@/components/ui/MultiSelect';
import ExportDialog from '@/components/shared/ExportDialog';
import { useExportData } from '@/lib/useExportData';
import { useAuthStore } from '@/store/useStore';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { AnimatePresence } from 'framer-motion';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useMttqCanBoStatsList } from '../danh-sach-can-bo/hooks/use-mttq-can-bo';
import type { MttqCanBoRow } from '../danh-sach-can-bo/core/types';
import { computeAgeFromBirthDate } from '../danh-sach-can-bo/utils/age';
import { formatCanBoPhoneDisplay } from '../danh-sach-can-bo/utils/display-format';
import { CHIP_TRANG_THAI_NULL } from '../danh-sach-can-bo/core/constants';
import { normalizeCapQuanLyInput } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import ChartTooltip from '@/components/ui/ChartTooltip';
import {
  type OfficerStatsDimensionFilters,
  resolveOfficerStatsDateRange,
  resolveOfficerStatsTrendChartRange,
  filterRowsForOfficerStats,
  computeOfficerStatsKpis,
  pickTrendBucket,
  buildOfficerTrendSeries,
  aggregateOfficerTopCounts,
  buildGioiTinhBarData,
  sortOfficerLookupRows,
  type OfficerLookupSortKey,
} from './utils/aggregate-mttq-can-bo-stats';

const MttqCanBoDetail = lazy(() => import('../danh-sach-can-bo/components/mttq-can-bo-detail'));

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'all',
  customStart: '',
  customEnd: '',
};

const initialDims: OfficerStatsDimensionFilters = {
  trang_thai_id: [],
  gioi_tinh: [],
  chuc_vu_id: [],
  cap_quan_ly: [],
  phong_ban_id: [],
  don_vi_id: [],
  dan_toc_id: [],
  trinh_do_id: [],
  ly_luan_chinh_tri_id: [],
  to_chuc_id: [],
  dang_vien: [],
};

const EXPORT_PAGINATION = { page: 1, pageSize: 100_000 };

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
  rows: MttqCanBoRow[],
  pick: (r: MttqCanBoRow) => { id: string; label: string },
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

const BaoCaoCanBoPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  /** Giống module Phòng ban: chỉ `view` trên resource module báo cáo. */
  const canView = useCan('view', 'matTranOfficerStats');
  const { canExport } = useResourcePermissions('matTranOfficerStats');
  /** Drawer chi tiết cán bộ vẫn thuộc quyền danh sách cán bộ. */
  const canOpenDetail = useCan('view', 'matTranOfficerList');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranOfficerStats.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const { data: rows = [], isLoading } = useMttqCanBoStatsList({ enabled: canView });

  const rowsEnriched = useMemo<MttqCanBoRow[]>(
    () =>
      rows.map((r) => ({
        ...r,
        tuoi: computeAgeFromBirthDate(r.ngay_sinh),
      })),
    [rows],
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [dims, setDims] = useState<OfficerStatsDimensionFilters>(initialDims);
  const [sortKey, setSortKey] = useState<OfficerLookupSortKey>('ho_ten');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewing, setViewing] = useState<MttqCanBoRow | null>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (!viewing) return;
    const fresh = rowsEnriched.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rowsEnriched, viewing]);

  const presets = useMemo(
    () => [
      { id: 'all', label: txt('matTranOfficerStats.preset.all') },
      { id: 'thisWeek', label: txt('matTranOfficerStats.preset.thisWeek') },
      { id: 'thisMonth', label: txt('matTranOfficerStats.preset.thisMonth') },
      { id: 'thisQuarter', label: txt('matTranOfficerStats.preset.thisQuarter') },
      { id: 'thisYear', label: txt('matTranOfficerStats.preset.thisYear') },
      { id: CUSTOM_PRESET, label: txt('matTranOfficerStats.preset.custom') },
    ],
    [],
  );

  const resolvedRange = useMemo(
    () => resolveOfficerStatsDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const filtered = useMemo(
    () => filterRowsForOfficerStats(rowsEnriched, resolvedRange, dims),
    [rowsEnriched, resolvedRange, dims],
  );

  const chartRange = useMemo(
    () => resolveOfficerStatsTrendChartRange(resolvedRange, filtered),
    [resolvedRange, filtered],
  );

  const kpis = useMemo(() => computeOfficerStatsKpis(filtered), [filtered]);

  const bucket = useMemo(() => pickTrendBucket(chartRange.start, chartRange.end), [chartRange]);
  const trendSeries = useMemo(
    () => buildOfficerTrendSeries(filtered, chartRange, bucket),
    [filtered, chartRange, bucket],
  );

  const topPhongBan = useMemo(() => {
    const rowsTop = aggregateOfficerTopCounts(filtered, 'phong_ban', 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const topDonVi = useMemo(() => {
    const rowsTop = aggregateOfficerTopCounts(filtered, 'don_vi', 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const topChucVu = useMemo(() => {
    const rowsTop = aggregateOfficerTopCounts(filtered, 'chuc_vu', 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const gioiTinhBar = useMemo(() => buildGioiTinhBarData(filtered), [filtered]);

  const sortedLookupBase = useMemo(
    () => sortOfficerLookupRows(filtered, sortKey, sortDir, getLanguage),
    [filtered, sortKey, sortDir],
  );


  const trangThaiOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.trang_thai_id?.trim() ? String(r.trang_thai_id) : CHIP_TRANG_THAI_NULL,
        label: r.ten_trang_thai?.trim() || txt('matTranOfficerStats.trangThaiChuaGan'),
      })),
    [rowsEnriched],
  );

  const gioiTinhOptions = useMemo(
    () => buildDimOptions(rowsEnriched, (r) => ({ id: String(r.gioi_tinh), label: String(r.gioi_tinh) })),
    [rowsEnriched],
  );

  const chucVuOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.chuc_vu_id?.trim() ? String(r.chuc_vu_id) : CHIP_TRANG_THAI_NULL,
        label: r.ten_chuc_vu?.trim() || '—',
      })),
    [rowsEnriched],
  );

  const capQuanLyOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => {
        const norm = normalizeCapQuanLyInput(r.chuc_vu_cap_quan_ly);
        return {
          id: norm ?? CHIP_TRANG_THAI_NULL,
          label: norm ?? txt('matTranOfficerStats.capQuanLyChuaGan'),
        };
      }),
    [rowsEnriched],
  );

  const phongBanOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.phong_ban_id?.trim() ? String(r.phong_ban_id) : CHIP_TRANG_THAI_NULL,
        label:
          [r.ten_bo_phan?.trim(), r.ten_phong_ban?.trim()].filter(Boolean).join(' — ') ||
          (r.phong_ban_id ? String(r.phong_ban_id) : '—'),
      })),
    [rowsEnriched],
  );

  const donViOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.don_vi_id?.trim() ? String(r.don_vi_id) : CHIP_TRANG_THAI_NULL,
        label: r.ten_don_vi?.trim() || '—',
      })),
    [rowsEnriched],
  );

  const danTocOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.dan_toc_id?.trim() ? String(r.dan_toc_id) : CHIP_TRANG_THAI_NULL,
        label: r.ten_dan_toc?.trim() || '—',
      })),
    [rowsEnriched],
  );

  const trinhDoOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.trinh_do_id?.trim() ? String(r.trinh_do_id) : CHIP_TRANG_THAI_NULL,
        label: r.ten_trinh_do?.trim() || '—',
      })),
    [rowsEnriched],
  );

  const lyLuanChinhTriOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.ly_luan_chinh_tri_id?.trim() ? String(r.ly_luan_chinh_tri_id) : CHIP_TRANG_THAI_NULL,
        label: r.ten_ly_luan_chinh_tri?.trim() || '—',
      })),
    [rowsEnriched],
  );

  const toChucOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.to_chuc_id?.trim() ? String(r.to_chuc_id) : CHIP_TRANG_THAI_NULL,
        label: r.ten_to_chuc?.trim() || '—',
      })),
    [rowsEnriched],
  );

  const dangVienOptions = useMemo<Option[]>(
    () => [
      { value: 'true', label: txt('matTranOfficerStats.dangVienYes'), count: rowsEnriched.filter((r) => r.dang_vien).length },
      { value: 'false', label: txt('matTranOfficerStats.dangVienNo'), count: rowsEnriched.filter((r) => !r.dang_vien).length },
    ],
    [rowsEnriched],
  );

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'trang_thai',
        label: txt('matTranOfficerStats.filterTrangThai'),
        icon: Flag,
        options: trangThaiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.trang_thai_id,
        onChange: (v) => setDims((d) => ({ ...d, trang_thai_id: v })),
      },
      {
        key: 'gioi_tinh',
        label: txt('matTranOfficerStats.filterGioiTinh'),
        icon: User,
        options: gioiTinhOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.gioi_tinh,
        onChange: (v) => setDims((d) => ({ ...d, gioi_tinh: v })),
      },
      {
        key: 'chuc_vu',
        label: txt('matTranOfficerStats.filterChucVu'),
        icon: Briefcase,
        options: chucVuOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.chuc_vu_id,
        onChange: (v) => setDims((d) => ({ ...d, chuc_vu_id: v })),
      },
      {
        key: 'cap_quan_ly',
        label: txt('matTranOfficerStats.filterCapQuanLy'),
        icon: Binary,
        options: capQuanLyOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.cap_quan_ly,
        onChange: (v) => setDims((d) => ({ ...d, cap_quan_ly: v })),
      },
      {
        key: 'phong_ban',
        label: txt('matTranOfficerStats.filterPhongBan'),
        icon: Building2,
        options: phongBanOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.phong_ban_id,
        onChange: (v) => setDims((d) => ({ ...d, phong_ban_id: v })),
      },
      {
        key: 'don_vi',
        label: txt('matTranOfficerStats.filterDonVi'),
        icon: MapPin,
        options: donViOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.don_vi_id,
        onChange: (v) => setDims((d) => ({ ...d, don_vi_id: v })),
      },
      {
        key: 'dan_toc',
        label: txt('matTranOfficerStats.filterDanToc'),
        icon: Users,
        options: danTocOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.dan_toc_id,
        onChange: (v) => setDims((d) => ({ ...d, dan_toc_id: v })),
      },
      {
        key: 'trinh_do',
        label: txt('matTranOfficerStats.filterTrinhDo'),
        icon: GraduationCap,
        options: trinhDoOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.trinh_do_id,
        onChange: (v) => setDims((d) => ({ ...d, trinh_do_id: v })),
      },
      {
        key: 'ly_luan_chinh_tri',
        label: txt('matTranOfficerStats.filterLyLuanChinhTri'),
        icon: BookOpen,
        options: lyLuanChinhTriOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.ly_luan_chinh_tri_id,
        onChange: (v) => setDims((d) => ({ ...d, ly_luan_chinh_tri_id: v })),
      },
      {
        key: 'to_chuc',
        label: txt('matTranOfficerStats.filterToChuc'),
        icon: Landmark,
        options: toChucOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.to_chuc_id,
        onChange: (v) => setDims((d) => ({ ...d, to_chuc_id: v })),
      },
      {
        key: 'dang_vien',
        label: txt('matTranOfficerStats.filterDangVien'),
        icon: Heart,
        options: dangVienOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.dang_vien,
        onChange: (v) => setDims((d) => ({ ...d, dang_vien: v })),
      },
    ],
    [
      trangThaiOptions,
      gioiTinhOptions,
      chucVuOptions,
      capQuanLyOptions,
      phongBanOptions,
      donViOptions,
      danTocOptions,
      trinhDoOptions,
      lyLuanChinhTriOptions,
      toChucOptions,
      dangVienOptions,
      dims,
    ],
  );

  const isNonDefaultDateRange = useMemo(() => {
    if (dateRange.preset === 'custom') {
      return Boolean(dateRange.customStart && dateRange.customEnd);
    }
    return dateRange.preset !== 'all';
  }, [dateRange]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (isNonDefaultDateRange) n += 1;
    if (dims.trang_thai_id.length) n += 1;
    if (dims.gioi_tinh.length) n += 1;
    if (dims.chuc_vu_id.length) n += 1;
    if (dims.cap_quan_ly.length) n += 1;
    if (dims.phong_ban_id.length) n += 1;
    if (dims.don_vi_id.length) n += 1;
    if (dims.dan_toc_id.length) n += 1;
    if (dims.trinh_do_id.length) n += 1;
    if (dims.ly_luan_chinh_tri_id.length) n += 1;
    if (dims.to_chuc_id.length) n += 1;
    if (dims.dang_vien.length) n += 1;
    return n;
  }, [dims, isNonDefaultDateRange]);

  const clearFilters = useCallback(() => {
    setDims(initialDims);
    setDateRange(initialDateRange);
  }, []);

  const exportColumns = useMemo(
    () => [
      { key: 'ho_ten', label: txt('matTranOfficerStats.tableColHoTen') },
      { key: 'ten_don_vi', label: txt('matTranOfficerStats.tableColDonVi') },
      { key: 'ten_chuc_vu', label: txt('matTranOfficerStats.tableColChucVu') },
      { key: 'chuc_vu_cap_quan_ly', label: txt('matTranOfficerStats.tableColCapQuanLy') },
      { key: 'gioi_tinh', label: txt('matTranOfficerStats.tableColGioiTinh') },
      { key: 'ten_trang_thai', label: txt('matTranOfficerStats.tableColTrangThai') },
      { key: 'dien_thoai', label: txt('matTranOfficerStats.tableColDienThoai') },
      { key: 'tuoi', label: txt('matTranOfficerStats.tableColTuoi') },
      { key: 'tg_tao', label: txt('matTranCanBo.detail.createdAt') },
      { key: 'range_start', label: txt('matTranOfficerStats.exportRangeFrom') },
      { key: 'range_end', label: txt('matTranOfficerStats.exportRangeTo') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqCanBoRow) => ({
      ho_ten: item.ho_ten,
      ten_don_vi: item.ten_don_vi ?? '',
      ten_chuc_vu: item.ten_chuc_vu ?? '',
      chuc_vu_cap_quan_ly:
        normalizeCapQuanLyInput(item.chuc_vu_cap_quan_ly) ?? txt('matTranOfficerStats.capQuanLyChuaGan'),
      gioi_tinh: item.gioi_tinh,
      ten_trang_thai: item.ten_trang_thai ?? '',
      dien_thoai: item.dien_thoai ?? '',
      tuoi: item.tuoi != null ? String(item.tuoi) : '',
      tg_tao: item.tg_tao,
      range_start: resolvedRange.allTime
        ? txt('matTranOfficerStats.exportRangeAll')
        : resolvedRange.start,
      range_end: resolvedRange.allTime ? txt('matTranOfficerStats.exportRangeAll') : resolvedRange.end,
    }),
    [resolvedRange],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
    data: sortedLookupBase,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination: EXPORT_PAGINATION,
    selectedIds: new Set(),
    keyExtractor: (r) => r.id,
  });

  const kpiItems = useMemo(
    () => [
      {
        id: 'total',
        label: txt('matTranOfficerStats.kpiTotal'),
        value: kpis.totalCount,
        icon: Users,
        bg: 'bg-rose-500/10',
        color: 'text-rose-600 dark:text-rose-400',
        delta: null,
      },
      {
        id: 'nam',
        label: txt('matTranOfficerStats.kpiNam'),
        value: kpis.countNam,
        icon: User,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
      {
        id: 'nu',
        label: txt('matTranOfficerStats.kpiNu'),
        value: kpis.countNu,
        icon: User,
        bg: 'bg-fuchsia-500/10',
        color: 'text-fuchsia-600 dark:text-fuchsia-400',
        delta: null,
      },
      {
        id: 'dang',
        label: txt('matTranOfficerStats.kpiDangVien'),
        value: kpis.countDangVien,
        icon: Heart,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
    ],
    [kpis],
  );

  const handleExport = () => {
    if (sortedLookupBase.length === 0) {
      toast.warning(txt('matTranOfficerStats.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const toggleSort = (key: OfficerLookupSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(
        key === 'tuoi' || key === 'dien_thoai' ? 'desc' : 'asc',
      );
    }
  };

  const dateRangeRow = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 w-full">
      <DateRangePicker
        presets={presets}
        value={dateRange}
        onChange={setDateRange}
        placeholder={txt('matTranOfficerStats.dateRangeLabel')}
        customPresetId={CUSTOM_PRESET}
        className="shrink-0"
      />
    </div>
  );

  /** Một hàng: khoảng ngày + chip; chip thừa gom vào nút … (FilterChipOverflowRow trên toolbar). */
  const filterPanelDesktop = (
    <>
      <div className="flex shrink-0 items-center">{dateRangeRow}</div>
      <div className="hidden h-6 w-px shrink-0 self-center bg-border sm:block" aria-hidden />
      <FilterChipMultiSelect
        icon={Flag}
        options={trangThaiOptions}
        value={dims.trang_thai_id}
        onChange={(v) => setDims((d) => ({ ...d, trang_thai_id: v }))}
        placeholder={txt('matTranOfficerStats.filterTrangThai')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={User}
        options={gioiTinhOptions}
        value={dims.gioi_tinh}
        onChange={(v) => setDims((d) => ({ ...d, gioi_tinh: v }))}
        placeholder={txt('matTranOfficerStats.filterGioiTinh')}
        className="w-[9rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Briefcase}
        options={chucVuOptions}
        value={dims.chuc_vu_id}
        onChange={(v) => setDims((d) => ({ ...d, chuc_vu_id: v }))}
        placeholder={txt('matTranOfficerStats.filterChucVu')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Binary}
        options={capQuanLyOptions}
        value={dims.cap_quan_ly}
        onChange={(v) => setDims((d) => ({ ...d, cap_quan_ly: v }))}
        placeholder={txt('matTranOfficerStats.filterCapQuanLy')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Building2}
        options={phongBanOptions}
        value={dims.phong_ban_id}
        onChange={(v) => setDims((d) => ({ ...d, phong_ban_id: v }))}
        placeholder={txt('matTranOfficerStats.filterPhongBan')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={MapPin}
        options={donViOptions}
        value={dims.don_vi_id}
        onChange={(v) => setDims((d) => ({ ...d, don_vi_id: v }))}
        placeholder={txt('matTranOfficerStats.filterDonVi')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Users}
        options={danTocOptions}
        value={dims.dan_toc_id}
        onChange={(v) => setDims((d) => ({ ...d, dan_toc_id: v }))}
        placeholder={txt('matTranOfficerStats.filterDanToc')}
        className="w-[9.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={GraduationCap}
        options={trinhDoOptions}
        value={dims.trinh_do_id}
        onChange={(v) => setDims((d) => ({ ...d, trinh_do_id: v }))}
        placeholder={txt('matTranOfficerStats.filterTrinhDo')}
        className="w-[9.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={BookOpen}
        options={lyLuanChinhTriOptions}
        value={dims.ly_luan_chinh_tri_id}
        onChange={(v) => setDims((d) => ({ ...d, ly_luan_chinh_tri_id: v }))}
        placeholder={txt('matTranOfficerStats.filterLyLuanChinhTri')}
        className="w-[11rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Landmark}
        options={toChucOptions}
        value={dims.to_chuc_id}
        onChange={(v) => setDims((d) => ({ ...d, to_chuc_id: v }))}
        placeholder={txt('matTranOfficerStats.filterToChuc')}
        className="w-[10rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Heart}
        options={dangVienOptions}
        value={dims.dang_vien}
        onChange={(v) => setDims((d) => ({ ...d, dang_vien: v }))}
        placeholder={txt('matTranOfficerStats.filterDangVien')}
        className="w-[9rem] shrink-0"
      />
    </>
  );

  const renderExportToolbarButton = () =>
    canExport ? (
      <Tooltip content={txt('common.export')} placement="bottom">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={handleExport}
          className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
        >
          <Download className="w-4 h-4" />
        </Button>
      </Tooltip>
    ) : null;

  if (!canView) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] px-4"
        aria-busy="true"
        aria-label={txt('common.loading')}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-page relative min-h-0" aria-label={txt('matTranOfficerStats.title')}>
      <DashboardToolbar
        className="shrink-0 mb-3"
        onBack={() => navigate('/mat-tran-to-quoc')}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangeRow}</div>
        }
        filters={filterPanelDesktop}
        filterGroups={filterGroups}
        actions={<div className="hidden sm:flex shrink-0">{renderExportToolbarButton()}</div>}
        mobileActions={renderExportToolbarButton()}
        activeFilterCount={activeFilterCount}
        onClearFilters={activeFilterCount ? clearFilters : undefined}
      />

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card shadow-sm p-3 sm:p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{txt('matTranOfficerStats.loading')}</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">{txt('matTranOfficerStats.noData')}</p>
            <p className="text-xs text-muted-foreground">{txt('matTranOfficerStats.noDataHint')}</p>
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={4} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('matTranOfficerStats.chartTrendCount')} icon={FileText} spanTwo={false}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={trendSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name={txt('matTranOfficerStats.tableTwoColValue')}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('matTranOfficerStats.chartGioiTinh')} icon={Users}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={gioiTinhBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={gioiTinhBar}
                        dataKey="count"
                        name={txt('matTranOfficerStats.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row) =>
                          GIOI_TINH_CHART_COLORS[(row as { label: string }).label] ?? CHART_FILL_FALLBACK
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsTableCard
                title={txt('matTranOfficerStats.chartTopPhongBan')}
                rows={topPhongBan.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="matTranOfficerStats.tableTwoColLabel"
                columnValueKey="matTranOfficerStats.tableTwoColValue"
                emptyKey="matTranOfficerStats.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('matTranOfficerStats.chartTopDonVi')}
                rows={topDonVi.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="matTranOfficerStats.tableTwoColLabel"
                columnValueKey="matTranOfficerStats.tableTwoColValue"
                emptyKey="matTranOfficerStats.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('matTranOfficerStats.chartTopChucVu')}
                rows={topChucVu.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="matTranOfficerStats.tableTwoColLabel"
                columnValueKey="matTranOfficerStats.tableTwoColValue"
                emptyKey="matTranOfficerStats.noData"
                maxHeight="max-h-[220px]"
              />
            </div>

            <StatsCard title={txt('matTranOfficerStats.tableLookupTitle')} icon={Layers}>
              <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[820px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['ho_ten', txt('matTranOfficerStats.tableColHoTen')],
                          ['ten_don_vi', txt('matTranOfficerStats.tableColDonVi')],
                          ['ten_chuc_vu', txt('matTranOfficerStats.tableColChucVu')],
                          ['chuc_vu_cap_quan_ly', txt('matTranOfficerStats.tableColCapQuanLy')],
                          ['ten_trang_thai', txt('matTranOfficerStats.tableColTrangThai')],
                          ['dien_thoai', txt('matTranOfficerStats.tableColDienThoai')],
                          ['tuoi', txt('matTranOfficerStats.tableColTuoi')],
                          ['gioi_tinh', txt('matTranOfficerStats.tableColGioiTinh')],
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
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-border/60',
                          canOpenDetail && 'hover:bg-muted/40 cursor-pointer',
                        )}
                        onClick={() => {
                          if (canOpenDetail) setViewing(row);
                        }}
                      >
                        <td className="py-2 pr-3 max-w-[200px] truncate font-medium">{row.ho_ten}</td>
                        <td className="py-2 pr-3 max-w-[180px] truncate">{row.ten_don_vi ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[140px] truncate">{row.ten_chuc_vu ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[100px] whitespace-nowrap">
                          {normalizeCapQuanLyInput(row.chuc_vu_cap_quan_ly) ?? txt('matTranOfficerStats.capQuanLyChuaGan')}
                        </td>
                        <td className="py-2 pr-3">{row.ten_trang_thai ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{formatCanBoPhoneDisplay(row.dien_thoai)}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.tuoi != null ? row.tuoi : '—'}</td>
                        <td className="py-2 pr-3">{row.gioi_tinh}</td>
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
        fileName={txt('matTranOfficerStats.exportFileName')}
        visibleColumnKeys={exportColumns.map((c) => c.key)}
      />

      <AnimatePresence>
        {viewing && canOpenDetail && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqCanBoDetail
              data={viewing}
              onClose={() => setViewing(null)}
              onEdit={() => {
                setViewing(null);
                navigate('/mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo');
              }}
              onDelete={(_id) => {
                setViewing(null);
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BaoCaoCanBoPage;
