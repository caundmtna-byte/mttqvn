import React, { useCallback, useMemo, useState } from 'react';
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
  HandHeart,
  Coins,
  CalendarRange,
  CheckCircle2,
  Hourglass,
  Percent,
  Users,
  Layers,
  Gift,
  ListChecks,
  MapPin,
  Download,
  TrendingUp,
  Trophy,
  type LucideIcon,
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
import type { BadgeConfig } from '@/components/ui/EnumBadge';
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
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useViNguoiNgheoList } from '../hooks/use-vi-nguoi-ngheo';
import { canViewVnnRow, useVnnViewer } from '../hooks/use-vnn-viewer';
import {
  VNN_DOI_TUONG_VALUES,
  VNN_HINH_THUC_VALUES,
  VNN_LINH_VUC_VALUES,
  VNN_NGUON_HO_TRO_VALUES,
  VNN_NGUON_VALUES,
  VNN_TRANG_THAI_VALUES,
} from '../core/constants';
import {
  vnnDoiTuongBadge,
  vnnHinhThucBadge,
  vnnLinhVucBadge,
  vnnNguonBadge,
} from '../core/display-badges';
import { useNddkXaPhuongOptions } from '../../danh-sach/hooks/use-nddk-xa-phuong-options';
import { buildNddkNamOptions } from '../../danh-sach/utils/nam-options';
import {
  VNN_KHONG_XAC_DINH,
  VNN_THONG_KE_INITIAL_DIMS,
  aggregateVnnByXaPhuong,
  buildVnnBarData,
  buildVnnNamSeries,
  computeVnnKpis,
  filterRowsForVnnThongKe,
  topVnnDonViByTien,
  type VnnBarPoint,
  type VnnThongKeDimensionFilters,
} from '../utils/aggregate-vnn-stats';
import { exportVnnThongKeReportToExcel } from '../utils/export-vnn-report';

const TOP_DON_VI_LIMIT = 10;

/** Triệu đồng — trục tiền trên biểu đồ, để nhãn không tràn. */
function toTrieu(value: number): number {
  return Math.round(value / 1_000_000);
}

const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

interface Props {
  tabsSlot?: React.ReactNode;
  onPageBack: () => void;
  canExport: boolean;
  /**
   * Chỉ bật khi tab Thống kê đang mở: hàm này kéo TOÀN BỘ bảng, bật sẵn là tốn
   * egress vô ích.
   */
  queryEnabled: boolean;
}

const BarCard: React.FC<{
  title: string;
  icon: LucideIcon;
  rows: VnnBarPoint[];
  badgeConfig: BadgeConfig;
}> = ({ title, icon, rows, badgeConfig }) => (
  <StatsCard title={title} icon={icon}>
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
          <RechartsTooltip content={<ChartTooltip />} />
          <ColoredBar
            data={rows}
            dataKey="soKhoan"
            name={txt('viNguoiNgheoThongKe.chart.soKhoan')}
            radius={[4, 4, 0, 0]}
            getFill={(row, i) => chartFillForCategoricalBar(row, i, { badgeConfig })}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </StatsCard>
);

const VnnThongKePanel: React.FC<Props> = ({ tabsSlot, onPageBack, canExport, queryEnabled }) => {
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const { data: allRows = [], isLoading, isError, refetch } = useViNguoiNgheoList({
    enabled: queryEnabled,
  });

  const viewer = useVnnViewer();
  // Áp phạm vi xem TRƯỚC mọi phép tổng hợp — bỏ bước này thì con số tổng đã là
  // dữ liệu toàn hệ thống.
  const viewableRows = useMemo(
    () => allRows.filter((r) => canViewVnnRow(viewer, r)),
    [allRows, viewer],
  );

  // Không có bộ chọn khoảng ngày: trục thời gian của nghiệp vụ là cột `nam`.
  const [dims, setDims] = useState<VnnThongKeDimensionFilters>(VNN_THONG_KE_INITIAL_DIMS);
  const activeFilterCount = useMemo(() => countActiveStatsFilters(dims, false), [dims]);
  const clearFilters = useCallback(() => setDims(VNN_THONG_KE_INITIAL_DIMS), []);
  const setDim = useCallback(
    (key: keyof VnnThongKeDimensionFilters, vals: string[]) =>
      setDims((cur) => ({ ...cur, [key]: vals })),
    [],
  );

  const rows = useMemo(() => filterRowsForVnnThongKe(viewableRows, dims), [viewableRows, dims]);
  const kpis = useMemo(() => computeVnnKpis(rows), [rows]);
  const namSeries = useMemo(() => buildVnnNamSeries(rows), [rows]);
  const linhVucRows = useMemo(() => buildVnnBarData(rows, 'linh_vuc_ho_tro', VNN_LINH_VUC_VALUES), [rows]);
  const hinhThucRows = useMemo(() => buildVnnBarData(rows, 'hinh_thuc_ho_tro', VNN_HINH_THUC_VALUES), [rows]);
  const nguonRows = useMemo(() => buildVnnBarData(rows, 'nguon', VNN_NGUON_VALUES), [rows]);
  const nguonHoTroRows = useMemo(() => buildVnnBarData(rows, 'nguon_ho_tro', VNN_NGUON_HO_TRO_VALUES), [rows]);
  const doiTuongRows = useMemo(() => buildVnnBarData(rows, 'doi_tuong', VNN_DOI_TUONG_VALUES), [rows]);
  const trangThaiRows = useMemo(() => buildVnnBarData(rows, 'trang_thai', VNN_TRANG_THAI_VALUES), [rows]);

  const khongGanXa = txt('viNguoiNgheoThongKe.table.khongXacDinh');
  const khongGanDonVi = txt('viNguoiNgheoThongKe.table.khongDonVi');
  const xaPhuongRows = useMemo(() => aggregateVnnByXaPhuong(rows, khongGanXa), [rows, khongGanXa]);
  const topDonViRows = useMemo(
    () => topVnnDonViByTien(rows, khongGanDonVi, TOP_DON_VI_LIMIT),
    [rows, khongGanDonVi],
  );

  const namChartData = useMemo(
    () => namSeries.map((p) => ({ nam: String(p.nam), soKhoan: p.soKhoan, soTien: toTrieu(p.soTien) })),
    [namSeries],
  );

  const kpiItems: StatsKpiCardItem[] = useMemo(
    () => [
      { id: 'tongSoKhoan', label: txt('viNguoiNgheoThongKe.kpi.tongSoKhoan'), value: kpis.tongSoKhoan, icon: HandHeart, color: 'text-primary', bg: 'bg-primary/10' },
      { id: 'soNguoiNhan', label: txt('viNguoiNgheoThongKe.kpi.soNguoiNhan'), value: kpis.soNguoiNhan, icon: Users, color: 'text-violet-600', bg: 'bg-violet-500/10' },
      { id: 'tongSoTien', label: txt('viNguoiNgheoThongKe.kpi.tongSoTien'), value: formatCurrency(kpis.tongSoTien), icon: Coins, color: 'text-amber-600', bg: 'bg-amber-500/10' },
      { id: 'daNhan', label: txt('viNguoiNgheoThongKe.kpi.daNhan'), value: kpis.daNhan, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
      { id: 'dangKhaoSat', label: txt('viNguoiNgheoThongKe.kpi.dangKhaoSat'), value: kpis.dangKhaoSat, icon: Hourglass, color: 'text-slate-600', bg: 'bg-slate-500/10' },
      { id: 'tyLeDaNhan', label: txt('viNguoiNgheoThongKe.kpi.tyLeDaNhan'), value: `${kpis.tyLeDaNhan}%`, icon: Percent, color: 'text-sky-600', bg: 'bg-sky-500/10' },
    ],
    [kpis],
  );

  const namOptions = useMemo(() => buildNddkNamOptions(), []);
  const xaPhuongOptions = useNddkXaPhuongOptions();

  const specs = useMemo(
    (): { key: keyof VnnThongKeDimensionFilters; label: string; icon: LucideIcon; options: { value: string; label: string }[]; inline?: boolean }[] => [
      { key: 'nam', label: txt('viNguoiNgheo.store.namCol'), icon: CalendarRange, options: namOptions, inline: true },
      { key: 'trang_thai', label: txt('viNguoiNgheo.store.trangThaiCol'), icon: ListChecks, options: toOptions(VNN_TRANG_THAI_VALUES), inline: true },
      { key: 'linh_vuc', label: txt('viNguoiNgheo.store.linhVucCol'), icon: Layers, options: toOptions(VNN_LINH_VUC_VALUES), inline: true },
      { key: 'hinh_thuc', label: txt('viNguoiNgheo.store.hinhThucCol'), icon: Gift, options: toOptions(VNN_HINH_THUC_VALUES), inline: true },
      { key: 'nguon', label: txt('viNguoiNgheo.store.nguonCol'), icon: Coins, options: toOptions(VNN_NGUON_VALUES) },
      { key: 'nguon_ho_tro', label: txt('viNguoiNgheo.store.nguonHoTroCol'), icon: Coins, options: toOptions(VNN_NGUON_HO_TRO_VALUES) },
      { key: 'doi_tuong', label: txt('viNguoiNgheo.store.doiTuongCol'), icon: Users, options: toOptions(VNN_DOI_TUONG_VALUES) },
      {
        key: 'xa_phuong',
        label: txt('viNguoiNgheo.store.xaPhuongCol'),
        icon: MapPin,
        options: [
          { value: VNN_KHONG_XAC_DINH, label: khongGanXa },
          ...xaPhuongOptions.map((o) => ({ value: o.value, label: o.label })),
        ],
      },
    ],
    [namOptions, xaPhuongOptions, khongGanXa],
  );

  const filterGroups = useMemo(
    () =>
      specs.map((s) => ({
        key: s.key,
        label: s.label,
        icon: s.icon,
        options: s.options,
        value: dims[s.key],
        onChange: (vals: string[]) => setDim(s.key, vals),
      })),
    [specs, dims, setDim],
  );

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      {specs
        .filter((s) => s.inline)
        .map((s) => (
          <FilterChipMultiSelect
            key={s.key}
            options={s.options}
            value={dims[s.key]}
            onChange={(vals) => setDim(s.key, vals)}
            placeholder={s.label}
            icon={s.icon}
            className="shrink-0"
          />
        ))}
    </div>
  );

  const handleExport = useCallback(() => {
    if (rows.length === 0) {
      toast.warning(txt('viNguoiNgheoThongKe.noExportData'));
      return;
    }
    void exportVnnThongKeReportToExcel({
      kpis,
      namRows: namSeries,
      bars: [
        { sheet: 'Theo lĩnh vực', colLabel: txt('viNguoiNgheo.store.linhVucCol'), rows: linhVucRows },
        { sheet: 'Theo hình thức', colLabel: txt('viNguoiNgheo.store.hinhThucCol'), rows: hinhThucRows },
        { sheet: 'Theo trạng thái', colLabel: txt('viNguoiNgheo.store.trangThaiCol'), rows: trangThaiRows },
        { sheet: 'Theo nguồn', colLabel: txt('viNguoiNgheo.store.nguonCol'), rows: nguonRows },
        { sheet: 'Theo nguồn hỗ trợ', colLabel: txt('viNguoiNgheo.store.nguonHoTroCol'), rows: nguonHoTroRows },
        { sheet: 'Theo đối tượng', colLabel: txt('viNguoiNgheo.store.doiTuongCol'), rows: doiTuongRows },
      ],
      xaPhuongRows,
      // Sheet xuất lấy đủ mọi đơn vị, không cắt top như trên màn hình.
      donViRows: topVnnDonViByTien(rows, khongGanDonVi, Number.MAX_SAFE_INTEGER),
      chiTietRows: rows,
    });
  }, [rows, kpis, namSeries, linhVucRows, hinhThucRows, trangThaiRows, nguonRows, nguonHoTroRows, doiTuongRows, xaPhuongRows, khongGanDonVi]);

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

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <DashboardToolbar
        filters={filtersSlot}
        actions={actions}
        filterGroups={filterGroups}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        onBack={onPageBack}
        tabSlot={tabsSlot}
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {isError ? (
          <ErrorState
            className="w-full max-w-md mx-auto border-destructive/20"
            message={txt('viNguoiNgheoThongKe.listLoadErrorHint')}
            onRetry={() => void refetch()}
            primaryButtons
          />
        ) : isLoading || matrixLoading ? (
          <ReportSkeleton />
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={3} />

            <StatsCard title={txt('viNguoiNgheoThongKe.chart.xuHuongTitle')} icon={TrendingUp} spanTwo>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={namChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="nam" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="soKhoan"
                      name={txt('viNguoiNgheoThongKe.chart.soKhoan')}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="soTien"
                      name={`${txt('viNguoiNgheoThongKe.chart.soTien')} (triệu đồng)`}
                      stroke="hsl(var(--chart-2, 38 92% 50%))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </StatsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BarCard title={txt('viNguoiNgheoThongKe.chart.linhVucTitle')} icon={Layers} rows={linhVucRows} badgeConfig={vnnLinhVucBadge} />
              <BarCard title={txt('viNguoiNgheoThongKe.chart.hinhThucTitle')} icon={Gift} rows={hinhThucRows} badgeConfig={vnnHinhThucBadge} />
              <BarCard title={txt('viNguoiNgheoThongKe.chart.nguonTitle')} icon={Coins} rows={nguonRows} badgeConfig={vnnNguonBadge} />
              <BarCard title={txt('viNguoiNgheoThongKe.chart.doiTuongTitle')} icon={Users} rows={doiTuongRows} badgeConfig={vnnDoiTuongBadge} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatsTableCard
                title={txt('viNguoiNgheoThongKe.table.theoXaPhuongTitle')}
                icon={MapPin}
                rows={xaPhuongRows.map((r) => ({
                  id: r.id,
                  label: r.label,
                  value: `${r.soKhoan} · ${formatCurrency(r.soTien)}`,
                }))}
                columnLabelKey="viNguoiNgheoThongKe.table.colXaPhuong"
                columnValueKey="viNguoiNgheoThongKe.table.colSoKhoan"
                emptyKey="viNguoiNgheoThongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
              <StatsTableCard
                title={txt('viNguoiNgheoThongKe.table.topDonViTitle')}
                icon={Trophy}
                rows={topDonViRows.map((r) => ({
                  id: r.id,
                  label: r.label,
                  value: formatCurrency(r.soTien),
                }))}
                columnLabelKey="viNguoiNgheoThongKe.table.colDonVi"
                columnValueKey="viNguoiNgheoThongKe.table.colSoTien"
                emptyKey="viNguoiNgheoThongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VnnThongKePanel;
