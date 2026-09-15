import React, { useState, useMemo, lazy, Suspense, useEffect, useRef } from 'react';
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
  FileText,
  Users,
  User,
  Layers,
  Download,
  Share2,
  LayoutTemplate,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { cn, formatDecimal, getLanguage } from '@/lib/utils';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import Button from '@/components/ui/Button';
import ErrorState from '@/components/shared/ErrorState';
import Tooltip from '@/components/ui/Tooltip';
import DateRangePicker from '@/components/ui/DateRangePicker';
import {
  ReportSkeleton,
  StatsKpiGrid,
  StatsCard,
  StatsTableCard,
  ColoredBar,
  useStatsPageFilters,
  resolveStatsTrendChartRange,
} from '@/components/shared/stats';
import { chartFillByIndex } from '@/lib/constants/chart-colors';
import type { StatsTableRow } from '@/components/shared/stats/types';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import type { Option } from '@/components/ui/MultiSelect';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { CONFIRM_DELETE } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { AnimatePresence } from 'framer-motion';
import { useBaiVietDanhSachList, useDeleteBaiVietDanhSachMany } from '../bai-viet/hooks/use-bai-viet-danh-sach';
import {
  useArticleAllTabViewer,
  rowVisibleOnArticleAllTab,
  canLoadArticleAllTab,
} from '../hooks/use-article-all-tab-viewer';
import type { BaiVietDanhSach } from '../bai-viet/core/types';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import {
  type ArticleStatsDimensionFilters,
  resolveArticleStatsDateRange,
  filterArticlesForStats,
  computeArticleStatsKpis,
  pickTrendBucket,
  buildTrendSeries,
  aggregateTopCounts,
  sortLookupRows,
  type LookupSortKey,
  getArticleStatsDateFromCreatedAt,
  aggregateByDonVi,
  aggregateByNguoiTao,
  aggregateDonViTheLoaiMatrix,
  getArticleDonViKey,
  getArticleDonViLabel,
} from './utils/aggregate-bai-viet-stats';
import { exportBcThongKeBaiVietToExcel } from './utils/export-bc-thong-ke-bai-viet';
import ChartTooltip from '@/components/ui/ChartTooltip';
import { useCan } from '@/hooks/use-can';

const BaiVietDetail = lazy(() => import('../bai-viet/components/bai-viet-detail'));

const CUSTOM_PRESET = 'custom';

const initialDims: ArticleStatsDimensionFilters = {
  idTheLoai: [],
  idNguonDang: [],
  idTrangDang: [],
  idNguoiTao: [],
  idDonVi: [],
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
  rows: BaiVietDanhSach[],
  pick: (r: BaiVietDanhSach) => { id: string; label: string },
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

const BcThongKeBaiVietPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  // Gọi tách hai dòng: `useCan(x) || useCan(y)` short-circuit nên hook thứ hai
  // không chạy khi hook đầu trả true → sai thứ tự hook giữa các lần render.
  const canExportArticleStats = useCan('export', 'articleStats');
  const canExportArticles = useCan('export', 'articles');
  const canExport = canExportArticleStats || canExportArticles;
  const canViewStats = useCan('view', 'articleStats');
  const canViewArticles = useCan('view', 'articles');
  const canOpenPage = canViewStats || canViewArticles;
  /**
   * Phạm vi xem dữ liệu — cùng rule với tab "Tất cả" của Danh sách bài viết:
   * Xã phường → chỉ đơn vị mình · Tỉnh / quản trị / cap_bac=1 → toàn bộ · còn lại → bài mình tạo.
   * `useCan` ở trên chỉ quyết định "được mở trang không", KHÔNG giới hạn dòng nào.
   */
  const allTabViewer = useArticleAllTabViewer();
  const didRedirect = useRef(false);

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  // Dùng `matrixLoading` thay cho `!matrixActive`: nếu truy vấn quyền THẤT BẠI thì
  // `matrixActive` ở lại false vĩnh viễn và trang sẽ quay vòng chờ mãi.
  const waitingMatrixHydrate =
    user != null && user.role !== 'admin' && chucVuKey.trim() !== '' && matrixLoading;

  const listQueryEnabled = Boolean(
    user &&
      !waitingMatrixHydrate &&
      (user.role === 'admin' || (matrixActive && canOpenPage)) &&
      canLoadArticleAllTab(allTabViewer),
  );

  useEffect(() => {
    if (!user || waitingMatrixHydrate || canOpenPage || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('articleStats.noViewPermission'));
    navigate('/quan-ly-viet-bai', { replace: true });
  }, [user, waitingMatrixHydrate, canOpenPage, navigate]);

  const {
    data: allRows = [],
    isLoading,
    isError,
    refetch,
  } = useBaiVietDanhSachList({ enabled: listQueryEnabled });
  /** Lọc phạm vi ngay tại nguồn: KPI, biểu đồ, top, bảng tra cứu và export đều đọc từ đây. */
  const rows = useMemo(
    () => allRows.filter((r) => rowVisibleOnArticleAllTab(allTabViewer, r)),
    [allRows, allTabViewer],
  );
  const deleteMutation = useDeleteBaiVietDanhSachMany();

  /**
   * Tên xã/phường tra từ danh mục (cache 24h + localStorage) chứ không embed vào
   * từng dòng bài viết — embed sẽ lặp lại tên xã cho hàng nghìn dòng, tốn egress.
   */
  const { data: xaPhuongList = [] } = useXaPhuongForTab(true, '', { enabled: listQueryEnabled });
  const tenDonViById = useMemo(
    () => new Map(xaPhuongList.map((x) => [String(x.id), x.ten])),
    [xaPhuongList],
  );

  const {
    dateRange,
    setDateRange,
    dims,
    setDims,
    presets,
    activeFilterCount,
    clearFilters,
  } = useStatsPageFilters(initialDims);
  const [sortKey, setSortKey] = useState<LookupSortKey>('ngay_dang');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewing, setViewing] = useState<BaiVietDanhSach | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!viewing) return;
    const fresh = rows.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rows, viewing]);

  const resolvedRange = useMemo(
    () => resolveArticleStatsDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const filtered = useMemo(
    () => filterArticlesForStats(rows, resolvedRange, dims),
    [rows, resolvedRange, dims],
  );

  /**
   * Phân biệt "chưa có dữ liệu" với "không khớp bộ lọc": chỉ báo không khớp khi
   * dữ liệu gốc có bản ghi mà bộ lọc đang bật lọc hết sạch.
   */
  const reportFilteredEmpty = filtered.length === 0 && rows.length > 0 && activeFilterCount > 0;

  const kpis = useMemo(() => computeArticleStatsKpis(filtered), [filtered]);

  const trendRange = useMemo(
    () => resolveStatsTrendChartRange(resolvedRange, filtered, getArticleStatsDateFromCreatedAt),
    [resolvedRange, filtered],
  );
  const bucket = useMemo(() => pickTrendBucket(trendRange.start, trendRange.end), [trendRange]);
  const trendSeries = useMemo(
    () => buildTrendSeries(filtered, trendRange, bucket),
    [filtered, trendRange, bucket],
  );

  const topTheLoai = useMemo(() => {
    const rowsTop = aggregateTopCounts(filtered, 'the_loai', 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const topNguon = useMemo(() => {
    const rowsTop = aggregateTopCounts(filtered, 'nguon', 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const topNguoi = useMemo(() => {
    const rowsTop = aggregateTopCounts(filtered, 'nguoi_tao', 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const donViRows = useMemo(
    () => aggregateByDonVi(filtered, tenDonViById, txt('articleStats.donViKhongXacDinh')),
    [filtered, tenDonViById],
  );

  const donViChartData = useMemo(
    () => donViRows.slice(0, 10).map((r) => ({ label: r.label, count: r.soBai })),
    [donViRows],
  );

  const donViTotals = useMemo(
    () => donViRows.reduce((acc, r) => acc + r.soBai, 0),
    [donViRows],
  );

  const sortedLookup = useMemo(
    () => sortLookupRows(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const theLoaiOptions = useMemo(
    () => buildDimOptions(rows, (r) => ({ id: String(r.id_the_loai), label: r.ten_the_loai?.trim() || '' })),
    [rows],
  );
  const nguonOptions = useMemo(
    () => buildDimOptions(rows, (r) => ({ id: String(r.id_nguon_dang), label: r.ten_nguon_dang?.trim() || '' })),
    [rows],
  );
  const trangOptions = useMemo(
    () => buildDimOptions(rows, (r) => ({ id: String(r.id_trang_dang), label: r.ten_trang_dang?.trim() || '' })),
    [rows],
  );
  const nguoiOptions = useMemo(
    () =>
      buildDimOptions(rows, (r) => ({
        id: String(r.id_nguoi_tao),
        label: r.ho_va_ten_nguoi_tao?.trim() || r.ten_tai_khoan_nguoi_tao?.trim() || '',
      })),
    [rows],
  );

  const donViOptions = useMemo(
    () =>
      buildDimOptions(rows, (r) => {
        const id = getArticleDonViKey(r);
        return {
          id,
          label: getArticleDonViLabel(id, tenDonViById, txt('articleStats.donViKhongXacDinh')),
        };
      }),
    [rows, tenDonViById],
  );

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'the_loai',
        label: txt('articleStats.filterTheLoai'),
        icon: Layers,
        options: theLoaiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idTheLoai,
        onChange: (v) => setDims((d) => ({ ...d, idTheLoai: v })),
      },
      {
        key: 'nguon',
        label: txt('articleStats.filterNguon'),
        icon: Share2,
        options: nguonOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idNguonDang,
        onChange: (v) => setDims((d) => ({ ...d, idNguonDang: v })),
      },
      {
        key: 'trang',
        label: txt('articleStats.filterTrang'),
        icon: LayoutTemplate,
        options: trangOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idTrangDang,
        onChange: (v) => setDims((d) => ({ ...d, idTrangDang: v })),
      },
      {
        key: 'nguoi',
        label: txt('articleStats.filterNguoiTao'),
        icon: User,
        options: nguoiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idNguoiTao,
        onChange: (v) => setDims((d) => ({ ...d, idNguoiTao: v })),
      },
      {
        key: 'don_vi',
        label: txt('articleStats.filterDonVi'),
        icon: MapPin,
        options: donViOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idDonVi,
        onChange: (v) => setDims((d) => ({ ...d, idDonVi: v })),
      },
    ],
    // `setDims` đến từ `useStatsPageFilters` nên linter không biết nó ổn định như setter của useState.
    [setDims, theLoaiOptions, nguonOptions, trangOptions, nguoiOptions, donViOptions, dims.idTheLoai, dims.idNguonDang, dims.idTrangDang, dims.idNguoiTao, dims.idDonVi],
  );

  /**
   * Bộ lọc đang bật, đã đổi id thành tên — ghi vào sheet Tổng hợp để người nhận
   * file biết con số được lọc bằng gì thay vì phải hỏi lại.
   */
  const activeFilterSummary = useMemo(() => {
    const labelsOf = (opts: Option[], values: string[]) =>
      values.map((v) => opts.find((o) => o.value === v)?.label ?? v).join(', ');
    const out: { label: string; value: string }[] = [];
    if (dims.idTheLoai.length)
      out.push({ label: txt('articleStats.filterTheLoai'), value: labelsOf(theLoaiOptions, dims.idTheLoai) });
    if (dims.idNguonDang.length)
      out.push({ label: txt('articleStats.filterNguon'), value: labelsOf(nguonOptions, dims.idNguonDang) });
    if (dims.idTrangDang.length)
      out.push({ label: txt('articleStats.filterTrang'), value: labelsOf(trangOptions, dims.idTrangDang) });
    if (dims.idNguoiTao.length)
      out.push({ label: txt('articleStats.filterNguoiTao'), value: labelsOf(nguoiOptions, dims.idNguoiTao) });
    if (dims.idDonVi.length)
      out.push({ label: txt('articleStats.filterDonVi'), value: labelsOf(donViOptions, dims.idDonVi) });
    return out;
  }, [dims, theLoaiOptions, nguonOptions, trangOptions, nguoiOptions, donViOptions]);

  const kpiItems = useMemo(
    () => [
      {
        id: 'count',
        label: txt('articleStats.kpiTotal'),
        value: kpis.totalCount,
        icon: FileText,
        bg: 'bg-violet-500/10',
        color: 'text-violet-600 dark:text-violet-400',
        delta: null,
      },
      {
        id: 'don_vi',
        label: txt('articleStats.kpiTongDonVi'),
        value: kpis.distinctDonVi,
        icon: MapPin,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'avg',
        label: txt('articleStats.kpiTbSoBai'),
        value: formatDecimal(kpis.avgBaiMoiDonVi, 1),
        icon: Layers,
        bg: 'bg-amber-500/10',
        color: 'text-amber-600 dark:text-amber-400',
        delta: null,
      },
      {
        id: 'authors',
        label: txt('articleStats.kpiDistinctAuthors'),
        value: kpis.distinctNguoiTao,
        icon: Users,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
    ],
    [kpis],
  );

  /**
   * Xuất thẳng ra file nhiều sheet, không qua `ExportDialog`: hộp thoại chung chỉ
   * ghi được một sheet phẳng, không dựng được bảng chéo đơn vị × thể loại.
   * Các bảng tổng hợp tính ngay tại đây (không `useMemo`) vì chỉ cần khi bấm xuất.
   */
  const handleExport = async () => {
    if (sortedLookup.length === 0) {
      toast.warning(txt('articleStats.noExportData'));
      return;
    }
    setExporting(true);
    try {
      const unknownLabel = txt('articleStats.donViKhongXacDinh');
      await exportBcThongKeBaiVietToExcel({
        kpis,
        range: resolvedRange,
        activeFilters: activeFilterSummary,
        matrix: aggregateDonViTheLoaiMatrix(filtered, tenDonViById, unknownLabel),
        theLoaiRows: aggregateTopCounts(filtered, 'the_loai'),
        nguonRows: aggregateTopCounts(filtered, 'nguon'),
        trangRows: aggregateTopCounts(filtered, 'trang'),
        nguoiTaoRows: aggregateByNguoiTao(filtered, tenDonViById, unknownLabel),
        trendRows: trendSeries,
        lookupRows: sortedLookup,
        tenDonViById,
      });
    } catch {
      toast.error(txt('articleStats.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('articleList.deleteTitle'),
      message: txt('articleList.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        await deleteMutation.mutateAsync([id], {
          onSuccess: () => {
            if (viewing?.id === id) setViewing(null);
          },
        });
      },
    });
  };

  const toggleSort = (key: LookupSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'ngay_dang' ? 'desc' : 'asc');
    }
  };

  const chartData = trendSeries;
  const theLoaiChartData = useMemo(
    () => topTheLoai.map((r) => ({ label: r.label, count: r.value })),
    [topTheLoai],
  );

  const dateRangeRow = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 w-full">
      <DateRangePicker
        presets={presets}
        value={dateRange}
        onChange={setDateRange}
        placeholder={txt('articleStats.dateRangeLabel')}
        customPresetId={CUSTOM_PRESET}
        className="shrink-0"
      />
    </div>
  );

  const filterRowDesktop = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 pb-0.5">
      {dateRangeRow}
      <div className="h-6 w-px bg-border shrink-0 self-center" aria-hidden />
      <FilterChipMultiSelect
        icon={Layers}
        options={theLoaiOptions}
        value={dims.idTheLoai}
        onChange={(v) => setDims((d) => ({ ...d, idTheLoai: v }))}
        placeholder={txt('articleStats.filterTheLoai')}
        className="shrink-0 w-[160px]"
      />
      <FilterChipMultiSelect
        icon={Share2}
        options={nguonOptions}
        value={dims.idNguonDang}
        onChange={(v) => setDims((d) => ({ ...d, idNguonDang: v }))}
        placeholder={txt('articleStats.filterNguon')}
        className="shrink-0 w-[150px]"
      />
      <FilterChipMultiSelect
        icon={LayoutTemplate}
        options={trangOptions}
        value={dims.idTrangDang}
        onChange={(v) => setDims((d) => ({ ...d, idTrangDang: v }))}
        placeholder={txt('articleStats.filterTrang')}
        className="shrink-0 w-[150px]"
      />
      <FilterChipMultiSelect
        icon={User}
        options={nguoiOptions}
        value={dims.idNguoiTao}
        onChange={(v) => setDims((d) => ({ ...d, idNguoiTao: v }))}
        placeholder={txt('articleStats.filterNguoiTao')}
        className="shrink-0 w-[160px]"
      />
      <FilterChipMultiSelect
        icon={MapPin}
        options={donViOptions}
        value={dims.idDonVi}
        onChange={(v) => setDims((d) => ({ ...d, idDonVi: v }))}
        placeholder={txt('articleStats.filterDonVi')}
        className="shrink-0 w-[160px]"
      />
    </div>
  );

  const renderExportToolbarButton = () =>
    canExport ? (
      <Tooltip content={txt('common.export')} placement="bottom">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting}
          className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
        >
          <Download className="w-4 h-4" />
        </Button>
      </Tooltip>
    ) : null;

  if (!canOpenPage && !waitingMatrixHydrate) {
    return null;
  }

  if (waitingMatrixHydrate || (isLoading && rows.length === 0)) {
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
    <div className="flex flex-col h-page relative min-h-0" aria-label={txt('articleStats.title')}>
      <DashboardToolbar
        className="shrink-0 mb-3"
        onBack={() => navigate('/quan-ly-viet-bai')}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangeRow}</div>
        }
        filters={filterRowDesktop}
        filterGroups={filterGroups}
        actions={renderExportToolbarButton()}
        mobileActions={renderExportToolbarButton()}
        activeFilterCount={activeFilterCount}
        onClearFilters={activeFilterCount ? clearFilters : undefined}
      />

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card shadow-sm p-3 sm:p-4 space-y-4">
        {isError ? (
          <div className="py-12 flex items-center justify-center">
            <ErrorState className="w-full max-w-md" onRetry={() => void refetch()} primaryButtons />
          </div>
        ) : isLoading ? (
          <ReportSkeleton />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">
              {reportFilteredEmpty ? txt('common.noResults') : txt('articleStats.noData')}
            </p>
            <p className="text-xs text-muted-foreground">
              {reportFilteredEmpty ? txt('shared.empty.filteredHint') : txt('articleStats.noDataHint')}
            </p>
            {reportFilteredEmpty && (
              <Button type="button" variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                {txt('common.clearFilter')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={4} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('articleStats.chartTrendCount')} icon={FileText} spanTwo={false}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="count" name="Số bài" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('articleStats.chartTheLoaiCount')} icon={Layers}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={theLoaiChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} height={48} angle={-20} textAnchor="end" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={theLoaiChartData}
                        dataKey="count"
                        name={txt('articleStats.tableColSoBai')}
                        radius={[4, 4, 0, 0]}
                        getFill={(_, i) => chartFillByIndex(i)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsTableCard
                title={txt('articleStats.chartTopTheLoai')}
                rows={topTheLoai as StatsTableRow[]}
                columnLabelKey="articleStats.tableTwoColLabel"
                columnValueKey="articleStats.tableTwoColValue"
                emptyKey="articleStats.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('articleStats.chartTopNguon')}
                rows={topNguon as StatsTableRow[]}
                columnLabelKey="articleStats.tableTwoColLabel"
                columnValueKey="articleStats.tableTwoColValue"
                emptyKey="articleStats.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('articleStats.chartTopNguoi')}
                rows={topNguoi as StatsTableRow[]}
                columnLabelKey="articleStats.tableTwoColLabel"
                columnValueKey="articleStats.tableTwoColValue"
                emptyKey="articleStats.noData"
                maxHeight="max-h-[220px]"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StatsCard title={txt('articleStats.chartTopDonVi')} icon={MapPin}>
                <div
                  className="w-full min-w-0"
                  style={{ height: Math.max(240, donViChartData.length * 34) }}
                >
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart
                      data={donViChartData}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="label"
                        tick={{ fontSize: 11 }}
                        width={128}
                        interval={0}
                      />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={donViChartData}
                        dataKey="count"
                        name={txt('articleStats.tableColSoBai')}
                        radius={[0, 4, 4, 0]}
                        getFill={(_, i) => chartFillByIndex(i)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('articleStats.tableDonViTitle')} icon={MapPin}>
                <div className="overflow-x-auto max-h-[min(420px,50vh)] overflow-y-auto -m-4">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                      <tr className="text-left text-muted-foreground">
                        <th className="py-2 px-3 font-medium">{txt('articleStats.tableColDonVi')}</th>
                        <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">
                          {txt('articleStats.tableColSoBai')}
                        </th>
                        <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">
                          {txt('articleStats.tableColTyTrong')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {donViRows.map((row) => (
                        <tr key={row.id} className="border-b border-border/60">
                          <td className="py-2 px-3 max-w-[200px] truncate">{row.label}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">{row.soBai}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {formatDecimal(row.tyTrongSoBai, 1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-card border-t border-border">
                      <tr className="font-medium">
                        <td className="py-2 px-3">{txt('articleStats.tableRowTong')}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{donViTotals}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">
                          {donViTotals > 0 ? `${formatDecimal(100, 1)}%` : '—'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </StatsCard>
            </div>

            <StatsCard title={txt('articleStats.tableLookupTitle')} icon={Layers}>
              <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['ten_bai', txt('articleStats.tableColTenBai')],
                          ['ten_the_loai', txt('articleStats.tableColTheLoai')],
                          ['ngay_dang', txt('articleStats.tableColNgayDang')],
                          ['ten_nguon_dang', txt('articleStats.tableColNguon')],
                          ['ten_trang_dang', txt('articleStats.tableColTrang')],
                          ['creator', txt('articleStats.tableColNguoi')],
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
                      <th className="py-2 font-medium">{txt('articleStats.tableColLink')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLookup.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/60 hover:bg-muted/40 cursor-pointer"
                        onClick={() => setViewing(row)}
                      >
                        <td className="py-2 pr-3 max-w-[200px] truncate">{row.ten_bai}</td>
                        <td className="py-2 pr-3">{row.ten_the_loai ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{row.ngay_dang}</td>
                        <td className="py-2 pr-3 max-w-[120px] truncate">{row.ten_nguon_dang ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[120px] truncate">{row.ten_trang_dang ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[140px] truncate">
                          {row.ho_va_ten_nguoi_tao ?? row.ten_tai_khoan_nguoi_tao ?? '—'}
                        </td>
                        <td className="py-2">
                          {row.link ? (
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate max-w-[160px] inline-block align-bottom"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.link}
                            </a>
                          ) : (
                            '—'
                          )}
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
        {viewing && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <BaiVietDetail
              data={viewing}
              onClose={() => setViewing(null)}
              onEdit={() => {
                navigate('/quan-ly-viet-bai/bai-viet');
              }}
              onDelete={handleDelete}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BcThongKeBaiVietPage;
