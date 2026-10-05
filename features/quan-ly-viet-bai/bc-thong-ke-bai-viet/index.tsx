import React, { useState, useMemo, lazy, Suspense, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
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
  Layers,
  Download,
  Share2,
  LayoutTemplate,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { cn, formatDecimal, getLanguage, formatAxisTick } from '@/lib/utils';
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
} from '@/components/shared/stats';
import TablePaginationFooter from '@/components/shared/TablePaginationFooter';
import { queryKeys } from '@/lib/query-keys';
import { listQueryOptions } from '@/lib/supabase/query-config';
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
import { useDeleteBaiVietDanhSachMany } from '../bai-viet/hooks/use-bai-viet-danh-sach';
import {
  useArticleAllTabViewer,
  canLoadArticleAllTab,
  resolveBaiVietAllTabRpcScope,
} from '../hooks/use-article-all-tab-viewer';
import type { BaiVietDanhSach } from '../bai-viet/core/types';
import {
  getBaiVietDanhSachAllForExport,
  getBaiVietDanhSachPage,
  getBaiVietThongKeNhom,
  type BaiVietPageQuery,
} from '../bai-viet/services/bai-viet-danh-sach-service';
import {
  splitDonViFilter,
  type BaiVietThongKeArgs,
  type BaiVietThongKeNhom,
} from '../bai-viet/utils/thong-ke-nhom';
import { useXaPhuongForTab } from '@/features/he-thong/danh-sach-tinh-thanh/hooks/use-dia-ban';
import {
  type ArticleStatsDimensionFilters,
  resolveArticleStatsDateRange,
  filterArticlesForStats,
  computeArticleStatsKpis,
  pickTrendBucket,
  buildTrendSeries,
  aggregateTopCounts,
  aggregateByDonVi,
  aggregateByNguoiTao,
  aggregateDonViTheLoaiMatrix,
  getArticleDonViKey,
  getArticleDonViLabel,
  ARTICLE_STATS_DON_VI_UNKNOWN,
} from './utils/aggregate-bai-viet-stats';
import { exportBcThongKeBaiVietToExcel } from './utils/export-bc-thong-ke-bai-viet';
import ChartTooltip from '@/components/ui/ChartTooltip';
import { useCan } from '@/hooks/use-can';

const BaiVietDetail = lazy(() => import('../bai-viet/components/bai-viet-detail'));

const CUSTOM_PRESET = 'custom';

/** Cột bảng tra cứu — đúng tên cột trong whitelist `BAI_VIET_SERVER_SORT_COLUMNS` của RPC. */
type LookupSortKey =
  | 'ten_bai'
  | 'ten_the_loai'
  | 'ngay_dang'
  | 'ten_nguon_dang'
  | 'ten_trang_dang'
  | 'ho_va_ten_nguoi_tao';

const LOOKUP_PAGE_SIZE_OPTIONS = [20, 50, 100];
const EMPTY_NHOM: BaiVietThongKeNhom[] = [];

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
  rows: BaiVietThongKeNhom[],
  pick: (r: BaiVietThongKeNhom) => { id: string; label: string },
): Option[] {
  const m = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const { id, label } = pick(r);
    const prev = m.get(id);
    if (prev) prev.count += r.so_bai;
    else m.set(id, { label: label || id, count: r.so_bai });
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

  const resolvedRange = useMemo(
    () => resolveArticleStatsDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  /**
   * Phạm vi xem — cùng rule với tab "Tất cả" của Danh sách bài viết, áp ngay TẠI
   * MÁY CHỦ (RPC) thay vì tải hết rồi lọc ở client.
   */
  const scopeArgs = useMemo(
    () => ({
      scope: resolveBaiVietAllTabRpcScope(allTabViewer),
      viewerNhanVienId: allTabViewer.viewerNhanVienId,
      viewerDonViId: allTabViewer.viewerDonViId,
    }),
    [allTabViewer],
  );

  /**
   * Bucket biểu đồ phải chốt TRƯỚC khi gọi RPC vì máy chủ gộp theo đúng kỳ đó.
   * Preset "Tất cả" chưa biết khoảng ngày nên gộp theo tháng.
   */
  const bucket = useMemo(
    () =>
      resolvedRange.allTime || !resolvedRange.start || !resolvedRange.end
        ? 'month'
        : pickTrendBucket(resolvedRange.start, resolvedRange.end),
    [resolvedRange],
  );

  const thongKeArgs = useMemo<BaiVietThongKeArgs>(
    () => ({
      trucNgay: 'tg_tao',
      tuNgay: resolvedRange.allTime ? null : resolvedRange.start || null,
      denNgay: resolvedRange.allTime ? null : resolvedRange.end || null,
      bucket,
      ...scopeArgs,
    }),
    [resolvedRange, bucket, scopeArgs],
  );

  /**
   * Số liệu gộp nhóm ở máy chủ: vài chục KB thay cho việc kéo nguyên bảng bài viết
   * (12k+ dòng, ~10 MB). Bộ lọc chiều (thể loại, nguồn…) lọc ngay trên các nhóm nên
   * đổi bộ lọc không phải tải lại; chỉ đổi khoảng ngày mới gọi lại RPC.
   */
  const {
    data: thongKe,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.baiVietDanhSach.thongKe(thongKeArgs),
    queryFn: () => getBaiVietThongKeNhom(thongKeArgs),
    enabled: listQueryEnabled,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });
  const rows = thongKe?.nhom ?? EMPTY_NHOM;

  const filtered = useMemo(() => filterArticlesForStats(rows, dims), [rows, dims]);

  /**
   * Phân biệt "chưa có dữ liệu" với "không khớp bộ lọc": khoảng ngày giờ lọc ở máy
   * chủ, nên hễ có bộ lọc đang bật mà rỗng thì coi là "không khớp" để còn nút xoá lọc.
   */
  const reportFilteredEmpty = filtered.length === 0 && activeFilterCount > 0;

  const kpis = useMemo(() => computeArticleStatsKpis(filtered), [filtered]);

  const trendRange = useMemo(
    () =>
      resolvedRange.allTime || !resolvedRange.start || !resolvedRange.end
        ? { start: thongKe?.ngayMin ?? '', end: thongKe?.ngayMax ?? '' }
        : { start: resolvedRange.start, end: resolvedRange.end },
    [resolvedRange, thongKe?.ngayMin, thongKe?.ngayMax],
  );
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

  /**
   * Bảng tra cứu phân trang MÁY CHỦ (get_bai_viet_page) với đúng bộ lọc của báo cáo.
   * Trước đây bảng render toàn bộ dòng đã lọc — 12k `<tr>` treo trình duyệt.
   */
  const donViSplit = useMemo(
    () => splitDonViFilter(dims.idDonVi, ARTICLE_STATS_DON_VI_UNKNOWN),
    [dims.idDonVi],
  );
  const lookupQuery = useMemo<Omit<BaiVietPageQuery, 'page' | 'pageSize'>>(
    () => ({
      search: '',
      ...scopeArgs,
      theLoaiIds: dims.idTheLoai,
      nguonDangIds: dims.idNguonDang,
      trangDangIds: dims.idTrangDang,
      nguoiTaoIds: dims.idNguoiTao,
      sort: { column: sortKey, direction: sortDir },
      trucNgay: 'tg_tao',
      tuNgay: thongKeArgs.tuNgay,
      denNgay: thongKeArgs.denNgay,
      donViIds: donViSplit.donViIds,
      donViIncludeNull: donViSplit.donViIncludeNull,
    }),
    [scopeArgs, dims, sortKey, sortDir, thongKeArgs.tuNgay, thongKeArgs.denNgay, donViSplit],
  );
  /** Số trang gắn với bộ lọc đã tạo ra nó: đổi bộ lọc là về trang 1, không cần effect. */
  const [lookupPaging, setLookupPaging] = useState<{ page: number; pageSize: number; forQuery: unknown }>({
    page: 1,
    pageSize: 50,
    forQuery: null,
  });
  const lookupPage = lookupPaging.forQuery === lookupQuery ? lookupPaging.page : 1;
  const lookupParams = useMemo<BaiVietPageQuery>(
    () => ({ ...lookupQuery, page: lookupPage, pageSize: lookupPaging.pageSize }),
    [lookupQuery, lookupPage, lookupPaging.pageSize],
  );
  const lookup = useQuery({
    queryKey: queryKeys.baiVietDanhSach.page(lookupParams),
    queryFn: () => getBaiVietDanhSachPage(lookupParams),
    enabled: listQueryEnabled,
    placeholderData: keepPreviousData,
    ...listQueryOptions,
  });
  const lookupRows = useMemo(() => lookup.data?.rows ?? [], [lookup.data]);

  useEffect(() => {
    if (!viewing) return;
    const fresh = lookupRows.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [lookupRows, viewing]);

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
        key: 'don_vi',
        label: txt('articleStats.filterDonVi'),
        icon: MapPin,
        options: donViOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idDonVi,
        onChange: (v) => setDims((d) => ({ ...d, idDonVi: v })),
      },
    ],
    // `setDims` đến từ `useStatsPageFilters` nên linter không biết nó ổn định như setter của useState.
    [setDims, theLoaiOptions, nguonOptions, trangOptions, donViOptions, dims.idTheLoai, dims.idNguonDang, dims.idTrangDang, dims.idDonVi],
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
    if (dims.idDonVi.length)
      out.push({ label: txt('articleStats.filterDonVi'), value: labelsOf(donViOptions, dims.idDonVi) });
    return out;
  }, [dims, theLoaiOptions, nguonOptions, trangOptions, donViOptions]);

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
    if (kpis.totalCount === 0) {
      toast.warning(txt('articleStats.noExportData'));
      return;
    }
    setExporting(true);
    try {
      const unknownLabel = txt('articleStats.donViKhongXacDinh');
      // Sheet chi tiết cần từng bài: chỉ kéo khi bấm xuất, theo lô qua RPC phân trang.
      const allLookupRows = await getBaiVietDanhSachAllForExport(lookupQuery);
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
        lookupRows: allLookupRows,
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
                      <YAxis tickFormatter={formatAxisTick} allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
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
                      <YAxis tickFormatter={formatAxisTick} allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
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
                      <XAxis tickFormatter={formatAxisTick} type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
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
                  <table className="w-full text-sm min-w-[520px] [&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4">
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
                          <td className="py-2 pr-3 text-right tabular-nums">{formatDecimal(row.soBai)}</td>
                          <td className="py-2 pr-3 text-right tabular-nums">
                            {formatDecimal(row.tyTrongSoBai, 1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="sticky bottom-0 bg-card border-t border-border">
                      <tr className="font-medium">
                        <td className="py-2 px-3">{txt('articleStats.tableRowTong')}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{formatDecimal(donViTotals)}</td>
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
                <table className="w-full text-sm min-w-[720px] [&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:pr-4 [&_td:last-child]:pr-4">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['ten_bai', txt('articleStats.tableColTenBai')],
                          ['ten_the_loai', txt('articleStats.tableColTheLoai')],
                          ['ngay_dang', txt('articleStats.tableColNgayDang')],
                          ['ten_nguon_dang', txt('articleStats.tableColNguon')],
                          ['ten_trang_dang', txt('articleStats.tableColTrang')],
                          ['ho_va_ten_nguoi_tao', txt('articleStats.tableColNguoi')],
                        ] as const
                      ).map(([key, label]) => (
                        <th key={key} className="py-2 pr-3 first:pl-3 font-medium whitespace-nowrap">
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
                      <th className="py-2 pr-3 font-medium">{txt('articleStats.tableColLink')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lookupRows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/60 hover:bg-muted/40 cursor-pointer"
                        onClick={() => setViewing(row)}
                      >
                        <td className="py-2 pl-3 pr-3 max-w-[200px] truncate">{row.ten_bai}</td>
                        <td className="py-2 pr-3">{row.ten_the_loai ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{row.ngay_dang}</td>
                        <td className="py-2 pr-3 max-w-[120px] truncate">{row.ten_nguon_dang ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[120px] truncate">{row.ten_trang_dang ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[140px] truncate">
                          {row.ho_va_ten_nguoi_tao ?? row.ten_tai_khoan_nguoi_tao ?? '—'}
                        </td>
                        <td className="py-2 pr-3">
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
              <TablePaginationFooter
                className="-mx-4 -mb-4 mt-4 border-t border-border"
                totalRecords={lookup.data?.totalRecords ?? 0}
                page={lookupPage}
                pageSize={lookupPaging.pageSize}
                pageSizeOptions={LOOKUP_PAGE_SIZE_OPTIONS}
                disableAllOption
                onPageChange={(page) => setLookupPaging((p) => ({ ...p, page, forQuery: lookupQuery }))}
                onPageSizeChange={(pageSize) => setLookupPaging({ page: 1, pageSize, forQuery: lookupQuery })}
              />
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
