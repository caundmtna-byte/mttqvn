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
  Warehouse,
  Package,
  HandHeart,
  Flag,
  Layers,
  Download,
  FileText,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowLeftRight,
  Boxes,
  Coins,
} from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence } from 'framer-motion';
import { txt } from '@/lib/text';
import { cn, formatCurrency, getLanguage } from '@/lib/utils';
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
import { CHART_FILL_FALLBACK } from '@/lib/constants/chart-colors';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import type { Option } from '@/components/ui/MultiSelect';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import ChartTooltip from '@/components/ui/ChartTooltip';
import ErrorState from '@/components/shared/ErrorState';
import { queryKeys } from '@/lib/query-keys';
import {
  NHAP_XUAT_KHO_LOAI_PHIEU,
  loaiPhieuLabel,
} from '../nhap-xuat-kho/core/constants';
import type { NhapXuatKhoLoaiPhieu } from '../nhap-xuat-kho/core/constants';
import { useNhapXuatKhoDetail } from '../nhap-xuat-kho/hooks/use-kho-nhap-xuat-kho';
import type { NhapXuatKhoDetail } from '../nhap-xuat-kho/core/types';
import { useKhoBaoCaoHoTroRawData } from './hooks/use-kho-bao-cao-ho-tro';
import type { ReliefSupportDimensionFilters, ReliefSupportLookupSortKey } from './core/types';
import {
  buildReliefMasterMaps,
  computeReliefSupportStats,
  resolveReliefStatsDateRange,
  sortReliefLookupRows,
} from './utils/aggregate-kho-ho-tro-stats';
import { exportBaoCaoHoTroToExcel } from './utils/export-bao-cao-ho-tro';

const KhoNhapXuatKhoDetailDrawer = lazy(
  () => import('../nhap-xuat-kho/components/kho-nhap-xuat-kho-detail'),
);

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'all',
  customStart: '',
  customEnd: '',
};

const initialDims: ReliefSupportDimensionFilters = {
  kho_id: [],
  loai_phieu: [],
  don_vi_cuu_tro_id: [],
  dot_cuu_tro_id: [],
  hang_hoa_id: [],
  id_danh_muc: [],
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

function buildCountOptions(entries: Map<string, { label: string; count: number }>): Option[] {
  return [...entries.entries()]
    .map(([value, v]) => ({ value, label: v.label, count: v.count }))
    .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
}

const KhoBaoCaoHoTroPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranReliefSupportReport');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const { canExport } = useResourcePermissions('matTranReliefSupportReport');
  const canOpenPhieuDetail = useCan('view', 'matTranReliefStockTransactions');
  const didRedirect = useRef(false);

  const listQueryEnabled = Boolean(
    user &&
      (user.role === 'admin' || (matrixActive && canView)),
  );

  const chucVuKey = user
    ? Array.isArray(user.id_chuc_vu)
      ? (user.id_chuc_vu[0] ?? '')
      : String(user.id_chuc_vu ?? '')
    : '';
  const waitingMatrixHydrate =
    user != null &&
    user.role !== 'admin' &&
    chucVuKey.trim() !== '' &&
    !matrixActive;

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranReliefSupportReport.noViewPermission'));
    navigate('/mat-tran-to-quoc', { replace: true });
  }, [user, canView, navigate]);

  const {
    flatLines,
    khoList,
    hangList,
    donViList,
    dotList,
    tonMatrix,
    isLoading,
    isError,
    error,
    refetch,
  } = useKhoBaoCaoHoTroRawData({ enabled: listQueryEnabled });
  const isReportLoading = isLoading || waitingMatrixHydrate;

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [dims, setDims] = useState<ReliefSupportDimensionFilters>(initialDims);
  const [sortKey, setSortKey] = useState<ReliefSupportLookupSortKey>('ngay_phieu');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewingPhieuId, setViewingPhieuId] = useState<string | null>(null);

  const { data: viewingPhieu } = useNhapXuatKhoDetail(viewingPhieuId, {
    enabled: Boolean(viewingPhieuId?.trim()) && canOpenPhieuDetail,
  });

  const master = useMemo(
    () => buildReliefMasterMaps(donViList, dotList, hangList, khoList),
    [donViList, dotList, hangList, khoList],
  );

  const resolvedRange = useMemo(
    () => resolveReliefStatsDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const stats = useMemo(
    () => computeReliefSupportStats(flatLines, master, tonMatrix, resolvedRange, dims),
    [flatLines, master, tonMatrix, resolvedRange, dims],
  );

  const sortedLookup = useMemo(
    () => sortReliefLookupRows(stats.filtered, sortKey, sortDir, getLanguage()),
    [stats.filtered, sortKey, sortDir],
  );

  const presets = useMemo(() => buildStandardDateRangePresets(), []);

  const khoOptions = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>();
    for (const row of flatLines) {
      for (const id of [row.kho_nhap_id, row.kho_xuat_id]) {
        if (!id?.trim()) continue;
        const label = master.khoMap[id]?.ten_kho ?? id;
        const prev = m.get(id);
        if (prev) prev.count += 1;
        else m.set(id, { label, count: 1 });
      }
    }
    return buildCountOptions(m);
  }, [flatLines, master.khoMap]);

  const loaiOptions = useMemo<Option[]>(() => {
    const counts = new Map<NhapXuatKhoLoaiPhieu, number>();
    for (const loai of NHAP_XUAT_KHO_LOAI_PHIEU) counts.set(loai, 0);
    for (const row of flatLines) {
      counts.set(row.loai_phieu, (counts.get(row.loai_phieu) ?? 0) + 1);
    }
    return NHAP_XUAT_KHO_LOAI_PHIEU.map((loai) => ({
      value: loai,
      label: loaiPhieuLabel(loai),
      count: counts.get(loai) ?? 0,
    }));
  }, [flatLines]);

  const donViOptions = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>();
    for (const row of flatLines) {
      const id = row.don_vi_cuu_tro_id?.trim();
      if (!id) continue;
      const label = row.ten_don_vi_cuu_tro ?? master.donViMap[id]?.ten ?? id;
      const prev = m.get(id);
      if (prev) prev.count += 1;
      else m.set(id, { label, count: 1 });
    }
    return buildCountOptions(m);
  }, [flatLines, master.donViMap]);

  const dotOptions = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>();
    for (const row of flatLines) {
      const id = row.dot_cuu_tro_id?.trim();
      if (!id) continue;
      const label = row.ten_dot_cuu_tro ?? master.dotMap[id]?.ten ?? id;
      const prev = m.get(id);
      if (prev) prev.count += 1;
      else m.set(id, { label, count: 1 });
    }
    return buildCountOptions(m);
  }, [flatLines, master.dotMap]);

  const hangOptions = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>();
    for (const row of flatLines) {
      const id = row.hang_hoa_id?.trim();
      if (!id) continue;
      const label = row.ten_hang_hoa ?? master.hangMap[id]?.ten_hang_hoa ?? id;
      const prev = m.get(id);
      if (prev) prev.count += 1;
      else m.set(id, { label, count: 1 });
    }
    return buildCountOptions(m);
  }, [flatLines, master.hangMap]);

  const danhMucOptions = useMemo(() => {
    const m = new Map<string, { label: string; count: number }>();
    for (const row of flatLines) {
      const cat = master.hangMap[row.hang_hoa_id]?.id_danh_muc;
      if (!cat?.trim()) continue;
      const label = master.hangMap[row.hang_hoa_id]?.ten_danh_muc_nhom ?? cat;
      const prev = m.get(cat);
      if (prev) prev.count += 1;
      else m.set(cat, { label, count: 1 });
    }
    return buildCountOptions(m);
  }, [flatLines, master.hangMap]);

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'kho',
        label: txt('matTranReliefSupportReport.filterKho'),
        icon: Warehouse,
        options: khoOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.kho_id,
        onChange: (v) => setDims((d) => ({ ...d, kho_id: v })),
      },
      {
        key: 'loai_phieu',
        label: txt('matTranReliefSupportReport.filterLoaiPhieu'),
        icon: FileText,
        options: loaiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.loai_phieu,
        onChange: (v) => setDims((d) => ({ ...d, loai_phieu: v as NhapXuatKhoLoaiPhieu[] })),
      },
      {
        key: 'don_vi',
        label: txt('matTranReliefSupportReport.filterDonVi'),
        icon: HandHeart,
        options: donViOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.don_vi_cuu_tro_id,
        onChange: (v) => setDims((d) => ({ ...d, don_vi_cuu_tro_id: v })),
      },
      {
        key: 'dot',
        label: txt('matTranReliefSupportReport.filterDot'),
        icon: Flag,
        options: dotOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.dot_cuu_tro_id,
        onChange: (v) => setDims((d) => ({ ...d, dot_cuu_tro_id: v })),
      },
      {
        key: 'hang_hoa',
        label: txt('matTranReliefSupportReport.filterHangHoa'),
        icon: Package,
        options: hangOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.hang_hoa_id,
        onChange: (v) => setDims((d) => ({ ...d, hang_hoa_id: v })),
      },
      {
        key: 'danh_muc',
        label: txt('matTranReliefSupportReport.filterDanhMuc'),
        icon: Layers,
        options: danhMucOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.id_danh_muc,
        onChange: (v) => setDims((d) => ({ ...d, id_danh_muc: v })),
      },
    ],
    [dims, khoOptions, loaiOptions, donViOptions, dotOptions, hangOptions, danhMucOptions],
  );

  const isNonDefaultDateRange = useMemo(
    () => isStandardDateRangeNonDefault(dateRange, initialDateRange.preset as 'all'),
    [dateRange],
  );

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (isNonDefaultDateRange) n += 1;
    if (dims.kho_id.length) n += 1;
    if (dims.loai_phieu.length) n += 1;
    if (dims.don_vi_cuu_tro_id.length) n += 1;
    if (dims.dot_cuu_tro_id.length) n += 1;
    if (dims.hang_hoa_id.length) n += 1;
    if (dims.id_danh_muc.length) n += 1;
    return n;
  }, [dims, isNonDefaultDateRange]);

  const clearFilters = useCallback(() => {
    setDims(initialDims);
    setDateRange(initialDateRange);
  }, []);

  const kpiItems = useMemo(
    () => [
      {
        id: 'phieu',
        label: txt('matTranReliefSupportReport.kpiPhieu'),
        value: stats.kpis.phieuCount,
        icon: FileText,
        bg: 'bg-rose-500/10',
        color: 'text-rose-600 dark:text-rose-400',
        delta: null,
      },
      {
        id: 'line',
        label: txt('matTranReliefSupportReport.kpiLine'),
        value: stats.kpis.lineCount,
        icon: Layers,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
      {
        id: 'nhapSl',
        label: txt('matTranReliefSupportReport.kpiNhapSl'),
        value: stats.kpis.nhapSoLuong,
        icon: ArrowDownToLine,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'nhapTien',
        label: txt('matTranReliefSupportReport.kpiNhapTien'),
        value: formatCurrency(stats.kpis.nhapThanhTien),
        icon: Coins,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'xuatSl',
        label: txt('matTranReliefSupportReport.kpiXuatSl'),
        value: stats.kpis.xuatSoLuong,
        icon: ArrowUpFromLine,
        bg: 'bg-orange-500/10',
        color: 'text-orange-600 dark:text-orange-400',
        delta: null,
      },
      {
        id: 'xuatTien',
        label: txt('matTranReliefSupportReport.kpiXuatTien'),
        value: formatCurrency(stats.kpis.xuatThanhTien),
        icon: Coins,
        bg: 'bg-orange-500/10',
        color: 'text-orange-600 dark:text-orange-400',
        delta: null,
      },
      {
        id: 'chuyen',
        label: txt('matTranReliefSupportReport.kpiChuyenSl'),
        value: stats.kpis.chuyenSoLuong,
        icon: ArrowLeftRight,
        bg: 'bg-indigo-500/10',
        color: 'text-indigo-600 dark:text-indigo-400',
        delta: null,
      },
      {
        id: 'donVi',
        label: txt('matTranReliefSupportReport.kpiDonVi'),
        value: stats.kpis.donViCoPhatSinh,
        icon: HandHeart,
        bg: 'bg-violet-500/10',
        color: 'text-violet-600 dark:text-violet-400',
        delta: null,
      },
      {
        id: 'dot',
        label: txt('matTranReliefSupportReport.kpiDot'),
        value: stats.kpis.dotCoXuat,
        icon: Flag,
        bg: 'bg-amber-500/10',
        color: 'text-amber-600 dark:text-amber-400',
        delta: null,
      },
      {
        id: 'ton',
        label: txt('matTranReliefSupportReport.kpiTonSl'),
        value: stats.kpis.tonTongSoLuong,
        icon: Boxes,
        bg: 'bg-teal-500/10',
        color: 'text-teal-600 dark:text-teal-400',
        delta: null,
      },
      {
        id: 'khoCoHang',
        label: txt('matTranReliefSupportReport.kpiKhoCoHang'),
        value: stats.kpis.khoCoHang,
        icon: Warehouse,
        bg: 'bg-teal-500/10',
        color: 'text-teal-600 dark:text-teal-400',
        delta: null,
      },
    ],
    [stats.kpis],
  );

  const loaiDonViBar = useMemo(
    () => stats.byLoaiDonVi.map((r) => ({ label: r.label, count: r.value })),
    [stats.byLoaiDonVi],
  );

  const handleExport = useCallback(async () => {
    if (stats.filtered.length === 0) {
      toast.warning(txt('matTranReliefSupportReport.noExportData'));
      return;
    }
    try {
      await exportBaoCaoHoTroToExcel({
        kpis: stats.kpis,
        topDonVi: stats.topDonVi,
        topDot: stats.topDot,
        byLoaiDonVi: stats.byLoaiDonVi,
        lookupRows: sortedLookup,
      });
      toast.success(txt('matTranReliefSupportReport.export.success'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : txt('matTranReliefSupportReport.export.error'));
    }
  }, [stats, sortedLookup]);

  const handleViewPhieu = useCallback(
    (phieuId: string) => {
      if (!canOpenPhieuDetail) return;
      const listRow = flatLines.find((r) => r.phieu_id === phieuId);
      if (listRow) {
        const seed: NhapXuatKhoDetail = {
          id: listRow.phieu_id,
          tt: 0,
          so_phieu: listRow.so_phieu,
          loai_phieu: listRow.loai_phieu,
          ngay_phieu: listRow.ngay_phieu,
          kho_xuat_id: listRow.kho_xuat_id,
          ten_kho_xuat: listRow.ten_kho_xuat,
          kho_xuat_don_vi_id: listRow.kho_xuat_don_vi_id,
          kho_nhap_id: listRow.kho_nhap_id,
          ten_kho_nhap: listRow.ten_kho_nhap,
          kho_nhap_don_vi_id: listRow.kho_nhap_don_vi_id,
          don_vi_cuu_tro_id: listRow.don_vi_cuu_tro_id,
          ten_don_vi_cuu_tro: listRow.ten_don_vi_cuu_tro,
          dot_cuu_tro_id: listRow.dot_cuu_tro_id,
          ten_dot_cuu_tro: listRow.ten_dot_cuu_tro,
          so_dong: 0,
          ghi_chu: null,
          nguoi_giao_nhan: null,
          bo_phan: null,
          chung_tu_goc: null,
          chi_tiet: [],
          tg_tao: '',
          tg_cap_nhat: '',
        };
        queryClient.setQueryData(queryKeys.khoNhapXuatKho.detail(phieuId), seed);
      }
      setViewingPhieuId(phieuId);
    },
    [canOpenPhieuDetail, flatLines, queryClient],
  );

  const toggleSort = (key: ReliefSupportLookupSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'ngay_phieu' || key === 'so_luong' || key === 'thanh_tien' ? 'desc' : 'asc');
    }
  };

  const dateRangePicker = (
    <DateRangePicker
      presets={presets}
      value={dateRange}
      onChange={setDateRange}
      placeholder={txt('matTranReliefSupportReport.dateRangeLabel')}
      customPresetId={CUSTOM_PRESET}
      className="shrink-0"
    />
  );

  const renderExportToolbarButton = () =>
    canExport ? (
      <Tooltip content={txt('common.export')} placement="bottom">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => void handleExport()}
          className="inline-flex min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0 h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
        >
          <Download className="w-4 h-4" />
        </Button>
      </Tooltip>
    ) : null;

  const filterPanelDesktop = (
    <>
      <div className="flex shrink-0 items-center">{dateRangePicker}</div>
      <div className="hidden h-6 w-px shrink-0 self-center bg-border sm:block" aria-hidden />
      <FilterChipMultiSelect
        icon={Warehouse}
        options={khoOptions}
        value={dims.kho_id}
        onChange={(v) => setDims((d) => ({ ...d, kho_id: v }))}
        placeholder={txt('matTranReliefSupportReport.filterKho')}
        className="w-[10rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={FileText}
        options={loaiOptions}
        value={dims.loai_phieu}
        onChange={(v) => setDims((d) => ({ ...d, loai_phieu: v as NhapXuatKhoLoaiPhieu[] }))}
        placeholder={txt('matTranReliefSupportReport.filterLoaiPhieu')}
        className="w-[11rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={HandHeart}
        options={donViOptions}
        value={dims.don_vi_cuu_tro_id}
        onChange={(v) => setDims((d) => ({ ...d, don_vi_cuu_tro_id: v }))}
        placeholder={txt('matTranReliefSupportReport.filterDonVi')}
        className="w-[11rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Flag}
        options={dotOptions}
        value={dims.dot_cuu_tro_id}
        onChange={(v) => setDims((d) => ({ ...d, dot_cuu_tro_id: v }))}
        placeholder={txt('matTranReliefSupportReport.filterDot')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Package}
        options={hangOptions}
        value={dims.hang_hoa_id}
        onChange={(v) => setDims((d) => ({ ...d, hang_hoa_id: v }))}
        placeholder={txt('matTranReliefSupportReport.filterHangHoa')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Layers}
        options={danhMucOptions}
        value={dims.id_danh_muc}
        onChange={(v) => setDims((d) => ({ ...d, id_danh_muc: v }))}
        placeholder={txt('matTranReliefSupportReport.filterDanhMuc')}
        className="w-[11rem] shrink-0"
      />
    </>
  );

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
    <div className="flex flex-col h-page relative min-h-0" aria-label={txt('matTranReliefSupportReport.title')}>
      <DashboardToolbar
        className="shrink-0 mb-3"
        onBack={() => navigate('/mat-tran-to-quoc')}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangePicker}</div>
        }
        filters={filterPanelDesktop}
        filterGroups={filterGroups}
        actions={<div className="hidden sm:flex shrink-0">{renderExportToolbarButton()}</div>}
        mobileActions={renderExportToolbarButton()}
        activeFilterCount={activeFilterCount}
        onClearFilters={activeFilterCount ? clearFilters : undefined}
      />

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card shadow-sm p-3 sm:p-4 space-y-4">
        {isError ? (
          <ErrorState
            message={error instanceof Error ? error.message : txt('common.error')}
            onRetry={() => void refetch()}
          />
        ) : isReportLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{txt('matTranReliefSupportReport.loading')}</p>
        ) : stats.filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">{txt('matTranReliefSupportReport.noData')}</p>
            <p className="text-xs text-muted-foreground">{txt('matTranReliefSupportReport.noDataHint')}</p>
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={4} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('matTranReliefSupportReport.chartTrend')} icon={FileText} spanTwo={false}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={stats.trendSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="nhap"
                        name={txt('matTranReliefSupportReport.chartTrendNhap')}
                        stroke="hsl(142 71% 45%)"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="xuat"
                        name={txt('matTranReliefSupportReport.chartTrendXuat')}
                        stroke="hsl(0 72% 51%)"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('matTranReliefSupportReport.chartByLoaiDonVi')} icon={HandHeart}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={loaiDonViBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={loaiDonViBar}
                        dataKey="count"
                        name={txt('matTranReliefSupportReport.tableTwoColValue')}
                        radius={[4, 4, 0, 0]}
                        getFill={() => CHART_FILL_FALLBACK}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsTableCard
                title={txt('matTranReliefSupportReport.chartTopDonVi')}
                rows={stats.topDonVi.map((r) => ({ label: r.label, value: formatCurrency(r.value), id: r.id }))}
                columnLabelKey="matTranReliefSupportReport.tableTwoColLabel"
                columnValueKey="matTranReliefSupportReport.tableTwoColValue"
                emptyKey="matTranReliefSupportReport.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('matTranReliefSupportReport.chartTopDot')}
                rows={stats.topDot.map((r) => ({ label: r.label, value: formatCurrency(r.value), id: r.id }))}
                columnLabelKey="matTranReliefSupportReport.tableTwoColLabel"
                columnValueKey="matTranReliefSupportReport.tableTwoColValue"
                emptyKey="matTranReliefSupportReport.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('matTranReliefSupportReport.chartTopHangNhap')}
                rows={stats.topHangNhap.map((r) => ({
                  label: r.label,
                  value: formatCurrency(r.value),
                  id: r.id,
                }))}
                columnLabelKey="matTranReliefSupportReport.tableTwoColLabel"
                columnValueKey="matTranReliefSupportReport.tableTwoColValue"
                emptyKey="matTranReliefSupportReport.noData"
                maxHeight="max-h-[220px]"
              />
            </div>

            <StatsTableCard
              title={txt('matTranReliefSupportReport.chartTopHangXuat')}
              rows={stats.topHangXuat.map((r) => ({ label: r.label, value: formatCurrency(r.value), id: r.id }))}
              columnLabelKey="matTranReliefSupportReport.tableTwoColLabel"
              columnValueKey="matTranReliefSupportReport.tableTwoColValue"
              emptyKey="matTranReliefSupportReport.noData"
              maxHeight="max-h-[220px]"
            />

            <StatsCard title={txt('matTranReliefSupportReport.tableLookupTitle')} icon={Layers}>
              <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[960px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['ngay_phieu', txt('matTranReliefSupportReport.tableColNgay'), true],
                          ['so_phieu', txt('matTranReliefSupportReport.tableColSoPhieu'), true],
                          ['loai_phieu', txt('matTranReliefSupportReport.tableColLoai'), true],
                          ['kho_label', txt('matTranReliefSupportReport.tableColKho'), true],
                          ['nguon_dich_label', txt('matTranReliefSupportReport.tableColNguonDich'), true],
                          ['ten_hang_hoa', txt('matTranReliefSupportReport.tableColHang'), true],
                          ['so_luong', txt('matTranReliefSupportReport.tableColSl'), true],
                          ['don_vi_tinh', txt('matTranReliefSupportReport.tableColDvt'), false],
                          ['thanh_tien', txt('matTranReliefSupportReport.tableColTien'), true],
                        ] as const
                      ).map(([key, label, sortable]) => (
                        <th key={key} className="py-2 pr-3 font-medium whitespace-nowrap">
                          {sortable ? (
                            <button
                              type="button"
                              onClick={() => toggleSort(key as ReliefSupportLookupSortKey)}
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
                          ) : (
                            <span>{label}</span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLookup.map((row) => (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b border-border/60',
                          canOpenPhieuDetail && 'hover:bg-muted/40 cursor-pointer',
                        )}
                        onClick={() => handleViewPhieu(row.phieu_id)}
                      >
                        <td className="py-2 pr-3 whitespace-nowrap">{row.ngay_phieu}</td>
                        <td className="py-2 pr-3 whitespace-nowrap font-medium">{row.so_phieu}</td>
                        <td className="py-2 pr-3 whitespace-nowrap">{row.loai_phieu_label}</td>
                        <td className="py-2 pr-3 max-w-[180px] truncate">{row.kho_label}</td>
                        <td className="py-2 pr-3 max-w-[180px] truncate">{row.nguon_dich_label}</td>
                        <td className="py-2 pr-3 max-w-[160px] truncate">{row.ten_hang_hoa ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums">{row.so_luong}</td>
                        <td className="py-2 pr-3">{row.don_vi_tinh}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">
                          {formatCurrency(row.thanh_tien)}
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
        {viewingPhieu && canOpenPhieuDetail ? (
          <Suspense fallback={<DrawerLazyFallback />}>
            <KhoNhapXuatKhoDetailDrawer
              data={viewingPhieu}
              onClose={() => setViewingPhieuId(null)}
              onEdit={() => navigate('/mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho')}
              onDelete={() => setViewingPhieuId(null)}
            />
          </Suspense>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default KhoBaoCaoHoTroPage;
