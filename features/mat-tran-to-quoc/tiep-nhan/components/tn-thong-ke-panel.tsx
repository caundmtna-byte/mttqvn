import React, { useCallback, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  Activity,
  Banknote,
  Building2,
  CreditCard,
  Download,
  HandCoins,
  HandHeart,
  Landmark,
  MapPin,
  Package,
  Receipt,
  TrendingUp,
  Trophy,
  Wallet,
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
import DateRangePicker, { type DateRangeValue } from '@/components/ui/DateRangePicker';
import {
  buildStandardDateRangePresets,
  isStandardDateRangeNonDefault,
  resolveStandardDateRange,
} from '@/lib/date-range-presets';
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
import { useKhoDotCuuTroList } from '../../dot-cuu-tro/hooks/use-kho-dot-cuu-tro';
import { useKhoDonViCuuTroList } from '../../don-vi-cuu-tro/hooks/use-kho-don-vi-cuu-tro';
import { useTiepNhanThongKe } from '../hooks/use-tiep-nhan';
import { TN_HINH_THUC_VALUES, TN_TRANG_THAI_VALUES } from '../core/constants';
import { tnHinhThucBadge, tnTrangThaiBadge } from '../core/display-badges';
import {
  TN_KHONG_CO_TIEN,
  TN_THONG_KE_INITIAL_DIMS,
  aggregateTnByChuongTrinh,
  aggregateTnByDonVi,
  aggregateTnByNhaTaiTro,
  buildTnBarData,
  buildTnTrendSeries,
  computeTnKpis,
  filterTnForThongKe,
  tnDonViKey,
  type TnThongKeDims,
} from '../utils/aggregate-tn-stats';
import { exportTnThongKeToExcel } from '../utils/export-tn-thong-ke';

const T = (k: string, o?: Record<string, unknown>) => txt(`matTranTiepNhan.thongKe.${k}`, o);
const S = (k: string) => txt(`matTranTiepNhan.store.${k}`);

/** Mặc định «Tất cả» — không lọc thời gian cho tới khi người dùng chọn. */
const INITIAL_DATE_RANGE: DateRangeValue = { preset: 'all', customStart: '', customEnd: '' };

/** Số nhà tài trợ hiện trong bảng "Top". */
const TOP_LIMIT = 10;

/** Triệu đồng — trục tiền trên biểu đồ, để nhãn không tràn. */
function toTrieu(value: number): number {
  return Math.round(value / 1_000_000);
}

const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));

interface Props {
  onPageBack: () => void;
  /** Quyền xuất — trang cha đã tra theo resource của module. */
  canExport: boolean;
  /**
   * Chỉ bật khi tab Thống kê đang mở. Nguồn này kéo TOÀN BỘ khoản trong phạm vi
   * (khác RPC phân trang của tab Danh sách), bật sẵn là tốn egress vô ích.
   */
  queryEnabled: boolean;
}

const TnThongKePanel: React.FC<Props> = ({ onPageBack, canExport, queryEnabled }) => {
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  // Phạm vi xem đã lọc tại máy chủ (RPC `get_tn_tiep_nhan_page`) — không lọc lại ở client.
  const { data: allRows = [], isLoading, isError, refetch } = useTiepNhanThongKe({ enabled: queryEnabled });

  // Danh mục cho chip lọc — cùng nguồn với thanh công cụ tab Danh sách.
  const { data: chuongTrinh = [] } = useKhoDotCuuTroList();
  const { data: nhaTaiTro = [] } = useKhoDonViCuuTroList();

  const [dateRange, setDateRange] = useState<DateRangeValue>(INITIAL_DATE_RANGE);
  const datePresets = useMemo(() => buildStandardDateRangePresets(), []);
  const range = useMemo(
    () => resolveStandardDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const [dims, setDims] = useState<TnThongKeDims>(TN_THONG_KE_INITIAL_DIMS);
  const activeFilterCount = useMemo(
    () => countActiveStatsFilters(dims, isStandardDateRangeNonDefault(dateRange, 'all')),
    [dims, dateRange],
  );
  const clearFilters = useCallback(() => {
    setDims(TN_THONG_KE_INITIAL_DIMS);
    setDateRange(INITIAL_DATE_RANGE);
  }, []);
  const setDim = useCallback(
    (key: keyof TnThongKeDims, vals: string[]) => setDims((cur) => ({ ...cur, [key]: vals })),
    [],
  );

  const rows = useMemo(() => filterTnForThongKe(allRows, dims, range), [allRows, dims, range]);
  const kpis = useMemo(() => computeTnKpis(rows), [rows]);
  const trend = useMemo(() => buildTnTrendSeries(rows, range), [rows, range]);
  const chuongTrinhRows = useMemo(() => aggregateTnByChuongTrinh(rows), [rows]);
  const nhaTaiTroRows = useMemo(() => aggregateTnByNhaTaiTro(rows), [rows]);
  const donViRows = useMemo(() => aggregateTnByDonVi(rows), [rows]);

  const khongCoTienLabel = T('khongCoTien');
  const hinhThucRows = useMemo(
    () =>
      buildTnBarData(rows, 'hinh_thuc', TN_HINH_THUC_VALUES, khongCoTienLabel).map((r) => ({
        ...r,
        giaTri: toTrieu(r.tongGiaTri),
      })),
    [rows, khongCoTienLabel],
  );
  const trangThaiRows = useMemo(() => buildTnBarData(rows, 'trang_thai', TN_TRANG_THAI_VALUES), [rows]);
  const trendChartData = useMemo(
    () => trend.map((p) => ({ label: p.label, soKhoan: p.soKhoan, giaTri: toTrieu(p.tongGiaTri) })),
    [trend],
  );

  const kpiItems: StatsKpiCardItem[] = useMemo(
    () => [
      { id: 'tongGiaTri', label: T('kpi.tongGiaTri'), value: formatCurrency(kpis.tongGiaTri), icon: HandCoins, color: 'text-primary', bg: 'bg-primary/10' },
      { id: 'tongTien', label: T('kpi.tongTien'), value: formatCurrency(kpis.tongTien), icon: Wallet, color: 'text-amber-600', bg: 'bg-amber-500/10' },
      { id: 'chuyenKhoan', label: T('kpi.chuyenKhoan'), value: formatCurrency(kpis.chuyenKhoan), icon: Landmark, color: 'text-sky-600', bg: 'bg-sky-500/10' },
      { id: 'tienMat', label: T('kpi.tienMat'), value: formatCurrency(kpis.tienMat), icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
      { id: 'hienVatGiayTo', label: T('kpi.hienVatGiayTo'), value: formatCurrency(kpis.hienVatGiayTo), icon: Package, color: 'text-violet-600', bg: 'bg-violet-500/10' },
      {
        id: 'soKhoan',
        label: T('kpi.soKhoan'),
        value: kpis.soKhoan,
        pct: `${kpis.soNhaTaiTro} ${T('kpi.soNhaTaiTro').toLowerCase()}`,
        icon: Receipt,
        color: 'text-slate-600',
        bg: 'bg-slate-500/10',
      },
    ],
    [kpis],
  );

  const donViOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of allRows) map.set(tnDonViKey(r), r.ten_don_vi_tiep_nhan);
    return [...map.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [allRows]);

  const filterGroups = useMemo(
    () => [
      { key: 'trang_thai' as const, label: S('trangThaiCol'), icon: Activity, options: toOptions(TN_TRANG_THAI_VALUES) },
      {
        key: 'hinh_thuc' as const,
        label: S('hinhThucCol'),
        icon: CreditCard,
        options: [...toOptions(TN_HINH_THUC_VALUES), { value: TN_KHONG_CO_TIEN, label: khongCoTienLabel }],
      },
      {
        key: 'chuong_trinh' as const,
        label: S('chuongTrinhCol'),
        icon: HandHeart,
        options: chuongTrinh.map((c) => ({ value: c.id, label: c.ten })),
      },
      {
        key: 'nha_tai_tro' as const,
        label: S('nhaTaiTroCol'),
        icon: Building2,
        options: [...nhaTaiTro].sort((a, b) => a.ten.localeCompare(b.ten, 'vi')).map((d) => ({ value: d.id, label: d.ten })),
      },
      { key: 'don_vi_tiep_nhan' as const, label: S('donViTiepNhanCol'), icon: MapPin, options: donViOptions },
    ].map((g) => ({ ...g, value: dims[g.key], onChange: (vals: string[]) => setDim(g.key, vals) })),
    [chuongTrinh, nhaTaiTro, donViOptions, khongCoTienLabel, dims, setDim],
  );

  const dateRangePicker = (
    <DateRangePicker
      presets={datePresets}
      value={dateRange}
      onChange={setDateRange}
      placeholder={T('filter.thoiGianLabel')}
      customPresetId="custom"
      className="shrink-0"
    />
  );

  const filtersSlot = (
    <>
      {dateRangePicker}
      <div className="hidden h-6 w-px shrink-0 self-center bg-border sm:block" aria-hidden />
      {filterGroups.map((g) => (
        <FilterChipMultiSelect
          key={g.key}
          options={g.options}
          value={g.value}
          onChange={g.onChange}
          placeholder={g.label}
          icon={g.icon}
          className="shrink-0"
        />
      ))}
    </>
  );

  const handleExport = useCallback(() => {
    if (rows.length === 0) {
      toast.warning(T('noExportData'));
      return;
    }
    void exportTnThongKeToExcel({
      kyBaoCao: range.allTime ? '' : `${range.start} → ${range.end}`,
      kpis,
      chuongTrinhRows,
      nhaTaiTroRows,
      donViRows,
      chiTietRows: rows,
    });
  }, [rows, range, kpis, chuongTrinhRows, nhaTaiTroRows, donViRows]);

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

  const nhomTableRows = (list: typeof chuongTrinhRows) =>
    list.map((r) => ({
      id: r.id,
      label: `${r.label} · ${r.soKhoan} ${T('table.khoan')}`,
      value: formatCurrency(r.tongGiaTri),
    }));

  const showSkeleton = isLoading || matrixLoading;

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <DashboardToolbar
        filters={filtersSlot}
        actions={actions}
        filterGroups={filterGroups}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        onBack={onPageBack}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangePicker}</div>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {isError ? (
          <ErrorState
            className="w-full max-w-md mx-auto border-destructive/20"
            message={T('loadErrorHint')}
            onRetry={() => void refetch()}
            primaryButtons
          />
        ) : showSkeleton ? (
          <ReportSkeleton />
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={3} />

            <StatsCard title={T('chart.xuHuongTitle')} icon={TrendingUp} spanTwo>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="giaTri"
                      name={T('chart.giaTriTrieu')}
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="soKhoan"
                      name={T('chart.soKhoan')}
                      stroke="hsl(var(--chart-2, 38 92% 50%))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </StatsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatsCard title={T('chart.hinhThucTitle')} icon={CreditCard}>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hinhThucRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={hinhThucRows}
                        dataKey="giaTri"
                        name={T('chart.giaTriTrieu')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) => chartFillForCategoricalBar(row, i, { badgeConfig: tnHinhThucBadge })}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={T('chart.trangThaiTitle')} icon={Activity}>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trangThaiRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <ColoredBar
                        data={trangThaiRows}
                        dataKey="soKhoan"
                        name={T('chart.soKhoan')}
                        radius={[4, 4, 0, 0]}
                        getFill={(row, i) => chartFillForCategoricalBar(row, i, { badgeConfig: tnTrangThaiBadge })}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatsTableCard
                title={T('table.chuongTrinhTitle')}
                icon={HandHeart}
                rows={nhomTableRows(chuongTrinhRows)}
                columnLabelKey="matTranTiepNhan.thongKe.table.colChuongTrinh"
                columnValueKey="matTranTiepNhan.thongKe.table.colGiaTri"
                emptyKey="matTranTiepNhan.thongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
              <StatsTableCard
                title={T('table.nhaTaiTroTitle', { n: TOP_LIMIT })}
                icon={Trophy}
                rows={nhomTableRows(nhaTaiTroRows.slice(0, TOP_LIMIT))}
                columnLabelKey="matTranTiepNhan.thongKe.table.colNhaTaiTro"
                columnValueKey="matTranTiepNhan.thongKe.table.colGiaTri"
                emptyKey="matTranTiepNhan.thongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
              <StatsTableCard
                title={T('table.donViTitle')}
                icon={MapPin}
                rows={nhomTableRows(donViRows)}
                columnLabelKey="matTranTiepNhan.thongKe.table.colDonVi"
                columnValueKey="matTranTiepNhan.thongKe.table.colGiaTri"
                emptyKey="matTranTiepNhan.thongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TnThongKePanel;
