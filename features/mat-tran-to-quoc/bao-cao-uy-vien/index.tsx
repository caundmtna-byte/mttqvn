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
} from 'recharts';
import {
  Users,
  User,
  MapPin,
  Flag,
  Layers,
  Download,
  FileText,
  Heart,
  CalendarClock,
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
import { useMttqUyVienUyBanStatsList } from '../uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban';
import { canViewUyVienUyBanRow } from '../uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban-viewer';
import { useMttqBaoCaoUyVienViewer } from './hooks/use-mttq-bao-cao-uy-vien-viewer';
import type { MttqUyVienUyBan } from '../uy-vien-uy-ban/core/types';
import { computeAgeFromBirthDate } from '../danh-sach-can-bo/utils/age';
import { formatUyVienPhoneDisplay } from '../uy-vien-uy-ban/utils/display-format';
import { donViDisplayLabel } from '../uy-vien-uy-ban/utils/column-search';
import { buildUyVienTrangThamGiaChipOptions } from '../uy-vien-uy-ban/utils/trang-tham-gia-options';
import { CHIP_TRANG_THAI_NULL } from '../danh-sach-can-bo/core/constants';
import ChartTooltip from '@/components/ui/ChartTooltip';
import {
  type UyVienStatsDimensionFilters,
  resolveUyVienStatsDateRange,
  resolveUyVienStatsTrendChartRange,
  filterRowsForUyVienStats,
  computeUyVienStatsKpis,
  pickTrendBucket,
  buildUyVienTrendSeries,
  aggregateUyVienTopCounts,
  buildUyVienGioiTinhBarData,
  sortUyVienLookupRows,
  type UyVienLookupSortKey,
  type MttqUyVienStatsRow,
} from './utils/aggregate-mttq-uy-vien-stats';

const MttqUyVienUyBanDetail = lazy(() => import('../uy-vien-uy-ban/components/mttq-uy-vien-uy-ban-detail'));

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'all',
  customStart: '',
  customEnd: '',
};

const initialDims: UyVienStatsDimensionFilters = {
  nhiem_ky_id: [],
  don_vi_id: [],
  gioi_tinh: [],
  trang_thai_tham_gia: [],
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
  rows: MttqUyVienUyBan[],
  pick: (r: MttqUyVienUyBan) => { id: string; label: string },
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

const BaoCaoUyVienPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const tinhCapLabel = txt('matTranUyVienUyBan.tinhCap');
  /** Giống Báo cáo cán bộ: chỉ `view` trên resource module báo cáo. */
  const canView = useCan('view', 'matTranCommitteeMemberStats');
  const { canExport } = useResourcePermissions('matTranCommitteeMemberStats');
  /** Drawer chi tiết ủy viên thuộc quyền danh sách ủy viên. */
  const canOpenDetail = useCan('view', 'matTranCommitteeMembers');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranCommitteeMemberStats.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const { data: rows = [], isLoading } = useMttqUyVienUyBanStatsList({ enabled: canView });
  const uyVienViewer = useMttqBaoCaoUyVienViewer();
  const rowsInScope = useMemo(
    () => rows.filter((r) => canViewUyVienUyBanRow(uyVienViewer, r)),
    [rows, uyVienViewer],
  );

  const rowsEnriched = useMemo<MttqUyVienStatsRow[]>(
    () =>
      rowsInScope.map((r) => ({
        ...r,
        tuoi: computeAgeFromBirthDate(r.ngay_sinh) ?? undefined,
      })),
    [rowsInScope],
  );

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [dims, setDims] = useState<UyVienStatsDimensionFilters>(initialDims);
  const [sortKey, setSortKey] = useState<UyVienLookupSortKey>('ho_va_ten');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewing, setViewing] = useState<MttqUyVienUyBan | null>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (!viewing) return;
    if (!canViewUyVienUyBanRow(uyVienViewer, viewing)) {
      toast.error(txt('matTranUyVienUyBan.noViewPermission'));
      setViewing(null);
      return;
    }
    const fresh = rowsEnriched.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rowsEnriched, viewing, uyVienViewer]);

  const presets = useMemo(() => buildStandardDateRangePresets(), []);

  const resolvedRange = useMemo(
    () => resolveUyVienStatsDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const filtered = useMemo(
    () => filterRowsForUyVienStats(rowsEnriched, resolvedRange, dims),
    [rowsEnriched, resolvedRange, dims],
  );

  const kpis = useMemo(() => computeUyVienStatsKpis(filtered), [filtered]);

  const chartRange = useMemo(
    () => resolveUyVienStatsTrendChartRange(resolvedRange, rowsEnriched),
    [resolvedRange, rowsEnriched],
  );
  const bucket = useMemo(() => pickTrendBucket(chartRange.start, chartRange.end), [chartRange]);
  const trendSeries = useMemo(
    () => buildUyVienTrendSeries(filtered, chartRange, bucket),
    [filtered, chartRange, bucket],
  );

  const topDonVi = useMemo(() => {
    const rowsTop = aggregateUyVienTopCounts(filtered, 'don_vi', 10, tinhCapLabel);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered, tinhCapLabel]);

  const topNhiemKy = useMemo(() => {
    const rowsTop = aggregateUyVienTopCounts(filtered, 'nhiem_ky', 10, tinhCapLabel);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered, tinhCapLabel]);

  const topChucVu = useMemo(() => {
    const rowsTop = aggregateUyVienTopCounts(filtered, 'chuc_vu_don_vi', 10, tinhCapLabel);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered, tinhCapLabel]);

  const gioiTinhBar = useMemo(() => buildUyVienGioiTinhBarData(filtered), [filtered]);

  const sortedLookupBase = useMemo(
    () => sortUyVienLookupRows(filtered, sortKey, sortDir, getLanguage, tinhCapLabel),
    [filtered, sortKey, sortDir, tinhCapLabel],
  );

  const nhiemKyOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.nhiem_ky_id?.trim() ? String(r.nhiem_ky_id) : CHIP_TRANG_THAI_NULL,
        label: r.ten_nhiem_ky?.trim() || '—',
      })),
    [rowsEnriched],
  );

  const donViOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: r.don_vi_id?.trim() ? String(r.don_vi_id) : CHIP_TRANG_THAI_NULL,
        label: donViDisplayLabel(r, tinhCapLabel),
      })),
    [rowsEnriched, tinhCapLabel],
  );

  const gioiTinhOptions = useMemo(
    () =>
      buildDimOptions(rowsEnriched, (r) => ({
        id: String(r.gioi_tinh ?? ''),
        label: String(r.gioi_tinh ?? ''),
      })),
    [rowsEnriched],
  );

  const trangThamGiaOptions = useMemo(
    () => buildUyVienTrangThamGiaChipOptions(rowsEnriched),
    [rowsEnriched],
  );

  const dangVienOptions = useMemo<Option[]>(
    () => [
      {
        value: 'true',
        label: txt('matTranCommitteeMemberStats.dangVienYes'),
        count: rowsEnriched.filter((r) => r.dang_vien).length,
      },
      {
        value: 'false',
        label: txt('matTranCommitteeMemberStats.dangVienNo'),
        count: rowsEnriched.filter((r) => !r.dang_vien).length,
      },
    ],
    [rowsEnriched],
  );

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'nhiem_ky',
        label: txt('matTranCommitteeMemberStats.filterNhiemKy'),
        icon: CalendarClock,
        options: nhiemKyOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.nhiem_ky_id,
        onChange: (v) => setDims((d) => ({ ...d, nhiem_ky_id: v })),
      },
      {
        key: 'don_vi',
        label: txt('matTranCommitteeMemberStats.filterDonVi'),
        icon: MapPin,
        options: donViOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.don_vi_id,
        onChange: (v) => setDims((d) => ({ ...d, don_vi_id: v })),
      },
      {
        key: 'gioi_tinh',
        label: txt('matTranCommitteeMemberStats.filterGioiTinh'),
        icon: User,
        options: gioiTinhOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.gioi_tinh,
        onChange: (v) => setDims((d) => ({ ...d, gioi_tinh: v })),
      },
      {
        key: 'trang_tham_gia',
        label: txt('matTranCommitteeMemberStats.filterTrangThamGia'),
        icon: Flag,
        options: trangThamGiaOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.trang_thai_tham_gia,
        onChange: (v) => setDims((d) => ({ ...d, trang_thai_tham_gia: v })),
      },
      {
        key: 'dang_vien',
        label: txt('matTranCommitteeMemberStats.filterDangVien'),
        icon: Heart,
        options: dangVienOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.dang_vien,
        onChange: (v) => setDims((d) => ({ ...d, dang_vien: v })),
      },
    ],
    [nhiemKyOptions, donViOptions, gioiTinhOptions, trangThamGiaOptions, dangVienOptions, dims],
  );

  const isNonDefaultDateRange = useMemo(
    () => isStandardDateRangeNonDefault(dateRange, 'all'),
    [dateRange],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (isNonDefaultDateRange) n += 1;
    if (dims.nhiem_ky_id.length) n += 1;
    if (dims.don_vi_id.length) n += 1;
    if (dims.gioi_tinh.length) n += 1;
    if (dims.trang_thai_tham_gia.length) n += 1;
    if (dims.dang_vien.length) n += 1;
    return n;
  }, [dims, isNonDefaultDateRange]);

  const clearFilters = useCallback(() => {
    setDims(initialDims);
    setDateRange(initialDateRange);
  }, []);

  const exportColumns = useMemo(
    () => [
      { key: 'ho_va_ten', label: txt('matTranCommitteeMemberStats.tableColHoTen') },
      { key: 'ten_nhiem_ky', label: txt('matTranCommitteeMemberStats.tableColNhiemKy') },
      { key: 'ten_don_vi', label: txt('matTranCommitteeMemberStats.tableColDonVi') },
      { key: 'chuc_vu_don_vi', label: txt('matTranCommitteeMemberStats.tableColChucVu') },
      { key: 'gioi_tinh', label: txt('matTranCommitteeMemberStats.tableColGioiTinh') },
      { key: 'trang_thai_tham_gia', label: txt('matTranCommitteeMemberStats.tableColTrangThamGia') },
      { key: 'dang_vien', label: txt('matTranCommitteeMemberStats.filterDangVien') },
      { key: 'so_dien_thoai', label: txt('matTranCommitteeMemberStats.tableColDienThoai') },
      { key: 'tg_tao', label: txt('matTranCanBo.detail.createdAt') },
      { key: 'range_start', label: txt('matTranCommitteeMemberStats.exportRangeFrom') },
      { key: 'range_end', label: txt('matTranCommitteeMemberStats.exportRangeTo') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: MttqUyVienStatsRow) => ({
      ho_va_ten: item.ho_va_ten,
      ten_nhiem_ky: item.ten_nhiem_ky ?? '',
      ten_don_vi: donViDisplayLabel(item, tinhCapLabel),
      chuc_vu_don_vi: item.chuc_vu_don_vi ?? '',
      gioi_tinh: item.gioi_tinh ?? '',
      trang_thai_tham_gia: item.trang_thai_tham_gia ?? '',
      dang_vien: item.dang_vien ? txt('matTranCommitteeMemberStats.dangVienYes') : txt('matTranCommitteeMemberStats.dangVienNo'),
      so_dien_thoai: item.so_dien_thoai ?? '',
      tg_tao: item.tg_tao,
      range_start: resolvedRange.start,
      range_end: resolvedRange.end,
    }),
    [resolvedRange.start, resolvedRange.end, tinhCapLabel],
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
        label: txt('matTranCommitteeMemberStats.kpiTotal'),
        value: kpis.totalCount,
        icon: Users,
        bg: 'bg-violet-500/10',
        color: 'text-violet-600 dark:text-violet-400',
        delta: null,
      },
      {
        id: 'nam',
        label: txt('matTranCommitteeMemberStats.kpiNam'),
        value: kpis.countNam,
        icon: User,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
      {
        id: 'nu',
        label: txt('matTranCommitteeMemberStats.kpiNu'),
        value: kpis.countNu,
        icon: User,
        bg: 'bg-fuchsia-500/10',
        color: 'text-fuchsia-600 dark:text-fuchsia-400',
        delta: null,
      },
      {
        id: 'dang',
        label: txt('matTranCommitteeMemberStats.kpiDangVien'),
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
      toast.warning(txt('matTranCommitteeMemberStats.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const toggleSort = (key: UyVienLookupSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'tuoi' || key === 'so_dien_thoai' ? 'desc' : 'asc');
    }
  };

  const dateRangeRow = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 w-full">
      <DateRangePicker
        presets={presets}
        value={dateRange}
        onChange={setDateRange}
        placeholder={txt('matTranCommitteeMemberStats.dateRangeLabel')}
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
        icon={CalendarClock}
        options={nhiemKyOptions}
        value={dims.nhiem_ky_id}
        onChange={(v) => setDims((d) => ({ ...d, nhiem_ky_id: v }))}
        placeholder={txt('matTranCommitteeMemberStats.filterNhiemKy')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={MapPin}
        options={donViOptions}
        value={dims.don_vi_id}
        onChange={(v) => setDims((d) => ({ ...d, don_vi_id: v }))}
        placeholder={txt('matTranCommitteeMemberStats.filterDonVi')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={User}
        options={gioiTinhOptions}
        value={dims.gioi_tinh}
        onChange={(v) => setDims((d) => ({ ...d, gioi_tinh: v }))}
        placeholder={txt('matTranCommitteeMemberStats.filterGioiTinh')}
        className="w-[9rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Flag}
        options={trangThamGiaOptions}
        value={dims.trang_thai_tham_gia}
        onChange={(v) => setDims((d) => ({ ...d, trang_thai_tham_gia: v }))}
        placeholder={txt('matTranCommitteeMemberStats.filterTrangThamGia')}
        className="w-[11rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Heart}
        options={dangVienOptions}
        value={dims.dang_vien}
        onChange={(v) => setDims((d) => ({ ...d, dang_vien: v }))}
        placeholder={txt('matTranCommitteeMemberStats.filterDangVien')}
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
    <div className="flex flex-col h-page relative min-h-0" aria-label={txt('matTranCommitteeMemberStats.title')}>
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
          <p className="text-sm text-muted-foreground py-8 text-center">{txt('matTranCommitteeMemberStats.loading')}</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">{txt('matTranCommitteeMemberStats.noData')}</p>
            <p className="text-xs text-muted-foreground">{txt('matTranCommitteeMemberStats.noDataHint')}</p>
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={4} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('matTranCommitteeMemberStats.chartTrendCount')} icon={FileText} spanTwo={false}>
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
                        name={txt('matTranCommitteeMemberStats.tableTwoColValue')}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('matTranCommitteeMemberStats.chartGioiTinh')} icon={Users}>
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
                        name={txt('matTranCommitteeMemberStats.tableTwoColValue')}
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
                title={txt('matTranCommitteeMemberStats.chartTopDonVi')}
                rows={topDonVi.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="matTranCommitteeMemberStats.tableTwoColLabel"
                columnValueKey="matTranCommitteeMemberStats.tableTwoColValue"
                emptyKey="matTranCommitteeMemberStats.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('matTranCommitteeMemberStats.chartTopNhiemKy')}
                rows={topNhiemKy.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="matTranCommitteeMemberStats.tableTwoColLabel"
                columnValueKey="matTranCommitteeMemberStats.tableTwoColValue"
                emptyKey="matTranCommitteeMemberStats.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('matTranCommitteeMemberStats.chartTopChucVu')}
                rows={topChucVu.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="matTranCommitteeMemberStats.tableTwoColLabel"
                columnValueKey="matTranCommitteeMemberStats.tableTwoColValue"
                emptyKey="matTranCommitteeMemberStats.noData"
                maxHeight="max-h-[220px]"
              />
            </div>

            <StatsCard title={txt('matTranCommitteeMemberStats.tableLookupTitle')} icon={Layers}>
              <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[800px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['ho_va_ten', txt('matTranCommitteeMemberStats.tableColHoTen')],
                          ['ten_nhiem_ky', txt('matTranCommitteeMemberStats.tableColNhiemKy')],
                          ['ten_don_vi', txt('matTranCommitteeMemberStats.tableColDonVi')],
                          ['chuc_vu_don_vi', txt('matTranCommitteeMemberStats.tableColChucVu')],
                          ['trang_thai_tham_gia', txt('matTranCommitteeMemberStats.tableColTrangThamGia')],
                          ['so_dien_thoai', txt('matTranCommitteeMemberStats.tableColDienThoai')],
                          ['tuoi', txt('matTranCommitteeMemberStats.tableColTuoi')],
                          ['gioi_tinh', txt('matTranCommitteeMemberStats.tableColGioiTinh')],
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
                          canOpenDetail &&
                            canViewUyVienUyBanRow(uyVienViewer, row) &&
                            'hover:bg-muted/40 cursor-pointer',
                        )}
                        onClick={() => {
                          if (canOpenDetail && canViewUyVienUyBanRow(uyVienViewer, row)) setViewing(row);
                        }}
                      >
                        <td className="py-2 pr-3 max-w-[200px] truncate font-medium">{row.ho_va_ten}</td>
                        <td className="py-2 pr-3 max-w-[160px] truncate">{row.ten_nhiem_ky ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[160px] truncate" title={donViDisplayLabel(row, tinhCapLabel)}>
                          {donViDisplayLabel(row, tinhCapLabel)}
                        </td>
                        <td className="py-2 pr-3 max-w-[140px] truncate">{row.chuc_vu_don_vi ?? '—'}</td>
                        <td className="py-2 pr-3">{row.trang_thai_tham_gia ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                          {formatUyVienPhoneDisplay(row.so_dien_thoai)}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">{row.tuoi != null ? row.tuoi : '—'}</td>
                        <td className="py-2 pr-3">{row.gioi_tinh ?? '—'}</td>
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
        fileName={txt('matTranCommitteeMemberStats.exportFileName')}
        visibleColumnKeys={exportColumns.map((c) => c.key)}
      />

      <AnimatePresence>
        {viewing && canOpenDetail && canViewUyVienUyBanRow(uyVienViewer, viewing) && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <MttqUyVienUyBanDetail
              data={viewing}
              onClose={() => setViewing(null)}
              onEdit={(_item) => {
                setViewing(null);
                navigate('/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien');
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

export default BaoCaoUyVienPage;
