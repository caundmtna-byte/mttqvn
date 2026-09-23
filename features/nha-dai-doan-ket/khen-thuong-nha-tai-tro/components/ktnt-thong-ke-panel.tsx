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
  Award,
  CalendarRange,
  CheckCircle2,
  Coins,
  Download,
  Hourglass,
  Landmark,
  Layers,
  ListChecks,
  MapPin,
  Percent,
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
import {
  KHO_DON_VI_CUU_TRO_LOAI,
  khoDonViCuuTroLoaiLabel,
  type KhoDonViCuuTroLoai,
} from '@/features/mat-tran-to-quoc/don-vi-cuu-tro/core/loai';
import { useKhenThuongNhaTaiTroAllRows } from '../hooks/use-khen-thuong-nha-tai-tro';
import { ktntViewerRpcScope, useKtntViewer } from '../hooks/use-ktnt-viewer';
import { KTNT_CAP_KHEN_VALUES, KTNT_TRANG_THAI_VALUES } from '../core/constants';
import { ktntCapKhenBadge, ktntTrangThaiBadge } from '../core/display-badges';
import { buildNddkNamOptions } from '../../danh-sach/utils/nam-options';
import {
  KTNT_THONG_KE_INITIAL_DIMS,
  aggregateKtntByXaPhuong,
  buildKtntBarData,
  buildKtntNamSeries,
  computeKtntKpis,
  filterRowsForKtntThongKe,
  topKtntNhaTaiTro,
  type KtntBarPoint,
  type KtntThongKeDims,
} from '../utils/aggregate-ktnt-stats';
import { exportKtntThongKeReportToExcel } from '../utils/export-ktnt-report';

const TOP_LIMIT = 10;
const T = (k: string) => txt(`khenThuongNhaTaiTroThongKe.${k}`);
const L = (k: string) => txt(`khenThuongNhaTaiTro.store.${k}`);
const toOptions = (values: readonly string[]) => values.map((v) => ({ value: v, label: v }));
const loaiLabel = (v: string) => khoDonViCuuTroLoaiLabel(v as KhoDonViCuuTroLoai);

interface Props {
  tabsSlot?: React.ReactNode;
  onPageBack: () => void;
  canExport: boolean;
  /** Chỉ bật khi tab Thống kê đang mở — kéo toàn bộ dòng, bật sẵn là tốn egress. */
  queryEnabled: boolean;
}

const BarCard: React.FC<{
  title: string;
  icon: LucideIcon;
  rows: KtntBarPoint[];
  badgeConfig?: BadgeConfig;
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
            dataKey="soQuyetDinh"
            name={T('chart.soQuyetDinh')}
            radius={[4, 4, 0, 0]}
            getFill={(row, i) => chartFillForCategoricalBar(row, i, badgeConfig ? { badgeConfig } : {})}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </StatsCard>
);

const KtntThongKePanel: React.FC<Props> = ({ tabsSlot, onPageBack, canExport, queryEnabled }) => {
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const viewer = useKtntViewer();
  // Phạm vi xem áp ở MÁY CHỦ (RPC) trước mọi phép tổng hợp.
  const scope = useMemo(() => ktntViewerRpcScope(viewer), [viewer]);
  const { data: allRows = [], isLoading, isError, refetch } = useKhenThuongNhaTaiTroAllRows(scope, {
    enabled: queryEnabled,
  });

  const [dims, setDims] = useState<KtntThongKeDims>(KTNT_THONG_KE_INITIAL_DIMS);
  const activeFilterCount = useMemo(() => countActiveStatsFilters(dims, false), [dims]);
  const clearFilters = useCallback(() => setDims(KTNT_THONG_KE_INITIAL_DIMS), []);
  const setDim = useCallback(
    (key: keyof KtntThongKeDims, vals: string[]) => setDims((cur) => ({ ...cur, [key]: vals })),
    [],
  );

  const rows = useMemo(() => filterRowsForKtntThongKe(allRows, dims), [allRows, dims]);
  const kpis = useMemo(() => computeKtntKpis(rows), [rows]);
  const namSeries = useMemo(() => buildKtntNamSeries(rows), [rows]);
  const capKhenRows = useMemo(() => buildKtntBarData(rows, 'cap_khen', KTNT_CAP_KHEN_VALUES), [rows]);
  const trangThaiRows = useMemo(() => buildKtntBarData(rows, 'trang_thai', KTNT_TRANG_THAI_VALUES), [rows]);
  const loaiRows = useMemo(
    () => buildKtntBarData(rows, 'loai_nha_tai_tro', KHO_DON_VI_CUU_TRO_LOAI, loaiLabel),
    [rows],
  );
  const topRows = useMemo(() => topKtntNhaTaiTro(rows, TOP_LIMIT), [rows]);
  const xaRows = useMemo(() => aggregateKtntByXaPhuong(rows), [rows]);

  const kpiItems: StatsKpiCardItem[] = useMemo(
    () => [
      { id: 'tong', label: T('kpi.tongQuyetDinh'), value: kpis.tongQuyetDinh, icon: Award, color: 'text-primary', bg: 'bg-primary/10' },
      { id: 'daDuyet', label: T('kpi.daDuyet'), value: kpis.daDuyet, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
      { id: 'choDuyet', label: T('kpi.choDuyet'), value: kpis.choDuyet, icon: Hourglass, color: 'text-amber-600', bg: 'bg-amber-500/10' },
      { id: 'tyLe', label: T('kpi.tyLeDuyet'), value: `${kpis.tyLeDuyet}%`, icon: Percent, color: 'text-sky-600', bg: 'bg-sky-500/10' },
      { id: 'nhaTaiTro', label: T('kpi.soNhaTaiTro'), value: kpis.soNhaTaiTro, icon: Trophy, color: 'text-violet-600', bg: 'bg-violet-500/10' },
      { id: 'giaTri', label: T('kpi.tongGiaTri'), value: formatCurrency(kpis.tongGiaTri), icon: Coins, color: 'text-amber-600', bg: 'bg-amber-500/10' },
    ],
    [kpis],
  );

  const specs = useMemo(
    (): { key: keyof KtntThongKeDims; label: string; icon: LucideIcon; options: { value: string; label: string }[] }[] => [
      { key: 'nam', label: L('ngayKhenCol'), icon: CalendarRange, options: buildNddkNamOptions() },
      { key: 'trang_thai', label: L('trangThaiCol'), icon: ListChecks, options: toOptions(KTNT_TRANG_THAI_VALUES) },
      { key: 'cap_khen', label: L('capKhenCol'), icon: Landmark, options: toOptions(KTNT_CAP_KHEN_VALUES) },
      {
        key: 'loai_nha_tai_tro',
        label: L('loaiNhaTaiTroCol'),
        icon: Layers,
        options: KHO_DON_VI_CUU_TRO_LOAI.map((v) => ({ value: v, label: loaiLabel(v) })),
      },
    ],
    [],
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
      {specs.map((s) => (
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
      toast.warning(T('noExportData'));
      return;
    }
    void exportKtntThongKeReportToExcel({
      kpis,
      namRows: namSeries,
      bars: [
        { sheet: 'Theo cấp khen', colLabel: L('capKhenCol'), rows: capKhenRows },
        { sheet: 'Theo trạng thái', colLabel: L('trangThaiCol'), rows: trangThaiRows },
        { sheet: 'Theo loại nhà tài trợ', colLabel: L('loaiNhaTaiTroCol'), rows: loaiRows },
      ],
      // Sheet xuất lấy đủ mọi nhà tài trợ, không cắt top như trên màn hình.
      topNhaTaiTro: topKtntNhaTaiTro(rows, Number.MAX_SAFE_INTEGER),
      chiTietRows: rows,
    });
  }, [rows, kpis, namSeries, capKhenRows, trangThaiRows, loaiRows]);

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
            message={T('listLoadErrorHint')}
            onRetry={() => void refetch()}
            primaryButtons
          />
        ) : isLoading || matrixLoading ? (
          <ReportSkeleton />
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={3} />

            <StatsCard title={T('chart.theoNamTitle')} icon={TrendingUp} spanTwo>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={namSeries.map((p) => ({ ...p, nam: String(p.nam) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="nam" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                    <RechartsTooltip content={<ChartTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="soQuyetDinh" name={T('chart.soQuyetDinh')} stroke="hsl(var(--primary))" strokeWidth={2} />
                    <Line type="monotone" dataKey="daDuyet" name={T('kpi.daDuyet')} stroke="hsl(var(--chart-2, 142 71% 45%))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </StatsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BarCard title={T('chart.trangThaiTitle')} icon={ListChecks} rows={trangThaiRows} badgeConfig={ktntTrangThaiBadge} />
              <BarCard title={T('chart.capKhenTitle')} icon={Landmark} rows={capKhenRows} badgeConfig={ktntCapKhenBadge} />
            </div>
            <BarCard title={T('chart.loaiTitle')} icon={Layers} rows={loaiRows} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatsTableCard
                title={T('table.topNhaTaiTroTitle')}
                icon={Trophy}
                rows={topRows.map((r) => ({
                  id: r.id,
                  label: r.label,
                  value: `${r.soQuyetDinh} · ${formatCurrency(r.giaTri)}`,
                }))}
                columnLabelKey="khenThuongNhaTaiTroThongKe.table.colNhaTaiTro"
                columnValueKey="khenThuongNhaTaiTroThongKe.table.colGiaTri"
                emptyKey="khenThuongNhaTaiTroThongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
              <StatsTableCard
                title={T('table.theoXaPhuongTitle')}
                icon={MapPin}
                rows={xaRows.map((r) => ({ id: r.id, label: r.label, value: String(r.soQuyetDinh) }))}
                columnLabelKey="khenThuongNhaTaiTroThongKe.table.colXaPhuong"
                columnValueKey="khenThuongNhaTaiTroThongKe.table.colSoQuyetDinh"
                emptyKey="khenThuongNhaTaiTroThongKe.table.empty"
                maxHeight="max-h-[320px]"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default KtntThongKePanel;
