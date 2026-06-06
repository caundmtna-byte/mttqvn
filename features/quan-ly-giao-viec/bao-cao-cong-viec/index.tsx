import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Activity,
  AlarmClock,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileBarChart,
  Layers,
  ListChecks,
  ListTodo,
  Percent,
  PieChart as PieChartIcon,
  Sparkles,
  Trophy,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import { cn, formatDateShort } from '@/lib/utils';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import DateRangePicker, { type DateRangeValue } from '@/components/ui/DateRangePicker';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import type { Option } from '@/components/ui/MultiSelect';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import EnumBadge from '@/components/ui/EnumBadge';
import { StatsCard, StatsKpiGrid } from '@/components/shared/stats';
import type { StatsKpiCardItem } from '@/components/shared/stats';
import ExportDialog from '@/components/shared/ExportDialog';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useAuthStore } from '@/store/useStore';
import { CONFIRM_DELETE } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import {
  CONG_VIEC_MUC_DO,
  CONG_VIEC_TRANG_THAI,
  type CongViecMucDo,
  type CongViecTrangThai,
} from '@/features/quan-ly-giao-viec/cong-viec/core/constants';
import { useDeleteCongViecDanhSachMany } from '@/features/quan-ly-giao-viec/cong-viec/hooks/use-cong-viec-danh-sach';
import {
  CONG_VIEC_MUC_DO_BADGE_CONFIG,
  CONG_VIEC_TRANG_THAI_BADGE_CONFIG,
  congViecDeadlineChipClass,
  congViecThoiHanChipTone,
  congViecTienDoChipTone,
} from '@/features/quan-ly-giao-viec/cong-viec/core/display-badges';
import { formatCongViecTienDoTheoHan } from '@/features/quan-ly-giao-viec/cong-viec/utils/deadline-progress';
import type { CongViecDanhSachRow } from '@/features/quan-ly-giao-viec/cong-viec/core/types';
import {
  buildTaskReportRpcArgs,
  isNonDefaultTaskReportDateRange,
  resolveTaskReportDateRange,
} from './utils/build-rpc-args';
import {
  useTaskReportFilterOptions,
  useTaskReportKpi,
  useTaskReportLookup,
  useTaskReportPhanBoMucDo,
  useTaskReportPhanBoTrangThai,
  useTaskReportTopNguoiTao,
  useTaskReportTopTrachNhiem,
  useTaskReportTrend,
} from './hooks/use-cong-viec-bao-cao';
import { useTaskReportViewer } from './hooks/use-task-report-viewer';
import {
  MucDoBarChart,
  TopTrachNhiemChart,
  TrangThaiPieChart,
  TrendChart,
} from './components/cong-viec-bao-cao-charts';
import type {
  TaskReportLookupRow,
  TaskReportLookupSort,
  TaskReportPersonRow,
} from './core/types';

const CongViecDetail = lazy(
  () => import('@/features/quan-ly-giao-viec/cong-viec/components/cong-viec-detail'),
);

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'all',
  customStart: '',
  customEnd: '',
};

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
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

/** Convert lookup row → row khớp `CongViecDetail` (bù `ho_tro_display`). */
function toCongViecRow(row: TaskReportLookupRow): CongViecDanhSachRow {
  return {
    id: row.id,
    muc_do: row.muc_do,
    ten_cong_viec: row.ten_cong_viec,
    ghi_chu: row.ghi_chu,
    link_tai_lieu: row.link_tai_lieu,
    thoi_han: row.thoi_han,
    tien_do: row.tien_do,
    id_trach_nhiem: row.id_trach_nhiem,
    ids_ho_tro: row.ids_ho_tro,
    trang_thai: row.trang_thai,
    ket_qua: row.ket_qua,
    link_kq: row.link_kq,
    ngay_hoan_thanh: row.ngay_hoan_thanh,
    id_nguoi_tao: row.id_nguoi_tao,
    id_chuong_trinh: row.id_chuong_trinh ?? null,
    tg_tao: row.tg_tao,
    tg_cap_nhat: row.tg_cap_nhat,
    ho_va_ten_trach_nhiem: row.ho_va_ten_trach_nhiem,
    ten_tai_khoan_trach_nhiem: row.ten_tai_khoan_trach_nhiem,
    ho_va_ten_nguoi_tao: row.ho_va_ten_nguoi_tao,
    ten_tai_khoan_nguoi_tao: row.ten_tai_khoan_nguoi_tao,
    ten_chuong_trinh: row.ten_chuong_trinh ?? null,
    ho_tro_display: '',
  };
}

const SORT_OPTIONS: { id: TaskReportLookupSort; labelKey: string }[] = [
  { id: 'thoi_han_desc', labelKey: 'taskReport.sort.thoi_han_desc' },
  { id: 'thoi_han_asc', labelKey: 'taskReport.sort.thoi_han_asc' },
  { id: 'tien_do_desc', labelKey: 'taskReport.sort.tien_do_desc' },
  { id: 'trang_thai_asc', labelKey: 'taskReport.sort.trang_thai_asc' },
  { id: 'tg_cap_nhat_desc', labelKey: 'taskReport.sort.tg_cap_nhat_desc' },
];

const BaoCaoCongViecPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const canViewReport = useCan('view', 'taskReports');
  const canViewTasks = useCan('view', 'tasks');
  const canOpenPage = canViewReport || canViewTasks;
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canOpenPage || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('taskReport.noViewPermission'));
    navigate('/quan-ly-giao-viec', { replace: true });
  }, [user, canOpenPage, navigate]);

  const taskReportPerm = useResourcePermissions('taskReports');
  const tasksPerm = useResourcePermissions('tasks');
  const canExport = taskReportPerm.canExport || tasksPerm.canExport;
  const deleteMutation = useDeleteCongViecDanhSachMany();

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [idTrachNhiem, setIdTrachNhiem] = useState<string[]>([]);
  const [idNguoiTao, setIdNguoiTao] = useState<string[]>([]);
  const [trangThai, setTrangThai] = useState<CongViecTrangThai[]>([]);
  const [mucDo, setMucDo] = useState<CongViecMucDo[]>([]);
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<TaskReportLookupSort>('thoi_han_desc');

  const [viewing, setViewing] = useState<TaskReportLookupRow | null>(null);
  const [showExport, setShowExport] = useState(false);

  const presets = useMemo(
    () => [
      { id: 'all', label: txt('taskReport.preset.all') },
      { id: 'thisWeek', label: txt('taskReport.preset.thisWeek') },
      { id: 'thisMonth', label: txt('taskReport.preset.thisMonth') },
      { id: 'thisQuarter', label: txt('taskReport.preset.thisQuarter') },
      { id: 'thisYear', label: txt('taskReport.preset.thisYear') },
      { id: CUSTOM_PRESET, label: txt('taskReport.preset.custom') },
    ],
    [],
  );

  const resolvedRange = useMemo(
    () =>
      resolveTaskReportDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const viewer = useTaskReportViewer();

  const rpcArgs = useMemo(
    () =>
      buildTaskReportRpcArgs({
        range: resolvedRange,
        idTrachNhiem,
        idNguoiTao,
        trangThai,
        mucDo,
        overdueOnly,
        viewerId: viewer.viewerId,
        viewerDonViId: viewer.viewerDonViId,
        viewerPhongBanId: viewer.viewerPhongBanId,
        viewAll: viewer.viewAll,
      }),
    [
      resolvedRange,
      idTrachNhiem,
      idNguoiTao,
      trangThai,
      mucDo,
      overdueOnly,
      viewer.viewerId,
      viewer.viewerDonViId,
      viewer.viewerPhongBanId,
      viewer.viewAll,
    ],
  );

  // Reset trang khi đổi filter / sort / pageSize
  useEffect(() => {
    setPage(1);
  }, [rpcArgs, sort, pageSize]);

  /* ----- queries ----- */
  const kpiQuery = useTaskReportKpi(rpcArgs, { enabled: canOpenPage });
  const trendQuery = useTaskReportTrend(rpcArgs, 'auto', { enabled: canOpenPage });
  const trangThaiQuery = useTaskReportPhanBoTrangThai(rpcArgs, { enabled: canOpenPage });
  const mucDoQuery = useTaskReportPhanBoMucDo(rpcArgs, { enabled: canOpenPage });
  const topTrachNhiemQuery = useTaskReportTopTrachNhiem(rpcArgs, 10, { enabled: canOpenPage });
  const topNguoiTaoQuery = useTaskReportTopNguoiTao(rpcArgs, 10, { enabled: canOpenPage });
  const lookupQuery = useTaskReportLookup(
    rpcArgs,
    { limit: pageSize, offset: (page - 1) * pageSize, sort },
    { enabled: canOpenPage },
  );
  const filterOptionsQuery = useTaskReportFilterOptions(
    {
      p_start: rpcArgs.p_start,
      p_end: rpcArgs.p_end,
      p_viewer_id: rpcArgs.p_viewer_id,
      p_viewer_don_vi_id: rpcArgs.p_viewer_don_vi_id,
      p_viewer_phong_ban_id: rpcArgs.p_viewer_phong_ban_id,
      p_view_all: rpcArgs.p_view_all,
    },
    { enabled: canOpenPage },
  );

  /* ----- derived ----- */
  const kpi = kpiQuery.data;
  const lookupRows = lookupQuery.data?.rows ?? [];
  const lookupTotal = lookupQuery.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(lookupTotal / pageSize));

  const trachNhiemOpts = useMemo<Option[]>(
    () =>
      (filterOptionsQuery.data?.trach_nhiem ?? []).map((o) => ({
        label: o.label,
        value: o.id,
        count: o.count,
      })),
    [filterOptionsQuery.data],
  );
  const nguoiTaoOpts = useMemo<Option[]>(
    () =>
      (filterOptionsQuery.data?.nguoi_tao ?? []).map((o) => ({
        label: o.label,
        value: o.id,
        count: o.count,
      })),
    [filterOptionsQuery.data],
  );

  const trangThaiOptions = useMemo<Option[]>(
    () =>
      CONG_VIEC_TRANG_THAI.map((value) => {
        const found = trangThaiQuery.data?.find((d) => d.value === value);
        return { label: value, value, count: found?.count ?? 0 };
      }),
    [trangThaiQuery.data],
  );
  const mucDoOptions = useMemo<Option[]>(
    () =>
      CONG_VIEC_MUC_DO.map((value) => {
        const found = mucDoQuery.data?.find((d) => d.value === value);
        return { label: value, value, count: found?.count ?? 0 };
      }),
    [mucDoQuery.data],
  );

  /* ----- mobile filter groups ----- */
  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'trang_thai',
        label: txt('taskReport.filterTrangThai'),
        icon: ListChecks,
        options: trangThaiOptions,
        value: trangThai,
        onChange: (v) => setTrangThai(v as CongViecTrangThai[]),
      },
      {
        key: 'muc_do',
        label: txt('taskReport.filterMucDo'),
        icon: Layers,
        options: mucDoOptions,
        value: mucDo,
        onChange: (v) => setMucDo(v as CongViecMucDo[]),
      },
      {
        key: 'trach_nhiem',
        label: txt('taskReport.filterTrachNhiem'),
        icon: User,
        options: trachNhiemOpts,
        value: idTrachNhiem,
        onChange: setIdTrachNhiem,
      },
      {
        key: 'nguoi_tao',
        label: txt('taskReport.filterNguoiTao'),
        icon: UserCog,
        options: nguoiTaoOpts,
        value: idNguoiTao,
        onChange: setIdNguoiTao,
      },
      {
        key: 'overdue_only',
        label: txt('taskReport.filterOverdueOnly'),
        icon: AlertTriangle,
        options: [{ label: txt('taskReport.filterOverdueOnly'), value: 'on' }],
        value: overdueOnly ? ['on'] : [],
        onChange: (v) => setOverdueOnly(v.includes('on')),
      },
    ],
    [trangThai, mucDo, idTrachNhiem, idNguoiTao, trangThaiOptions, mucDoOptions, trachNhiemOpts, nguoiTaoOpts, overdueOnly],
  );

  const isNonDefaultDateRange = useMemo(() => isNonDefaultTaskReportDateRange(dateRange), [dateRange]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (isNonDefaultDateRange) n += 1;
    if (idTrachNhiem.length) n += 1;
    if (idNguoiTao.length) n += 1;
    if (trangThai.length) n += 1;
    if (mucDo.length) n += 1;
    if (overdueOnly) n += 1;
    return n;
  }, [isNonDefaultDateRange, idTrachNhiem, idNguoiTao, trangThai, mucDo, overdueOnly]);

  const clearFilters = useCallback(() => {
    setDateRange(initialDateRange);
    setIdTrachNhiem([]);
    setIdNguoiTao([]);
    setTrangThai([]);
    setMucDo([]);
    setOverdueOnly(false);
  }, []);

  /* ----- KPI cards ----- */
  const completionRate = useMemo(() => {
    if (!kpi || kpi.total === 0) return null;
    return Math.round((kpi.hoan_thanh_dung_han / kpi.total) * 100);
  }, [kpi]);

  const kpiItems = useMemo<StatsKpiCardItem[]>(
    () => [
      {
        id: 'total',
        label: txt('taskReport.kpiTotal'),
        value: kpi?.total ?? 0,
        icon: ListTodo,
        bg: 'bg-primary/10',
        color: 'text-primary',
        delta: null,
      },
      {
        id: 'moi',
        label: txt('taskReport.kpiMoi'),
        value: kpi?.moi ?? 0,
        icon: Sparkles,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
      {
        id: 'dang',
        label: txt('taskReport.kpiDang'),
        value: kpi?.dang ?? 0,
        icon: Activity,
        bg: 'bg-blue-500/10',
        color: 'text-blue-600 dark:text-blue-400',
        delta: null,
      },
      {
        id: 'hoan_thanh',
        label: txt('taskReport.kpiHoanThanh'),
        value: kpi?.hoan_thanh ?? 0,
        icon: CheckCircle2,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'qua_han',
        label: txt('taskReport.kpiQuaHan'),
        value: kpi?.qua_han ?? 0,
        icon: AlertTriangle,
        bg: 'bg-rose-500/10',
        color: 'text-rose-600 dark:text-rose-400',
        delta: null,
      },
      {
        id: 'sap_het_han',
        label: txt('taskReport.kpiSapHetHan'),
        value: kpi?.sap_het_han ?? 0,
        icon: AlarmClock,
        bg: 'bg-amber-500/10',
        color: 'text-amber-600 dark:text-amber-400',
        delta: null,
      },
      {
        id: 'completion_rate',
        label: txt('taskReport.kpiHoanThanhDungHan'),
        value: completionRate == null ? '—' : `${completionRate}%`,
        icon: Percent,
        bg: 'bg-violet-500/10',
        color: 'text-violet-600 dark:text-violet-400',
        delta: null,
      },
      {
        id: 'distinct_trach_nhiem',
        label: txt('taskReport.kpiDistinctTrachNhiem'),
        value: kpi?.distinct_trach_nhiem ?? 0,
        icon: Users,
        bg: 'bg-indigo-500/10',
        color: 'text-indigo-600 dark:text-indigo-400',
        delta: null,
      },
    ],
    [kpi, completionRate],
  );

  /* ----- export (chỉ trang lookup hiện tại để tránh tải lại toàn bộ) ----- */
  const exportColumns = useMemo(
    () => [
      { key: 'ten_cong_viec', label: txt('taskReport.tableColTen') },
      { key: 'muc_do', label: txt('taskReport.tableColMucDo') },
      { key: 'trang_thai', label: txt('taskReport.tableColTrangThai') },
      { key: 'thoi_han', label: txt('taskReport.tableColThoiHan') },
      { key: 'tien_do', label: txt('taskReport.tableColTienDo') },
      { key: 'trach_nhiem', label: txt('taskReport.tableColTrachNhiem') },
      { key: 'nguoi_tao', label: txt('taskReport.tableColNguoiTao') },
      { key: 'ngay_hoan_thanh', label: txt('taskList.form.ngayHoanThanh') },
      { key: 'tg_cap_nhat', label: txt('taskReport.tableColTgCapNhat') },
      { key: 'range_start', label: txt('taskReport.exportRangeFrom') },
      { key: 'range_end', label: txt('taskReport.exportRangeTo') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: TaskReportLookupRow) => ({
      ten_cong_viec: item.ten_cong_viec,
      muc_do: item.muc_do,
      trang_thai: item.trang_thai,
      thoi_han: item.thoi_han ?? '',
      tien_do: formatCongViecTienDoTheoHan(item.thoi_han, item.trang_thai),
      trach_nhiem: item.ho_va_ten_trach_nhiem ?? item.ten_tai_khoan_trach_nhiem ?? '',
      nguoi_tao: item.ho_va_ten_nguoi_tao ?? item.ten_tai_khoan_nguoi_tao ?? '',
      ngay_hoan_thanh: item.ngay_hoan_thanh ?? '',
      tg_cap_nhat: item.tg_cap_nhat,
      range_start: resolvedRange.start,
      range_end: resolvedRange.end,
    }),
    [resolvedRange.start, resolvedRange.end],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
    data: lookupRows,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination: EXPORT_PAGINATION,
    selectedIds: new Set(),
    keyExtractor: (r) => r.id,
  });

  const handleExport = () => {
    if (lookupRows.length === 0) {
      toast.warning(txt('taskReport.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('taskList.deleteTitle'),
      message: txt('taskList.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMutation.mutate([id], {
          onSuccess: () => {
            if (viewing?.id === id) setViewing(null);
          },
        });
      },
    });
  };

  /* ----- toolbar slots ----- */
  const dateRangeRow = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 w-full">
      <DateRangePicker
        presets={presets}
        value={dateRange}
        onChange={setDateRange}
        placeholder={txt('taskReport.dateRangeLabel')}
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
        icon={ListChecks}
        options={trangThaiOptions}
        value={trangThai}
        onChange={(v) => setTrangThai(v as CongViecTrangThai[])}
        placeholder={txt('taskReport.filterTrangThai')}
        className="shrink-0 w-[150px]"
        hideZeroCount={false}
      />
      <FilterChipMultiSelect
        icon={Layers}
        options={mucDoOptions}
        value={mucDo}
        onChange={(v) => setMucDo(v as CongViecMucDo[])}
        placeholder={txt('taskReport.filterMucDo')}
        className="shrink-0 w-[140px]"
        hideZeroCount={false}
      />
      <FilterChipMultiSelect
        icon={User}
        options={trachNhiemOpts}
        value={idTrachNhiem}
        onChange={setIdTrachNhiem}
        placeholder={txt('taskReport.filterTrachNhiem')}
        className="shrink-0 w-[170px]"
      />
      <FilterChipMultiSelect
        icon={UserCog}
        options={nguoiTaoOpts}
        value={idNguoiTao}
        onChange={setIdNguoiTao}
        placeholder={txt('taskReport.filterNguoiTao')}
        className="shrink-0 w-[160px]"
      />
      <button
        type="button"
        onClick={() => setOverdueOnly((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-xs font-medium transition-colors shrink-0',
          overdueOnly
            ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
            : 'bg-card border-border text-muted-foreground hover:bg-muted',
        )}
        aria-pressed={overdueOnly}
      >
        <AlertTriangle size={13} />
        {txt('taskReport.filterOverdueOnly')}
      </button>
    </div>
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

  if (!canOpenPage) {
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

  const isLoadingHeavy =
    kpiQuery.isLoading || trendQuery.isLoading || trangThaiQuery.isLoading || mucDoQuery.isLoading;

  return (
    <div className="flex flex-col h-page relative min-h-0" aria-label={txt('taskReport.title')}>
      <DashboardToolbar
        className="shrink-0 mb-3"
        onBack={() => navigate('/quan-ly-giao-viec')}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangeRow}</div>
        }
        filters={filterRowDesktop}
        filterGroups={filterGroups}
        actions={
          <div className="hidden sm:flex items-center gap-2 shrink-0">{renderExportToolbarButton()}</div>
        }
        mobileActions={renderExportToolbarButton()}
        activeFilterCount={activeFilterCount}
        onClearFilters={activeFilterCount ? clearFilters : undefined}
      />

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card shadow-sm p-3 sm:p-4 space-y-4">
        {isLoadingHeavy && !kpi ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{txt('taskReport.loading')}</p>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={4} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('taskReport.chartTrendTitle')} icon={Clock} spanTwo>
                <TrendChart data={trendQuery.data ?? []} />
              </StatsCard>
              <StatsCard title={txt('taskReport.chartPhanBoTrangThai')} icon={PieChartIcon}>
                <TrangThaiPieChart data={trangThaiQuery.data ?? []} />
              </StatsCard>
              <StatsCard title={txt('taskReport.chartPhanBoMucDo')} icon={Layers}>
                <MucDoBarChart data={mucDoQuery.data ?? []} />
              </StatsCard>
            </div>

            <StatsCard title={txt('taskReport.chartTopTrachNhiem')} icon={Trophy} spanTwo>
              <TopTrachNhiemChart data={topTrachNhiemQuery.data ?? []} />
            </StatsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('taskReport.tableTopTrachNhiem')} icon={User}>
                <PersonStatsTable rows={topTrachNhiemQuery.data ?? []} showDoing />
              </StatsCard>
              <StatsCard title={txt('taskReport.tableTopNguoiTao')} icon={UserCog}>
                <PersonStatsTable rows={topNguoiTaoQuery.data ?? []} />
              </StatsCard>
            </div>

            <StatsCard title={txt('taskReport.tableLookupTitle')} icon={FileBarChart}>
              <LookupSection
                rows={lookupRows}
                total={lookupTotal}
                isLoading={lookupQuery.isLoading || lookupQuery.isFetching}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                sort={sort}
                onSortChange={setSort}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                onRowClick={setViewing}
              />
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
        fileName={txt('taskReport.exportFileName')}
        visibleColumnKeys={exportColumns.map((c) => c.key)}
      />

      <AnimatePresence>
        {viewing && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <CongViecDetail
              data={toCongViecRow(viewing)}
              onClose={() => setViewing(null)}
              onEdit={() => navigate('/quan-ly-giao-viec/cong-viec')}
              onDelete={handleDelete}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub-component: bảng top người (rich, không dùng StatsTableCard)   */
/* ------------------------------------------------------------------ */

const PersonStatsTable: React.FC<{ rows: TaskReportPersonRow[]; showDoing?: boolean }> = ({
  rows,
  showDoing = false,
}) => {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">{txt('taskReport.noData')}</p>;
  }
  return (
    <div className="overflow-x-auto -m-4">
      <table className="w-full text-sm min-w-[480px]">
        <thead className="sticky top-0 bg-card border-b border-border">
          <tr className="text-left text-muted-foreground">
            <th className="py-2 px-3 font-medium">{txt('taskReport.tableColPerson')}</th>
            <th className="py-2 px-2 font-medium text-right">{txt('taskReport.tableColTotal')}</th>
            <th className="py-2 px-2 font-medium text-right">{txt('taskReport.tableColHoanThanh')}</th>
            {showDoing ? (
              <th className="py-2 px-2 font-medium text-right">{txt('taskReport.tableColDang')}</th>
            ) : null}
            <th className="py-2 px-2 font-medium text-right">{txt('taskReport.tableColQuaHan')}</th>
            <th className="py-2 px-3 font-medium text-right">{txt('taskReport.tableColCompletionRate')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/60 hover:bg-muted/40">
              <td className="py-2 px-3 max-w-[180px] truncate text-foreground" title={r.ho_va_ten ?? r.ten_tai_khoan ?? r.id}>
                {r.ho_va_ten ?? r.ten_tai_khoan ?? r.id}
              </td>
              <td className="py-2 px-2 text-right tabular-nums">{r.total}</td>
              <td className="py-2 px-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">{r.hoan_thanh}</td>
              {showDoing ? (
                <td className="py-2 px-2 text-right tabular-nums text-blue-600 dark:text-blue-400">{r.dang ?? 0}</td>
              ) : null}
              <td className="py-2 px-2 text-right tabular-nums text-rose-600 dark:text-rose-400">{r.qua_han}</td>
              <td className="py-2 px-3 text-right tabular-nums font-medium">
                {r.completion_rate == null ? '—' : `${r.completion_rate}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Sub-component: bảng tra cứu phân trang server-side                */
/* ------------------------------------------------------------------ */

interface LookupSectionProps {
  rows: TaskReportLookupRow[];
  total: number;
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: TaskReportLookupSort;
  onSortChange: (sort: TaskReportLookupSort) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick: (row: TaskReportLookupRow) => void;
}

const LookupSection: React.FC<LookupSectionProps> = ({
  rows,
  total,
  isLoading,
  page,
  pageSize,
  totalPages,
  sort,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRowClick,
}) => {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{txt('taskReport.sortBy')}:</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as TaskReportLookupSort)}
            className="text-xs h-8 rounded-md border border-border bg-card px-2"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {txt(o.labelKey)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{txt('taskReport.rowsPerPage')}:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="text-xs h-8 rounded-md border border-border bg-card px-2"
          >
            {PAGE_SIZE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[min(520px,55vh)] overflow-y-auto -mx-4 px-4">
        <table className="w-full text-sm min-w-[820px]">
          <thead className="sticky top-0 z-[1] bg-card border-b border-border">
            <tr className="text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{txt('taskReport.tableColTen')}</th>
              <th className="py-2 pr-3 font-medium">{txt('taskReport.tableColMucDo')}</th>
              <th className="py-2 pr-3 font-medium">{txt('taskReport.tableColTrangThai')}</th>
              <th className="py-2 pr-3 font-medium">{txt('taskReport.tableColThoiHan')}</th>
              <th className="py-2 pr-3 font-medium">{txt('taskReport.tableColTienDo')}</th>
              <th className="py-2 pr-3 font-medium">{txt('taskReport.tableColTrachNhiem')}</th>
              <th className="py-2 pr-3 font-medium">{txt('taskReport.tableColNguoiTao')}</th>
              <th className="py-2 font-medium">{txt('taskReport.tableColTgCapNhat')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  {txt('taskReport.noData')}
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const tienDoLabel = formatCongViecTienDoTheoHan(row.thoi_han, row.trang_thai);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 hover:bg-muted/40 cursor-pointer"
                    onClick={() => onRowClick(row)}
                  >
                    <td className="py-2 pr-3 max-w-[220px] truncate font-medium text-foreground">
                      {row.ten_cong_viec}
                    </td>
                    <td className="py-2 pr-3">
                      <EnumBadge
                        value={row.muc_do}
                        config={CONG_VIEC_MUC_DO_BADGE_CONFIG}
                        shape="rounded"
                        truncate
                        className="text-[11px] leading-tight"
                      />
                    </td>
                    <td className="py-2 pr-3">
                      <EnumBadge
                        value={row.trang_thai}
                        config={CONG_VIEC_TRANG_THAI_BADGE_CONFIG}
                        truncate
                        className="text-[11px] leading-tight"
                      />
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {row.thoi_han ? (
                        <span
                          className={congViecDeadlineChipClass(
                            congViecThoiHanChipTone(row.thoi_han, row.trang_thai),
                          )}
                        >
                          {formatDateShort(row.thoi_han)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{txt('common.emptyCell')}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className={congViecDeadlineChipClass(
                          congViecTienDoChipTone(row.thoi_han, row.trang_thai),
                        )}
                        title={tienDoLabel}
                      >
                        {tienDoLabel}
                      </span>
                    </td>
                    <td className="py-2 pr-3 max-w-[160px] truncate text-muted-foreground">
                      {row.ho_va_ten_trach_nhiem ?? row.ten_tai_khoan_trach_nhiem ?? '—'}
                    </td>
                    <td className="py-2 pr-3 max-w-[160px] truncate text-muted-foreground">
                      {row.ho_va_ten_nguoi_tao ?? row.ten_tai_khoan_nguoi_tao ?? '—'}
                    </td>
                    <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDateShort(row.tg_cap_nhat)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          {total === 0
            ? txt('taskReport.paginationEmpty')
            : txt('taskReport.paginationLabel', { from, to, total })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(Math.max(1, page - 1))}
            className="h-8 w-8 p-0 inline-flex items-center justify-center"
            aria-label={txt('common.prevPage')}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={page >= totalPages || isLoading}
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            className="h-8 w-8 p-0 inline-flex items-center justify-center"
            aria-label={txt('common.nextPage')}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BaoCaoCongViecPage;
