import React, { useState, useMemo, useCallback } from 'react';
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
  Bar,
} from 'recharts';
import {
  ListOrdered,
  Activity,
  PauseCircle,
  CircleDot,
  Building2,
  CalendarRange,
  Tag,
  Flag,
  Download,
  Layers,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { cn, getLanguage } from '@/lib/utils';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import DateRangePicker, { type DateRangeValue } from '@/components/ui/DateRangePicker';
import { StatsKpiGrid, StatsCard, StatsTableCard } from '@/components/shared/stats';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import ExportDialog from '@/components/shared/ExportDialog';
import { useExportData } from '@/lib/useExportData';
import ChartTooltip from '@/components/ui/ChartTooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import type { ChuongTrinhNamListRow } from '../core/types';
import { CHUONG_TRINH_NAM_TRANG_THAI } from '../core/constants';
import {
  CHUONG_TRINH_STATS_PHONG_BAN_NONE,
  type ChuongTrinhNamStatsDimensionFilters,
  resolveChuongTrinhNamStatsDateRange,
  filterRowsForChuongTrinhNamStats,
  computeChuongTrinhNamStatsKpis,
  pickChuongTrinhTrendBucket,
  buildChuongTrinhTrendSeries,
  aggregateChuongTrinhTopPhongBan,
  aggregateChuongTrinhTopNamBatDau,
  buildChuongTrinhTrangThaiBarData,
  sortChuongTrinhLookupRows,
  type ChuongTrinhLookupSortKey,
} from '../utils/aggregate-chuong-trinh-nam-stats';

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'thisMonth',
  customStart: '',
  customEnd: '',
};

const initialDims: ChuongTrinhNamStatsDimensionFilters = {
  trang_thai: [],
  id_phong_ban: [],
  nam_bat_dau: [],
};

const EXPORT_PAGINATION = { page: 1, pageSize: 100_000 };

function yearFromNgayBatDau(d: string | null | undefined): string | null {
  if (!d?.trim()) return null;
  const y = d.trim().slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

interface Props {
  tabsSlot: React.ReactNode;
  rows: ChuongTrinhNamListRow[];
  isLoading: boolean;
  onOpenDetail: (id: string) => void;
}

const ChuongTrinhNamStatsPanel: React.FC<Props> = ({ tabsSlot, rows, isLoading, onOpenDetail }) => {
  const navigate = useNavigate();
  const { canExport } = useResourcePermissions('annualPrograms');

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [dims, setDims] = useState<ChuongTrinhNamStatsDimensionFilters>(initialDims);
  const [sortKey, setSortKey] = useState<ChuongTrinhLookupSortKey>('ten_chuong_trinh');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showExport, setShowExport] = useState(false);

  const presets = useMemo(
    () => [
      { id: 'thisWeek', label: txt('chuongTrinhNam.stats.preset.thisWeek') },
      { id: 'thisMonth', label: txt('chuongTrinhNam.stats.preset.thisMonth') },
      { id: 'thisQuarter', label: txt('chuongTrinhNam.stats.preset.thisQuarter') },
      { id: 'thisYear', label: txt('chuongTrinhNam.stats.preset.thisYear') },
      { id: CUSTOM_PRESET, label: txt('chuongTrinhNam.stats.preset.custom') },
    ],
    [],
  );

  const resolvedRange = useMemo(
    () =>
      resolveChuongTrinhNamStatsDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const filtered = useMemo(
    () => filterRowsForChuongTrinhNamStats(rows, resolvedRange, dims),
    [rows, resolvedRange, dims],
  );

  const kpis = useMemo(() => computeChuongTrinhNamStatsKpis(filtered), [filtered]);

  const bucket = useMemo(() => pickChuongTrinhTrendBucket(resolvedRange.start, resolvedRange.end), [resolvedRange]);
  const trendSeries = useMemo(
    () => buildChuongTrinhTrendSeries(filtered, resolvedRange, bucket),
    [filtered, resolvedRange, bucket],
  );

  const topPhongBan = useMemo(() => {
    const rowsTop = aggregateChuongTrinhTopPhongBan(filtered, 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const topNamBatDau = useMemo(() => {
    const rowsTop = aggregateChuongTrinhTopNamBatDau(filtered, 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const trangThaiBar = useMemo(() => buildChuongTrinhTrangThaiBarData(filtered), [filtered]);

  const sortedLookupBase = useMemo(
    () => sortChuongTrinhLookupRows(filtered, sortKey, sortDir, getLanguage),
    [filtered, sortKey, sortDir],
  );

  const trangThaiOptions = useMemo(
    () =>
      CHUONG_TRINH_NAM_TRANG_THAI.map((value) => ({
        value,
        label: value,
        count: rows.filter((r) => r.trang_thai === value).length,
      })),
    [rows],
  );

  const phongBanOptions = useMemo(() => {
    const byId = new Map<string, { label: string; count: number }>();
    let noneCount = 0;
    for (const r of rows) {
      const id = r.id_phong_ban?.trim();
      if (!id) {
        noneCount += 1;
        continue;
      }
      const label = (r.ten_phong_ban ?? '').trim() || id;
      const cur = byId.get(id);
      if (cur) cur.count += 1;
      else byId.set(id, { label, count: 1 });
    }
    const opts = [...byId.entries()]
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
    if (noneCount > 0) {
      opts.unshift({
        value: CHUONG_TRINH_STATS_PHONG_BAN_NONE,
        label: txt('chuongTrinhNam.filter.noPhongBan'),
        count: noneCount,
      });
    }
    return opts;
  }, [rows]);

  const namBatDauOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const y = yearFromNgayBatDau(r.ngay_bat_dau);
      if (!y) continue;
      counts.set(y, (counts.get(y) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([value, count]) => ({ value, label: value, count }))
      .sort((a, b) => b.value.localeCompare(a.value, getLanguage()));
  }, [rows]);

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'trang_thai',
        label: txt('chuongTrinhNam.stats.filterTrangThai'),
        icon: Flag,
        options: trangThaiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.trang_thai,
        onChange: (v) => setDims((d) => ({ ...d, trang_thai: v })),
      },
      {
        key: 'id_phong_ban',
        label: txt('chuongTrinhNam.stats.filterPhongBan'),
        icon: Building2,
        options: phongBanOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.id_phong_ban,
        onChange: (v) => setDims((d) => ({ ...d, id_phong_ban: v })),
      },
      {
        key: 'nam_bat_dau',
        label: txt('chuongTrinhNam.stats.filterNamBatDau'),
        icon: CalendarRange,
        options: namBatDauOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.nam_bat_dau,
        onChange: (v) => setDims((d) => ({ ...d, nam_bat_dau: v })),
      },
    ],
    [trangThaiOptions, phongBanOptions, namBatDauOptions, dims.trang_thai, dims.id_phong_ban, dims.nam_bat_dau],
  );

  const isNonDefaultDateRange = useMemo(() => {
    if (dateRange.preset === 'custom') {
      return Boolean(dateRange.customStart && dateRange.customEnd);
    }
    return dateRange.preset !== 'thisMonth';
  }, [dateRange]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (isNonDefaultDateRange) n += 1;
    if (dims.trang_thai.length) n += 1;
    if (dims.id_phong_ban.length) n += 1;
    if (dims.nam_bat_dau.length) n += 1;
    return n;
  }, [dims, isNonDefaultDateRange]);

  const clearFilters = useCallback(() => {
    setDims(initialDims);
    setDateRange(initialDateRange);
  }, []);

  const exportColumns = useMemo(
    () => [
      { key: 'ten_chuong_trinh', label: txt('chuongTrinhNam.stats.tableColTen') },
      { key: 'ten_phong_ban', label: txt('chuongTrinhNam.stats.tableColPhongBan') },
      { key: 'trang_thai', label: txt('chuongTrinhNam.stats.tableColTrangThai') },
      { key: 'ngay_bat_dau', label: txt('chuongTrinhNam.stats.tableColNgayBatDau') },
      { key: 'ngay_ket_thuc', label: txt('chuongTrinhNam.stats.tableColNgayKetThuc') },
      { key: 'nguoi_tao', label: txt('chuongTrinhNam.stats.tableColNguoiTao') },
      { key: 'tg_tao', label: txt('chuongTrinhNam.detail.fieldTgTao') },
      { key: 'range_start', label: txt('chuongTrinhNam.stats.exportRangeFrom') },
      { key: 'range_end', label: txt('chuongTrinhNam.stats.exportRangeTo') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: ChuongTrinhNamListRow) => ({
      ten_chuong_trinh: item.ten_chuong_trinh,
      ten_phong_ban: item.ten_phong_ban ?? '',
      trang_thai: item.trang_thai,
      ngay_bat_dau: item.ngay_bat_dau ?? '',
      ngay_ket_thuc: item.ngay_ket_thuc ?? '',
      nguoi_tao: (item.ho_va_ten_nguoi_tao ?? item.ten_tai_khoan_nguoi_tao ?? '').trim(),
      tg_tao: item.tg_tao,
      range_start: resolvedRange.start,
      range_end: resolvedRange.end,
    }),
    [resolvedRange.start, resolvedRange.end],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
    data: sortedLookupBase,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination: EXPORT_PAGINATION,
    selectedIds: new Set(),
    keyExtractor: (r) => r.id,
  });

  const kpiItems = useMemo(
    () => [
      {
        id: 'total',
        label: txt('chuongTrinhNam.stats.kpiTotal'),
        value: kpis.total,
        icon: ListOrdered,
        bg: 'bg-primary/10',
        color: 'text-primary',
        delta: null,
      },
      {
        id: 'hd',
        label: txt('chuongTrinhNam.stats.kpiHoatDong'),
        value: kpis.hoatDong,
        icon: Activity,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'td',
        label: txt('chuongTrinhNam.stats.kpiTamDung'),
        value: kpis.tamDung,
        icon: PauseCircle,
        bg: 'bg-amber-500/10',
        color: 'text-amber-600 dark:text-amber-400',
        delta: null,
      },
      {
        id: 'kt',
        label: txt('chuongTrinhNam.stats.kpiKetThuc'),
        value: kpis.ketThuc,
        icon: CircleDot,
        bg: 'bg-slate-500/10',
        color: 'text-slate-600 dark:text-slate-400',
        delta: null,
      },
    ],
    [kpis],
  );

  const handleExport = () => {
    if (sortedLookupBase.length === 0) {
      toast.warning(txt('chuongTrinhNam.stats.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const toggleSort = (key: ChuongTrinhLookupSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'ngay_bat_dau' || key === 'ngay_ket_thuc' ? 'desc' : 'asc');
    }
  };

  const dateRangeRow = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 w-full">
      <DateRangePicker
        presets={presets}
        value={dateRange}
        onChange={setDateRange}
        placeholder={txt('chuongTrinhNam.stats.dateRangeLabel')}
        customPresetId={CUSTOM_PRESET}
        className="shrink-0"
      />
    </div>
  );

  const filterPanelDesktop = (
    <>
      <div className="flex shrink-0 items-center">{dateRangeRow}</div>
      <div className="hidden h-6 w-px shrink-0 self-center bg-border sm:block" aria-hidden />
      <FilterChipMultiSelect
        icon={Flag}
        options={trangThaiOptions}
        value={dims.trang_thai}
        onChange={(v) => setDims((d) => ({ ...d, trang_thai: v }))}
        placeholder={txt('chuongTrinhNam.stats.filterTrangThai')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={Building2}
        options={phongBanOptions}
        value={dims.id_phong_ban}
        onChange={(v) => setDims((d) => ({ ...d, id_phong_ban: v }))}
        placeholder={txt('chuongTrinhNam.stats.filterPhongBan')}
        className="w-[10.5rem] shrink-0"
      />
      <FilterChipMultiSelect
        icon={CalendarRange}
        options={namBatDauOptions}
        value={dims.nam_bat_dau}
        onChange={(v) => setDims((d) => ({ ...d, nam_bat_dau: v }))}
        placeholder={txt('chuongTrinhNam.stats.filterNamBatDau')}
        className="w-[9.5rem] shrink-0"
      />
    </>
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

  return (
    <div
      className="flex flex-col flex-1 min-h-0 relative mt-1.5 min-w-0"
      aria-label={txt('chuongTrinhNam.stats.title')}
    >
      <DashboardToolbar
        className="shrink-0 mb-3"
        onBack={() => navigate('/quan-ly-giao-viec')}
        desktopStartSlot={tabsSlot}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangeRow}</div>
        }
        filters={filterPanelDesktop}
        filtersSingleRow
        filterGroups={filterGroups}
        actions={<div className="hidden sm:flex shrink-0">{renderExportToolbarButton()}</div>}
        mobileActions={renderExportToolbarButton()}
        activeFilterCount={activeFilterCount}
        onClearFilters={activeFilterCount ? clearFilters : undefined}
      />

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card shadow-sm p-3 sm:p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{txt('chuongTrinhNam.stats.loading')}</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">{txt('chuongTrinhNam.stats.noData')}</p>
            <p className="text-xs text-muted-foreground">{txt('chuongTrinhNam.stats.noDataHint')}</p>
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={4} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('chuongTrinhNam.stats.chartTrendCount')} icon={FileText} spanTwo={false}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={trendSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name={txt('chuongTrinhNam.stats.tableTwoColValue')}
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('chuongTrinhNam.stats.chartTrangThai')} icon={Tag}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={trangThaiBar} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Bar
                        dataKey="count"
                        name={txt('chuongTrinhNam.stats.tableTwoColValue')}
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsTableCard
                title={txt('chuongTrinhNam.stats.chartTopPhongBan')}
                icon={Building2}
                rows={topPhongBan.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="chuongTrinhNam.stats.tableTwoColLabel"
                columnValueKey="chuongTrinhNam.stats.tableTwoColValue"
                emptyKey="chuongTrinhNam.stats.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('chuongTrinhNam.stats.chartTopNamBatDau')}
                icon={CalendarRange}
                rows={topNamBatDau.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
                columnLabelKey="chuongTrinhNam.stats.tableTwoColLabel"
                columnValueKey="chuongTrinhNam.stats.tableTwoColValue"
                emptyKey="chuongTrinhNam.stats.noData"
                maxHeight="max-h-[220px]"
              />
            </div>

            <StatsCard title={txt('chuongTrinhNam.stats.tableLookupTitle')} icon={Layers}>
              <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['ten_chuong_trinh', txt('chuongTrinhNam.stats.tableColTen')],
                          ['ten_phong_ban', txt('chuongTrinhNam.stats.tableColPhongBan')],
                          ['trang_thai', txt('chuongTrinhNam.stats.tableColTrangThai')],
                          ['ngay_bat_dau', txt('chuongTrinhNam.stats.tableColNgayBatDau')],
                          ['ngay_ket_thuc', txt('chuongTrinhNam.stats.tableColNgayKetThuc')],
                          ['nguoi_tao', txt('chuongTrinhNam.stats.tableColNguoiTao')],
                        ] as const
                      ).map(([key, label]) => (
                        <th key={key} className="py-2 pr-3 font-medium whitespace-nowrap">
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
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLookupBase.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/60 hover:bg-muted/40 cursor-pointer"
                        onClick={() => onOpenDetail(row.id)}
                      >
                        <td className="py-2 pr-3 max-w-[220px] truncate font-medium">{row.ten_chuong_trinh}</td>
                        <td className="py-2 pr-3 max-w-[160px] truncate">{row.ten_phong_ban?.trim() || '—'}</td>
                        <td className="py-2 pr-3">{row.trang_thai}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{row.ngay_bat_dau ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{row.ngay_ket_thuc ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[160px] truncate">
                          {(row.ho_va_ten_nguoi_tao ?? row.ten_tai_khoan_nguoi_tao ?? '').trim() || '—'}
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

      <ExportDialog
        open={showExport}
        onClose={() => setShowExport(false)}
        columns={exportColumns}
        data={exportData}
        paginatedData={paginatedExportData}
        selectedData={selectedExportData}
        fileName={txt('chuongTrinhNam.stats.exportFileName')}
        visibleColumnKeys={exportColumns.map((c) => c.key)}
      />
    </div>
  );
};

export default ChuongTrinhNamStatsPanel;
