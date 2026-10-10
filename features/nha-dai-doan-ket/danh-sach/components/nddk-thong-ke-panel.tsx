import React, { useCallback, useMemo, useState } from 'react';
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
  CheckCircle2,
  Activity,
  Percent,
  Wallet,
  ListChecks,
  MapPin,
  Users,
  Download,
  Printer,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { encodeStatsFilters } from '@/lib/stats-filter-search-params';
import { txt } from '@/lib/text';
import { formatCurrency, formatDecimal, formatAxisTick } from '@/lib/utils';
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
import { useNhaDaiDoanKetList } from '../hooks/use-nha-dai-doan-ket';
import { canViewNddkRow, useNddkViewer } from '../hooks/use-nddk-viewer';
import {
  NDDK_DOI_TUONG_VALUES,
  NDDK_LOAI_HINH_VALUES,
  NDDK_NGUON_HO_TRO_VALUES,
  NDDK_NGUON_VALUES,
  NDDK_TRANG_THAI_VALUES,
  NDDK_LIST_PATH,
} from '../core/constants';
import {
  nddkDoiTuongBadge,
  nddkLoaiHinhBadge,
  nddkNguonBadge,
  nddkTrangThaiBadge,
} from '../core/display-badges';
import { useNddkXaPhuongOptions } from '../hooks/use-nddk-xa-phuong-options';
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
} from '../utils/aggregate-nddk-stats';
import { exportNddkThongKeReportToExcel } from '../utils/export-nddk-report';

/** Mặc định «Tất cả» — không lọc thời gian cho tới khi người dùng chọn. */
const INITIAL_DATE_RANGE: DateRangeValue = { preset: 'all', customStart: '', customEnd: '' };

/** Số xã/phường hiện trong bảng "Top theo số tiền". */
const TOP_XA_PHUONG_LIMIT = 10;

/** Triệu đồng — trục tiền trên biểu đồ, để nhãn không tràn. */
function toTrieu(value: number): number {
  return Math.round(value / 1_000_000);
}

interface Props {
  /** TabGroup của trang cha — đặt vào đầu thanh công cụ. */
  tabsSlot?: React.ReactNode;
  /** Nút Back của thanh công cụ; trang cha quyết định đi đâu. */
  onPageBack: () => void;
  /** Quyền xuất — trang cha đã tra theo resource của module. */
  canExport: boolean;
  /**
   * Chỉ bật khi tab Thống kê đang mở. Hàm này kéo TOÀN BỘ bảng (khác RPC phân
   * trang của tab Danh sách), bật sẵn từ lúc vào trang là tốn egress vô ích.
   */
  queryEnabled: boolean;
}

const NddkThongKePanel: React.FC<Props> = ({ tabsSlot, onPageBack, canExport, queryEnabled }) => {
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);

  const {
    data: allRows = [],
    isLoading,
    isError,
    refetch,
  } = useNhaDaiDoanKetList({ enabled: queryEnabled });

  const viewer = useNddkViewer();

  /**
   * Áp phạm vi xem TRƯỚC mọi phép tổng hợp. Trang thống kê mà bỏ bước này thì
   * các con số tổng đã là dữ liệu toàn hệ thống, dù bảng chi tiết có lọc.
   */
  const viewableRows = useMemo(
    () => allRows.filter((r) => canViewNddkRow(viewer, r)),
    [allRows, viewer],
  );

  /** Khoảng thời gian lọc theo ngày tạo hồ sơ — xem `filterRowsForNddkThongKe`. */
  const [dateRange, setDateRange] = useState<DateRangeValue>(INITIAL_DATE_RANGE);
  const datePresets = useMemo(() => buildStandardDateRangePresets(), []);
  const resolvedRange = useMemo(
    () => resolveStandardDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const [dims, setDims] = useState<NddkThongKeDimensionFilters>(NDDK_THONG_KE_INITIAL_DIMS);
  const activeFilterCount = useMemo(
    () => countActiveStatsFilters(dims, isStandardDateRangeNonDefault(dateRange, 'all')),
    [dims, dateRange],
  );
  const clearFilters = useCallback(() => {
    setDims(NDDK_THONG_KE_INITIAL_DIMS);
    setDateRange(INITIAL_DATE_RANGE);
  }, []);
  const setDim = useCallback(
    (key: keyof NddkThongKeDimensionFilters, vals: string[]) =>
      setDims((cur) => ({ ...cur, [key]: vals })),
    [],
  );

  const rows = useMemo(
    () => filterRowsForNddkThongKe(viewableRows, dims, resolvedRange),
    [viewableRows, dims, resolvedRange],
  );

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
    [xaPhuongFilterOptions, dims, setDim],
  );

  const dateRangePicker = (
    <DateRangePicker
      presets={datePresets}
      value={dateRange}
      onChange={setDateRange}
      placeholder={txt('nhaDaiDoanKetThongKe.filter.thoiGianLabel')}
      customPresetId="custom"
      className="shrink-0"
    />
  );

  const filtersSlot = (
    <>
      {dateRangePicker}
      <div className="hidden h-6 w-px shrink-0 self-center bg-border sm:block" aria-hidden />
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
      <FilterChipMultiSelect
        options={NDDK_NGUON_HO_TRO_VALUES.map((v) => ({ value: v, label: v }))}
        value={dims.nguon_ho_tro}
        onChange={(vals) => setDim('nguon_ho_tro', vals)}
        placeholder={txt('nhaDaiDoanKetThongKe.filter.nguonHoTroLabel')}
        icon={Coins}
        className="shrink-0"
      />
      <FilterChipMultiSelect
        options={xaPhuongFilterOptions}
        value={dims.xa_phuong}
        onChange={(vals) => setDim('xa_phuong', vals)}
        placeholder={txt('nhaDaiDoanKet.store.xaPhuongCol')}
        icon={MapPin}
        className="shrink-0"
      />
    </>
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

  const navigate = useNavigate();
  /** Trang xem trước danh sách ký nhận — bộ lọc đi theo query string. */
  const handlePrintList = useCallback(() => {
    if (rows.length === 0) {
      toast.warning(txt('nhaDaiDoanKetThongKe.inDanhSachTrong'));
      return;
    }
    navigate(`${NDDK_LIST_PATH}/in-danh-sach?${encodeStatsFilters(dims, dateRange).toString()}`);
  }, [rows.length, navigate, dims, dateRange]);

  const actions = canExport ? (
    <>
      <Tooltip content={txt('nhaDaiDoanKetThongKe.inDanhSach')} placement="bottom">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrintList}
          aria-label={txt('nhaDaiDoanKetThongKe.inDanhSach')}
          className="inline-flex h-9 w-9 p-0 items-center justify-center border-border text-muted-foreground hover:bg-muted/50"
        >
          <Printer className="w-4 h-4" />
        </Button>
      </Tooltip>
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
    </>
  ) : undefined;

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
        tabSlot={tabsSlot}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangePicker}</div>
        }
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
                    <YAxis tickFormatter={formatAxisTick} yAxisId="left" tick={{ fontSize: 12 }} allowDecimals={false} />
                    <YAxis tickFormatter={formatAxisTick}
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
                      <YAxis tickFormatter={formatAxisTick} tick={{ fontSize: 12 }} allowDecimals={false} />
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
                      <YAxis tickFormatter={formatAxisTick} tick={{ fontSize: 12 }} allowDecimals={false} />
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
                      <YAxis tickFormatter={formatAxisTick} tick={{ fontSize: 12 }} allowDecimals={false} />
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
                      <YAxis tickFormatter={formatAxisTick} tick={{ fontSize: 12 }} allowDecimals={false} />
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
                  value: `${formatDecimal(r.soNha)} · ${formatDecimal(r.daBanGiao)} ${txt('nhaDaiDoanKetThongKe.table.colDaBanGiao').toLowerCase()}`,
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

export default NddkThongKePanel;
