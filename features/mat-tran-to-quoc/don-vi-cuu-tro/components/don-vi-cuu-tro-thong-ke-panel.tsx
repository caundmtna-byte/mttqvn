import React, { useCallback, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import {
  Building2,
  HandCoins,
  CheckCircle2,
  Banknote,
  Package,
  Layers,
  Repeat,
  Tags,
  MapPin,
  Trophy,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { formatCurrency, formatAxisTick } from '@/lib/utils';
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
  countActiveStatsFilters,
  type StatsKpiCardItem,
} from '@/components/shared/stats';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useKhoDonViCuuTroList, useKhoDonViCuuTroUngHoNhom } from '../hooks/use-kho-don-vi-cuu-tro';
import { buildNhomUngHoOptions, tongHopUngHoTheoDonVi } from '../utils/ung-ho-nhom';
import {
  khoDonViCuuTroLoaiComboboxOptions,
  khoDonViCuuTroLoaiLabel,
} from '../core/loai';
import {
  DON_VI_CUU_TRO_THONG_KE_INITIAL_DIMS,
  aggregateDonViCuuTroByGioiThieu,
  aggregateDonViCuuTroByLoai,
  computeDonViCuuTroKpis,
  filterDonViCuuTroForThongKe,
  mergeDonViCuuTroUngHo,
  topDonViCuuTroByTien,
  type DonViCuuTroThongKeDims,
} from '../utils/aggregate-don-vi-cuu-tro-stats';
import { exportDonViCuuTroThongKeToExcel } from '../utils/export-don-vi-cuu-tro-thong-ke';

const T = (k: string, o?: Record<string, unknown>) => txt(`matTranDonViCuuTro.thongKe.${k}`, o);

/** Số đơn vị hiện trong bảng "Top theo kết quả ủng hộ". */
const TOP_LIMIT = 10;

/** Mặc định «Tất cả» — không lọc thời gian cho tới khi người dùng chọn. */
const INITIAL_DATE_RANGE: DateRangeValue = { preset: 'all', customStart: '', customEnd: '' };

/** Triệu đồng — trục tiền trên biểu đồ, để nhãn không tràn. */
function toTrieu(value: number): number {
  return Math.round(value / 1_000_000);
}

interface Props {
  /** TabGroup của trang cha — đặt vào đầu thanh công cụ. */
  tabsSlot?: React.ReactNode;
  onPageBack: () => void;
  canExport: boolean;
  queryEnabled: boolean;
}

const DonViCuuTroThongKePanel: React.FC<Props> = ({ tabsSlot, onPageBack, canExport, queryEnabled }) => {
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);

  const [dateRange, setDateRange] = useState<DateRangeValue>(INITIAL_DATE_RANGE);
  const datePresets = useMemo(() => buildStandardDateRangePresets(), []);
  const range = useMemo(
    () => resolveStandardDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );
  // «Tất cả» trả start/end rỗng — service đổi thành NULL cho RPC.
  const tuNgay = range.allTime ? '' : range.start;
  const denNgay = range.allTime ? '' : range.end;

  const listQuery = useKhoDonViCuuTroList({ enabled: queryEnabled });
  const ungHoQuery = useKhoDonViCuuTroUngHoNhom(tuNgay, denNgay, { enabled: queryEnabled });
  const ungHoNhom = useMemo(() => ungHoQuery.data ?? [], [ungHoQuery.data]);
  const allRows = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  const [dims, setDims] = useState<DonViCuuTroThongKeDims>(DON_VI_CUU_TRO_THONG_KE_INITIAL_DIMS);
  const activeFilterCount = useMemo(
    () => countActiveStatsFilters(dims, isStandardDateRangeNonDefault(dateRange, 'all')),
    [dims, dateRange],
  );
  const clearFilters = useCallback(() => {
    setDims(DON_VI_CUU_TRO_THONG_KE_INITIAL_DIMS);
    setDateRange(INITIAL_DATE_RANGE);
  }, []);
  const setDim = useCallback(
    (key: keyof DonViCuuTroThongKeDims, vals: string[]) => setDims((cur) => ({ ...cur, [key]: vals })),
    [],
  );

  const rows = useMemo(
    () =>
      mergeDonViCuuTroUngHo(
        filterDonViCuuTroForThongKe(allRows, dims),
        tongHopUngHoTheoDonVi(ungHoNhom, dims.nhom),
      ),
    [allRows, dims, ungHoNhom],
  );
  const kpis = useMemo(() => computeDonViCuuTroKpis(rows), [rows]);
  const loaiRows = useMemo(() => aggregateDonViCuuTroByLoai(rows), [rows]);
  const gioiThieuRows = useMemo(() => aggregateDonViCuuTroByGioiThieu(rows), [rows]);
  const topRows = useMemo(() => topDonViCuuTroByTien(rows, TOP_LIMIT), [rows]);

  const loaiChartData = useMemo(
    () =>
      loaiRows.map((r) => ({
        key: r.key,
        label: khoDonViCuuTroLoaiLabel(r.key),
        tienMat: toTrieu(r.tienMat),
        hienVat: toTrieu(r.hienVat),
      })),
    [loaiRows],
  );

  const kpiItems: StatsKpiCardItem[] = useMemo(
    () => [
      { id: 'tongDonVi', label: T('kpi.tongDonVi'), value: kpis.tongDonVi, icon: Building2, color: 'text-primary', bg: 'bg-primary/10' },
      { id: 'tongUngHo', label: T('kpi.tongUngHo'), value: formatCurrency(kpis.tongUngHo), icon: HandCoins, color: 'text-amber-600', bg: 'bg-amber-500/10' },
      { id: 'tienMat', label: T('kpi.tienMat'), value: formatCurrency(kpis.tongTienMat), icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
      { id: 'hienVat', label: T('kpi.hienVat'), value: formatCurrency(kpis.tongHienVat), icon: Package, color: 'text-violet-600', bg: 'bg-violet-500/10' },
      {
        id: 'donViCoUngHo',
        label: T('kpi.donViCoUngHo'),
        value: kpis.donViCoUngHo,
        pct: `${kpis.tyLeCoUngHo}%`,
        icon: CheckCircle2,
        color: 'text-sky-600',
        bg: 'bg-sky-500/10',
      },
      { id: 'soLuot', label: T('kpi.soLuot'), value: kpis.soLuot, icon: Repeat, color: 'text-slate-600', bg: 'bg-slate-500/10' },
    ],
    [kpis],
  );

  const loaiOptions = useMemo(() => khoDonViCuuTroLoaiComboboxOptions(), []);
  const nhomOptions = useMemo(() => buildNhomUngHoOptions(ungHoNhom), [ungHoNhom]);
  const gioiThieuOptions = useMemo(() => {
    const labels = [...new Set(allRows.map((r) => r.don_vi_gioi_thieu_label).filter(Boolean))];
    return labels.sort((a, b) => a.localeCompare(b, 'vi')).map((v) => ({ value: v, label: v }));
  }, [allRows]);

  const filterGroups = useMemo(
    () => [
      {
        key: 'loai',
        label: txt('matTranDonViCuuTro.store.loaiCol'),
        icon: Tags,
        options: loaiOptions,
        value: dims.loai,
        onChange: (vals: string[]) => setDim('loai', vals),
      },
      {
        key: 'don_vi_gioi_thieu',
        label: txt('matTranDonViCuuTro.store.donViGioiThieuCol'),
        icon: MapPin,
        options: gioiThieuOptions,
        value: dims.don_vi_gioi_thieu,
        onChange: (vals: string[]) => setDim('don_vi_gioi_thieu', vals),
      },
      {
        key: 'nhom',
        label: T('filter.nhomLabel'),
        icon: Layers,
        options: nhomOptions,
        value: dims.nhom,
        onChange: (vals: string[]) => setDim('nhom', vals),
      },
    ],
    [loaiOptions, gioiThieuOptions, nhomOptions, dims, setDim],
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
      toast.warning(txt('matTranDonViCuuTro.noExportData'));
      return;
    }
    void exportDonViCuuTroThongKeToExcel({
      kyBaoCao: range.allTime ? '' : `${range.start} → ${range.end}`,
      kpis,
      loaiRows,
      gioiThieuRows,
      chiTietRows: rows,
    });
  }, [rows, range, kpis, loaiRows, gioiThieuRows]);

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

  const isError = listQuery.isError || ungHoQuery.isError;
  const showSkeleton = listQuery.isLoading || ungHoQuery.isLoading || matrixLoading;

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
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangePicker}</div>
        }
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {isError ? (
          <ErrorState
            className="w-full max-w-md mx-auto border-destructive/20"
            message={T('loadErrorHint')}
            onRetry={() => {
              void listQuery.refetch();
              void ungHoQuery.refetch();
            }}
            primaryButtons
          />
        ) : showSkeleton ? (
          <ReportSkeleton />
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={3} />

            <StatsCard title={T('chart.loaiTitle')} icon={Tags} spanTwo>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={loaiChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
                    <YAxis tickFormatter={formatAxisTick} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend />
                    <Bar
                      dataKey="tienMat"
                      stackId="ungHo"
                      name={`${T('kpi.tienMat')} (triệu đồng)`}
                      fill="hsl(var(--primary))"
                    />
                    <Bar
                      dataKey="hienVat"
                      stackId="ungHo"
                      name={`${T('kpi.hienVat')} (triệu đồng)`}
                      fill="hsl(var(--chart-2, 38 92% 50%))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </StatsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatsTableCard
                title={T('table.gioiThieuTitle')}
                icon={MapPin}
                rows={gioiThieuRows.map((r) => ({
                  id: r.key,
                  label: `${r.key} · ${r.soDonVi} (${r.donViCoUngHo} ${T('table.colCoUngHo')})`,
                  value: formatCurrency(r.tong),
                }))}
                columnLabelKey="matTranDonViCuuTro.thongKe.table.colGioiThieu"
                columnValueKey="matTranDonViCuuTro.thongKe.table.colSoTien"
                emptyKey="matTranDonViCuuTro.thongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
              <StatsTableCard
                title={T('table.topTitle', { n: TOP_LIMIT })}
                icon={Trophy}
                rows={topRows.map((r) => ({
                  id: r.row.id,
                  label: r.row.ten,
                  value: formatCurrency(r.tong),
                }))}
                columnLabelKey="matTranDonViCuuTro.thongKe.table.colDonVi"
                columnValueKey="matTranDonViCuuTro.thongKe.table.colSoTien"
                emptyKey="matTranDonViCuuTro.thongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DonViCuuTroThongKePanel;
