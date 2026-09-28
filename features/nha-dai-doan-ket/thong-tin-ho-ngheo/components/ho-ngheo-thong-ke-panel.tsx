import React, { useCallback, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
} from 'recharts';
import {
  Users,
  Activity,
  CheckCircle2,
  Percent,
  Church,
  ListChecks,
  MapPin,
  Globe2,
  Download,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
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
import { useHoNgheoThongKe } from '../hooks/use-ho-ngheo';
import { isHoNgheoScopedToXaPhuong, useHoNgheoViewer } from '../hooks/use-ho-ngheo-viewer';
import { useDanTocOptions } from '../hooks/use-dan-toc-options';
import { useNddkXaPhuongOptions } from '../../danh-sach/hooks/use-nddk-xa-phuong-options';
import {
  HNGH_DOI_TUONG_VALUES,
  HNGH_TON_GIAO_VALUES,
  HNGH_TRANG_THAI_VALUES,
} from '../core/constants';
import { hnghDoiTuongBadge, hnghTonGiaoBadge, hnghTrangThaiBadge } from '../core/display-badges';
import {
  HNGH_KHONG_XAC_DINH,
  HNGH_THONG_KE_INITIAL_DIMS,
  aggregateHnghByXaPhuong,
  buildHnghBarData,
  buildHnghDanTocBarData,
  computeHnghKpis,
  filterRowsForHnghThongKe,
  type HnghBarPoint,
  type HnghThongKeDimensionFilters,
} from '../utils/aggregate-hngh-stats';
import { exportHnghThongKeReportToExcel } from '../utils/export-hngh-report';

interface Props {
  /** TabGroup của trang cha — đặt vào đầu thanh công cụ. */
  tabsSlot?: React.ReactNode;
  /** Nút Back của thanh công cụ; trang cha quyết định đi đâu. */
  onPageBack: () => void;
  /** Quyền xuất — trang cha đã tra theo resource của module. */
  canExport: boolean;
  /**
   * Chỉ bật khi tab Thống kê đang mở: hàm này kéo TOÀN BỘ hộ trong phạm vi xem,
   * bật sẵn từ lúc vào trang là tốn egress vô ích.
   */
  queryEnabled: boolean;
}

const BarCard: React.FC<{
  title: string;
  icon: LucideIcon;
  rows: HnghBarPoint[];
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
            dataKey="soHo"
            name={txt('hoNgheoThongKe.chart.soHo')}
            radius={[4, 4, 0, 0]}
            getFill={(row, i) => chartFillForCategoricalBar(row, i, { badgeConfig })}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </StatsCard>
);

const HoNgheoThongKePanel: React.FC<Props> = ({ tabsSlot, onPageBack, canExport, queryEnabled }) => {
  const matrixLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const viewer = useHoNgheoViewer();
  const scopedToXa = isHoNgheoScopedToXaPhuong(viewer);

  // `rows` đã áp phạm vi xem — xem `useHoNgheoThongKe`.
  const { rows: viewableRows, isLoading, isError, refetch } = useHoNgheoThongKe({
    enabled: queryEnabled,
  });

  const [dims, setDims] = useState<HnghThongKeDimensionFilters>(HNGH_THONG_KE_INITIAL_DIMS);
  // Không có bộ chọn khoảng ngày (xem `aggregate-hngh-stats.ts`) ⇒ `false`.
  const activeFilterCount = useMemo(() => countActiveStatsFilters(dims, false), [dims]);
  const clearFilters = useCallback(() => setDims(HNGH_THONG_KE_INITIAL_DIMS), []);
  const setDim = useCallback(
    (key: keyof HnghThongKeDimensionFilters, vals: string[]) =>
      setDims((cur) => ({ ...cur, [key]: vals })),
    [],
  );

  const rows = useMemo(() => filterRowsForHnghThongKe(viewableRows, dims), [viewableRows, dims]);

  const khongXacDinh = txt('hoNgheoThongKe.khongXacDinh');
  const khongGanXa = txt('hoNgheoThongKe.table.khongGanXa');
  const kpis = useMemo(() => computeHnghKpis(rows), [rows]);
  const doiTuongRows = useMemo(
    () => buildHnghBarData(rows, 'doi_tuong', HNGH_DOI_TUONG_VALUES, khongXacDinh),
    [rows, khongXacDinh],
  );
  const trangThaiRows = useMemo(
    () => buildHnghBarData(rows, 'trang_thai', HNGH_TRANG_THAI_VALUES, khongXacDinh),
    [rows, khongXacDinh],
  );
  const tonGiaoRows = useMemo(
    () => buildHnghBarData(rows, 'ton_giao', HNGH_TON_GIAO_VALUES, khongXacDinh),
    [rows, khongXacDinh],
  );
  const danTocRows = useMemo(
    () => buildHnghDanTocBarData(rows, khongXacDinh),
    [rows, khongXacDinh],
  );
  const xaPhuongRows = useMemo(
    () => aggregateHnghByXaPhuong(rows, khongGanXa),
    [rows, khongGanXa],
  );

  const kpiItems: StatsKpiCardItem[] = useMemo(
    () => [
      {
        id: 'tongSoHo',
        label: txt('hoNgheoThongKe.kpi.tongSoHo'),
        value: kpis.tongSoHo,
        icon: Users,
        color: 'text-primary',
        bg: 'bg-primary/10',
      },
      {
        id: 'dangKhoKhan',
        label: txt('hoNgheoThongKe.kpi.dangKhoKhan'),
        value: kpis.dangKhoKhan,
        icon: Activity,
        color: 'text-rose-600',
        bg: 'bg-rose-500/10',
      },
      {
        id: 'hetKhoKhan',
        label: txt('hoNgheoThongKe.kpi.hetKhoKhan'),
        value: kpis.hetKhoKhan,
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
      },
      {
        id: 'tyLeHetKhoKhan',
        label: txt('hoNgheoThongKe.kpi.tyLeHetKhoKhan'),
        value: `${kpis.tyLeHetKhoKhan}%`,
        icon: Percent,
        color: 'text-sky-600',
        bg: 'bg-sky-500/10',
      },
      {
        id: 'coTonGiao',
        label: txt('hoNgheoThongKe.kpi.coTonGiao'),
        value: kpis.coTonGiao,
        icon: Church,
        color: 'text-violet-600',
        bg: 'bg-violet-500/10',
      },
    ],
    [kpis],
  );

  const xaPhuongOptions = useNddkXaPhuongOptions(scopedToXa ? viewer.viewerDonViId : null);
  const danTocOptions = useDanTocOptions({ enabled: queryEnabled });
  const xaPhuongFilterOptions = useMemo(
    () => [
      { value: HNGH_KHONG_XAC_DINH, label: khongGanXa },
      ...xaPhuongOptions.map((o) => ({ value: String(o.value), label: o.label })),
    ],
    [xaPhuongOptions, khongGanXa],
  );
  const danTocFilterOptions = useMemo(
    () => [{ value: HNGH_KHONG_XAC_DINH, label: khongXacDinh }, ...danTocOptions],
    [danTocOptions, khongXacDinh],
  );
  const doiTuongFilterOptions = useMemo(
    () => [
      ...HNGH_DOI_TUONG_VALUES.map((v) => ({ value: v, label: v })),
      { value: HNGH_KHONG_XAC_DINH, label: khongXacDinh },
    ],
    [khongXacDinh],
  );
  const trangThaiOptions = useMemo(
    () => HNGH_TRANG_THAI_VALUES.map((v) => ({ value: v, label: v })),
    [],
  );
  const tonGiaoOptions = useMemo(
    () => HNGH_TON_GIAO_VALUES.map((v) => ({ value: v, label: v })),
    [],
  );

  const filterGroups = useMemo(
    () => [
      {
        key: 'xa_phuong',
        label: txt('hoNgheo.store.xaPhuongCol'),
        icon: MapPin,
        options: xaPhuongFilterOptions,
        value: dims.xa_phuong,
        onChange: (vals: string[]) => setDim('xa_phuong', vals),
      },
      {
        key: 'doi_tuong',
        label: txt('hoNgheo.store.doiTuongCol'),
        icon: Users,
        options: doiTuongFilterOptions,
        value: dims.doi_tuong,
        onChange: (vals: string[]) => setDim('doi_tuong', vals),
      },
      {
        key: 'trang_thai',
        label: txt('hoNgheo.store.trangThaiCol'),
        icon: ListChecks,
        options: trangThaiOptions,
        value: dims.trang_thai,
        onChange: (vals: string[]) => setDim('trang_thai', vals),
      },
      {
        key: 'ton_giao',
        label: txt('hoNgheo.store.tonGiaoCol'),
        icon: Church,
        options: tonGiaoOptions,
        value: dims.ton_giao,
        onChange: (vals: string[]) => setDim('ton_giao', vals),
      },
      {
        key: 'dan_toc',
        label: txt('hoNgheo.store.danTocCol'),
        icon: Globe2,
        options: danTocFilterOptions,
        value: dims.dan_toc,
        onChange: (vals: string[]) => setDim('dan_toc', vals),
      },
    ],
    [
      xaPhuongFilterOptions,
      doiTuongFilterOptions,
      trangThaiOptions,
      tonGiaoOptions,
      danTocFilterOptions,
      dims,
      setDim,
    ],
  );

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      {!scopedToXa && (
        <FilterChipMultiSelect
          options={xaPhuongFilterOptions}
          value={dims.xa_phuong}
          onChange={(vals) => setDim('xa_phuong', vals)}
          placeholder={txt('hoNgheo.store.xaPhuongCol')}
          icon={MapPin}
          className="shrink-0"
        />
      )}
      <FilterChipMultiSelect
        options={doiTuongFilterOptions}
        value={dims.doi_tuong}
        onChange={(vals) => setDim('doi_tuong', vals)}
        placeholder={txt('hoNgheo.store.doiTuongCol')}
        icon={Users}
        className="shrink-0"
      />
      <FilterChipMultiSelect
        options={trangThaiOptions}
        value={dims.trang_thai}
        onChange={(vals) => setDim('trang_thai', vals)}
        placeholder={txt('hoNgheo.store.trangThaiCol')}
        icon={ListChecks}
        className="shrink-0"
      />
    </div>
  );

  const handleExport = useCallback(() => {
    if (rows.length === 0) {
      toast.warning(txt('hoNgheoThongKe.noExportData'));
      return;
    }
    void exportHnghThongKeReportToExcel({
      kpis,
      doiTuongRows,
      trangThaiRows,
      tonGiaoRows,
      danTocRows,
      xaPhuongRows,
    });
  }, [rows.length, kpis, doiTuongRows, trangThaiRows, tonGiaoRows, danTocRows, xaPhuongRows]);

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
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {isError ? (
          <ErrorState
            className="w-full max-w-md mx-auto border-destructive/20"
            message={txt('hoNgheoThongKe.listLoadErrorHint')}
            onRetry={() => void refetch()}
            primaryButtons
          />
        ) : showSkeleton ? (
          <ReportSkeleton />
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={4} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <BarCard
                title={txt('hoNgheoThongKe.chart.doiTuongTitle')}
                icon={Users}
                rows={doiTuongRows}
                badgeConfig={hnghDoiTuongBadge}
              />
              <BarCard
                title={txt('hoNgheoThongKe.chart.trangThaiTitle')}
                icon={ListChecks}
                rows={trangThaiRows}
                badgeConfig={hnghTrangThaiBadge}
              />
              <BarCard
                title={txt('hoNgheoThongKe.chart.tonGiaoTitle')}
                icon={Church}
                rows={tonGiaoRows}
                badgeConfig={hnghTonGiaoBadge}
              />
              <BarCard
                title={txt('hoNgheoThongKe.chart.danTocTitle')}
                icon={Globe2}
                rows={danTocRows}
              />
            </div>

            <StatsTableCard
              title={txt('hoNgheoThongKe.table.theoXaPhuongTitle')}
              icon={MapPin}
              rows={xaPhuongRows.map((r) => ({
                id: r.id,
                label: r.label,
                value: `${r.tongSoHo} · ${r.dangKhoKhan} ${txt('hoNgheoThongKe.kpi.dangKhoKhan').toLowerCase()}`,
              }))}
              columnLabelKey="hoNgheoThongKe.table.colXaPhuong"
              columnValueKey="hoNgheoThongKe.table.colSoHo"
              emptyKey="hoNgheoThongKe.table.empty"
              maxHeight="max-h-[360px]"
            />
          </>
        )}
      </div>
    </div>
  );
};

export default HoNgheoThongKePanel;
