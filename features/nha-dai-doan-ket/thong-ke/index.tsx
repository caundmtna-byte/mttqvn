import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Legend,
} from 'recharts';
import {
  Home,
  Hammer,
  Coins,
  CalendarRange,
  CheckCircle2,
  Activity,
  Percent,
  Wallet,
  ListChecks,
  MapPin,
  Users,
  Download,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { formatCurrency } from '@/lib/utils';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import ChartTooltip from '@/components/ui/ChartTooltip';
import ErrorState from '@/components/shared/ErrorState';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import {
  ReportSkeleton,
  StatsKpiGrid,
  StatsCard,
  StatsTableCard,
  ColoredBar,
  countActiveStatsFilters,
  type StatsKpiCardItem,
} from '@/components/shared/stats';
import { chartFillForCategoricalBar } from '@/lib/constants/chart-colors';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import { useNhaDaiDoanKetList } from '../danh-sach/hooks/use-nha-dai-doan-ket';
import { canViewNddkRow, useNddkViewer } from '../danh-sach/hooks/use-nddk-viewer';
import {
  NDDK_DOI_TUONG_VALUES,
  NDDK_LOAI_HINH_VALUES,
  NDDK_NGUON_HO_TRO_VALUES,
  NDDK_NGUON_VALUES,
  NDDK_TRANG_THAI_VALUES,
} from '../danh-sach/core/constants';
import {
  nddkDoiTuongBadge,
  nddkLoaiHinhBadge,
  nddkNguonBadge,
  nddkTrangThaiBadge,
} from '../danh-sach/core/display-badges';
import { useNddkXaPhuongOptions } from '../danh-sach/hooks/use-nddk-xa-phuong-options';
import { buildNddkNamOptions } from '../danh-sach/utils/nam-options';
import {
  NDDK_KHONG_XAC_DINH,
  NDDK_THONG_KE_INITIAL_DIMS,
  aggregateNddkByXaPhuong,
  buildNddkBarData,
  buildNddkNamSeries,
  computeNddkKpis,
  filterRowsForNddkThongKe,
  topNddkXaPhuongByTien,
  type NddkThongKeDimensionFilters,
} from './utils/aggregate-nddk-stats';
import { exportNddkThongKeReportToExcel } from './utils/export-nddk-report';

/** Số xã/phường hiện trong bảng "Top theo số tiền". */
const TOP_XA_PHUONG_LIMIT = 10;

/** Triệu đồng — trục tiền trên biểu đồ, để nhãn không tràn. */
function toTrieu(value: number): number {
  return Math.round(value / 1_000_000);
}

const NhaDaiDoanKetThongKePage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'nhaDaiDoanKetThongKe');
  const { canExport } = useResourcePermissions('nhaDaiDoanKetThongKe');
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  const queryEnabled = Boolean(user && (user.role === 'admin' || (matrixActive && canView)));

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('nhaDaiDoanKetThongKe.noViewPermission'));
    navigate('/an-sinh-xa-hoi', { replace: true });
  }, [user, canView, navigate]);

  const {
    data: allRows = [],
    isLoading,
    isError,
    refetch,
  } = useNhaDaiDoanKetList({ enabled: queryEnabled });

  const viewer = useNddkViewer('nhaDaiDoanKetThongKe');

  /**
   * Áp phạm vi xem TRƯỚC mọi phép tổng hợp. Trang thống kê mà bỏ bước này thì
   * các con số tổng đã là dữ liệu toàn hệ thống, dù bảng chi tiết có lọc.
   */
  const viewableRows = useMemo(
    () => allRows.filter((r) => canViewNddkRow(viewer, r)),
    [allRows, viewer],
  );

  /**
   * Trang này KHÔNG có bộ chọn khoảng ngày: trục thời gian của nghiệp vụ là cột
   * `nam` (số nguyên), lọc theo ngày sẽ không khớp với cách cơ quan đọc báo cáo.
   * Vì vậy chỉ có chip dimension, và `countActiveStatsFilters` được gọi trực
   * tiếp với `isNonDefaultDateRange = false`.
   */
  const [dims, setDims] = useState<NddkThongKeDimensionFilters>(NDDK_THONG_KE_INITIAL_DIMS);
  const activeFilterCount = useMemo(() => countActiveStatsFilters(dims, false), [dims]);
  const clearFilters = useCallback(() => setDims(NDDK_THONG_KE_INITIAL_DIMS), []);
  const setDim = useCallback(
    (key: keyof NddkThongKeDimensionFilters, vals: string[]) =>
      setDims((cur) => ({ ...cur, [key]: vals })),
    [],
  );

  const rows = useMemo(() => filterRowsForNddkThongKe(viewableRows, dims), [viewableRows, dims]);

  const kpis = useMemo(() => computeNddkKpis(rows), [rows]);
  const namSeries = useMemo(() => buildNddkNamSeries(rows), [rows]);
  const trangThaiRows = useMemo(
    () => buildNddkBarData(rows, 'trang_thai', NDDK_TRANG_THAI_VALUES),
    [rows],
  );
  const nguonRows = useMemo(() => buildNddkBarData(rows, 'nguon', NDDK_NGUON_VALUES), [rows]);
  const nguonHoTroRows = useMemo(
    () => buildNddkBarData(rows, 'nguon_ho_tro', NDDK_NGUON_HO_TRO_VALUES),
    [rows],
  );
  const loaiHinhRows = useMemo(
    () => buildNddkBarData(rows, 'loai_hinh_ho_tro', NDDK_LOAI_HINH_VALUES),
    [rows],
  );
  const doiTuongRows = useMemo(
    () => buildNddkBarData(rows, 'doi_tuong', NDDK_DOI_TUONG_VALUES),
    [rows],
  );

  const khongGanLabel = txt('nhaDaiDoanKetThongKe.table.khongXacDinh');
  const xaPhuongRows = useMemo(
    () => aggregateNddkByXaPhuong(rows, khongGanLabel),
    [rows, khongGanLabel],
  );
  const topXaPhuongRows = useMemo(
    () => topNddkXaPhuongByTien(xaPhuongRows, TOP_XA_PHUONG_LIMIT),
    [xaPhuongRows],
  );

  const namChartData = useMemo(
    () => namSeries.map((p) => ({ nam: String(p.nam), soNha: p.soNha, soTien: toTrieu(p.soTien) })),
    [namSeries],
  );

  const kpiItems: StatsKpiCardItem[] = useMemo(
    () => [
      {
        id: 'tongSoNha',
        label: txt('nhaDaiDoanKetThongKe.kpi.tongSoNha'),
        value: kpis.tongSoNha,
        icon: Home,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
      {
        id: 'tongSoTien',
        label: txt('nhaDaiDoanKetThongKe.kpi.tongSoTien'),
        value: formatCurrency(kpis.tongSoTien),
        icon: Coins,
        color: 'text-amber-600',
        bg: 'bg-amber-500/10',
      },
      {
        id: 'daBanGiao',
        label: txt('nhaDaiDoanKetThongKe.kpi.daBanGiao'),
        value: kpis.daBanGiao,
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
      },
      {
        id: 'tyLeBanGiao',
        label: txt('nhaDaiDoanKetThongKe.kpi.tyLeBanGiao'),
        value: `${kpis.tyLeBanGiao}%`,
        icon: Percent,
        color: 'text-sky-600',
        bg: 'bg-sky-500/10',
      },
      {
        id: 'dangThucHien',
        label: txt('nhaDaiDoanKetThongKe.kpi.dangThucHien'),
        value: kpis.dangThucHien,
        icon: Activity,
        color: 'text-sky-600',
        bg: 'bg-sky-500/10',
      },
      {
        id: 'binhQuan',
        label: txt('nhaDaiDoanKetThongKe.kpi.binhQuan'),
        value: formatCurrency(kpis.binhQuanMoiNha),
        icon: Wallet,
        color: 'text-violet-600',
        bg: 'bg-violet-500/10',
      },
    ],
    [kpis],
  );

  const namOptions = useMemo(() => buildNddkNamOptions(), []);
  const xaPhuongOptions = useNddkXaPhuongOptions();
  const xaPhuongFilterOptions = useMemo(
    () => [
      { value: NDDK_KHONG_XAC_DINH, label: khongGanLabel },
      ...xaPhuongOptions.map((o) => ({ value: o.value, label: o.label })),
    ],
    [xaPhuongOptions, khongGanLabel],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'nam',
        label: txt('nhaDaiDoanKetThongKe.filter.namLabel'),
        icon: CalendarRange,
        options: namOptions,
        value: dims.nam,
        onChange: (vals: string[]) => setDim('nam', vals),
      },
      {
        key: 'trang_thai',
        label: txt('nhaDaiDoanKetThongKe.filter.trangThaiLabel'),
        icon: ListChecks,
        options: NDDK_TRANG_THAI_VALUES.map((v) => ({ value: v, label: v })),
        value: dims.trang_thai,
        onChange: (vals: string[]) => setDim('trang_thai', vals),
      },
      {
        key: 'loai_hinh',
        label: txt('nhaDaiDoanKetThongKe.filter.loaiHinhLabel'),
        icon: Hammer,
        options: NDDK_LOAI_HINH_VALUES.map((v) => ({ value: v, label: v })),
        value: dims.loai_hinh,
        onChange: (vals: string[]) => setDim('loai_hinh', vals),
      },
      {
        key: 'nguon',
        label: txt('nhaDaiDoanKetThongKe.filter.nguonLabel'),
        icon: Coins,
        options: NDDK_NGUON_VALUES.map((v) => ({ value: v, label: v })),
        value: dims.nguon,
        onChange: (vals: string[]) => setDim('nguon', vals),
      },
      {
        key: 'nguon_ho_tro',
        label: txt('nhaDaiDoanKetThongKe.filter.nguonHoTroLabel'),
        icon: Coins,
        options: NDDK_NGUON_HO_TRO_VALUES.map((v) => ({ value: v, label: v })),
        value: dims.nguon_ho_tro,
        onChange: (vals: string[]) => setDim('nguon_ho_tro', vals),
      },
      {
        key: 'doi_tuong',
        label: txt('nhaDaiDoanKetThongKe.filter.doiTuongLabel'),
        icon: Users,
        options: NDDK_DOI_TUONG_VALUES.map((v) => ({ value: v, label: v })),
        value: dims.doi_tuong,
        onChange: (vals: string[]) => setDim('doi_tuong', vals),
      },
      {
        key: 'xa_phuong',
        label: txt('nhaDaiDoanKet.store.xaPhuongCol'),
        icon: MapPin,
        options: xaPhuongFilterOptions,
        value: dims.xa_phuong,
        onChange: (vals: string[]) => setDim('xa_phuong', vals),
      },
    ],
    [namOptions, xaPhuongFilterOptions, dims, setDim],
  );

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <FilterChipMultiSelect
        options={namOptions}
        value={dims.nam}
        onChange={(vals) => setDim('nam', vals)}
        placeholder={txt('nhaDaiDoanKetThongKe.filter.namLabel')}
        icon={CalendarRange}
        className="shrink-0"
      />
      <FilterChipMultiSelect
        options={NDDK_TRANG_THAI_VALUES.map((v) => ({ value: v, label: v }))}
        value={dims.trang_thai}
        onChange={(vals) => setDim('trang_thai', vals)}
        placeholder={txt('nhaDaiDoanKetThongKe.filter.trangThaiLabel')}
        icon={ListChecks}
        className="shrink-0"
      />
      <FilterChipMultiSelect
        options={NDDK_LOAI_HINH_VALUES.map((v) => ({ value: v, label: v }))}
        value={dims.loai_hinh}
        onChange={(vals) => setDim('loai_hinh', vals)}
        placeholder={txt('nhaDaiDoanKetThongKe.filter.loaiHinhLabel')}
        icon={Hammer}
        className="shrink-0"
      />
      <FilterChipMultiSelect
        options={NDDK_NGUON_VALUES.map((v) => ({ value: v, label: v }))}
        value={dims.nguon}
        onChange={(vals) => setDim('nguon', vals)}
        placeholder={txt('nhaDaiDoanKetThongKe.filter.nguonLabel')}
        icon={Coins}
        className="shrink-0"
      />
    </div>
  );

  const handleExport = useCallback(() => {
    if (rows.length === 0) {
      toast.warning(txt('nhaDaiDoanKetThongKe.noExportData'));
      return;
    }
    void exportNddkThongKeReportToExcel({
      kpis,
      namRows: namSeries,
      trangThaiRows,
      nguonRows,
      nguonHoTroRows,
      loaiHinhRows,
      doiTuongRows,
      xaPhuongRows,
      chiTietRows: rows,
    });
  }, [
    rows,
    kpis,
    namSeries,
    trangThaiRows,
    nguonRows,
    nguonHoTroRows,
    loaiHinhRows,
    doiTuongRows,
    xaPhuongRows,
  ]);

  const actions = canExport ? (
    <Tooltip content={txt('common.export')} placement="bottom">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        className="inline-flex h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
      >
        <Download className="w-4 h-4" />
      </Button>
    </Tooltip>
  ) : undefined;

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

  const showSkeleton = isLoading || matrixLoading;

  return (
    <div className="flex flex-col h-page">
      <DashboardToolbar
        filters={filtersSlot}
        actions={actions}
        filterGroups={filterGroups}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        onBack={() => navigate('/an-sinh-xa-hoi')}
        desktopToolbarWrap
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {isError ? (
          <ErrorState
            className="w-full max-w-md mx-auto border-destructive/20"
            message={txt('nhaDaiDoanKetThongKe.listLoadErrorHint')}
            onRetry={() => void refetch()}
            primaryButtons
          />
        ) : showSkeleton ? (
          <ReportSkeleton />
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={3} />

            <StatsCard
              title={txt('nhaDaiDoanKetThongKe.chart.xuHuongTitle')}
              icon={TrendingUp}
              spanTwo
            >
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={namChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="nam" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      allowDecimals={false}
                    />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="soNha"
                      name={txt('nhaDaiDoanKetThongKe.chart.soNha')}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="soTien"
                      name={`${txt('nhaDaiDoanKetThongKe.chart.soTien')} (triệu đồng)`}
                      stroke="hsl(var(--chart-2, 38 92% 50%))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </StatsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatsCard
                title={txt('nhaDaiDoanKetThongKe.chart.trangThaiTitle')}
                icon={ListChecks}
              >
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trangThaiRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={trangThaiRows}
                        dataKey="soNha"
                        name={txt('nhaDaiDoanKetThongKe.chart.soNha')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, { badgeConfig: nddkTrangThaiBadge })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('nhaDaiDoanKetThongKe.chart.loaiHinhTitle')} icon={Hammer}>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={loaiHinhRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={loaiHinhRows}
                        dataKey="soNha"
                        name={txt('nhaDaiDoanKetThongKe.chart.soNha')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, { badgeConfig: nddkLoaiHinhBadge })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('nhaDaiDoanKetThongKe.chart.nguonTitle')} icon={Coins}>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={nguonRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={nguonRows}
                        dataKey="soNha"
                        name={txt('nhaDaiDoanKetThongKe.chart.soNha')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, { badgeConfig: nddkNguonBadge })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('nhaDaiDoanKetThongKe.chart.doiTuongTitle')} icon={Users}>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={doiTuongRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={doiTuongRows}
                        dataKey="soNha"
                        name={txt('nhaDaiDoanKetThongKe.chart.soNha')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) =>
                          chartFillForCategoricalBar(row, i, { badgeConfig: nddkDoiTuongBadge })
                        }
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatsTableCard
                title={txt('nhaDaiDoanKetThongKe.table.theoXaPhuongTitle')}
                icon={MapPin}
                rows={xaPhuongRows.map((r) => ({
                  id: r.id,
                  label: r.label,
                  value: `${r.soNha} · ${r.daBanGiao} ${txt('nhaDaiDoanKetThongKe.table.colDaBanGiao').toLowerCase()}`,
                }))}
                columnLabelKey="nhaDaiDoanKetThongKe.table.colXaPhuong"
                columnValueKey="nhaDaiDoanKetThongKe.table.colSoNha"
                emptyKey="nhaDaiDoanKetThongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
              <StatsTableCard
                title={txt('nhaDaiDoanKetThongKe.table.topXaPhuongTitle')}
                icon={Trophy}
                rows={topXaPhuongRows.map((r) => ({
                  id: r.id,
                  label: r.label,
                  value: formatCurrency(r.soTien),
                }))}
                columnLabelKey="nhaDaiDoanKetThongKe.table.colXaPhuong"
                columnValueKey="nhaDaiDoanKetThongKe.table.colSoTien"
                emptyKey="nhaDaiDoanKetThongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default NhaDaiDoanKetThongKePage;
