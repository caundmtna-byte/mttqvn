import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { txt } from '../../../../lib/text';
import {
  Users, Building2, Tag, TrendingUp, PieChart as PieChartIcon, BarChart3, Inbox,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from 'recharts';
import { toast } from 'sonner';
import MultiSelect from '../../../../components/ui/MultiSelect';
import DateRangePicker from '../../../../components/ui/DateRangePicker';
import DashboardToolbar from '../../../../components/shared/DashboardToolbar';
import LoadingSpinnerWithText from '../../../../components/shared/LoadingSpinnerWithText';
import ChartTooltip from '../../../../components/ui/ChartTooltip';
import { useDepartments } from '../../phong-ban/hooks/use-phong-ban';
import { useAuthStore } from '../../../../store/useStore';
import { Employee } from '../core/types';
import { STATUS_OPTIONS } from '../core/constants';
import {
  DATE_RANGE_PRESETS,
  DEFAULT_KPI_IDS,
  STATS_KPI_STORAGE_KEY,
  STATS_CHART_HEIGHT,
  STATS_CHART_HEIGHT_MOBILE,
  getDeptStatsTableScrollMaxHeightCss,
  type DateRangePresetId,
} from '../core/stats-constants';
import { useMediaQuery } from '../../../../lib/use-media-query';
import { getDateRangeFromPreset } from '../utils/stats-date-range';
import { clampDateRangeForRole, canExportStats } from '../utils/stats-permissions';
import { useEmployeeStats } from '../hooks/use-employee-stats';
import { exportStatsToExcel, exportStatsToPdf } from '../utils/export-stats-report';
import { cn, formatDateTime } from '../../../../lib/utils';
import { usePrimaryColor } from '../../../../lib/theme-utils';
import StatsTrendBadge from './StatsTrendBadge';
import StatsExportDropdown from './StatsExportDropdown';
import StatsKpiConfigPopover from './StatsKpiConfigPopover';

interface EmployeeStatsProps {
  employees: Employee[];
  isLoading: boolean;
  /** Desktop: TabGroup ngay sau nút Back trên toolbar thống kê */
  desktopToolbarStart?: React.ReactNode;
  /** Drill-down: switch to list tab with dept filter applied */
  onDrillDownDept?: (deptId: string) => void;
  /** Drill-down: switch to list tab with status filter applied */
  onDrillDownStatus?: (status: string) => void;
}

function loadVisibleKpiIds(): string[] {
  try {
    const raw = localStorage.getItem(STATS_KPI_STORAGE_KEY);
    if (!raw) return [...DEFAULT_KPI_IDS];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_KPI_IDS];
  } catch {
    return [...DEFAULT_KPI_IDS];
  }
}

const EmployeeStats: React.FC<EmployeeStatsProps> = ({
  employees,
  isLoading,
  desktopToolbarStart,
  onDrillDownDept,
  onDrillDownStatus,
}) => {
  const { data: departments = [] } = useDepartments();
  const userRole = useAuthStore((s) => s.user?.role);
  const { hex: primaryHex } = usePrimaryColor();
  const isMdUp = useMediaQuery('(min-width: 768px)');
  const chartHeight = isMdUp ? STATS_CHART_HEIGHT : STATS_CHART_HEIGHT_MOBILE;

  const [filterDept, setFilterDept] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePresetId>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [chartsVisible, setChartsVisible] = useState(false);
  const [visibleKpiIds, setVisibleKpiIds] = useState<string[]>(loadVisibleKpiIds);

  const dateRange = useMemo(() => {
    const range = getDateRangeFromPreset(
      dateRangePreset,
      customStart ? new Date(customStart) : undefined,
      customEnd ? new Date(customEnd) : undefined
    );
    return clampDateRangeForRole(range, userRole);
  }, [dateRangePreset, customStart, customEnd, userRole]);

  const {
    filtered,
    trends,
    deptData,
    statusData,
    hiringData,
    genderData,
    deptSummary,
    miniSummary,
    kpis,
    DEPT_COLORS,
  } = useEmployeeStats({
    employees,
    filterDept,
    filterStatus,
    dateRange,
    visibleKpiIds,
  });

  useEffect(() => {
    const timer = setTimeout(() => setChartsVisible(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const departmentOptions = departments.map((d) => ({ label: d.ten_phong_ban, value: d.id }));
  const statusOptions = STATUS_OPTIONS.map((s) => ({ label: s.label, value: String(s.value) }));
  const statsActiveFilterCount = (filterDept.length > 0 ? 1 : 0) + (filterStatus.length > 0 ? 1 : 0);
  const handleClearStatsFilters = () => {
    setFilterDept([]);
    setFilterStatus([]);
  };

  const statsFilterGroups = useMemo(
    () => [
      {
        key: 'dept',
        label: txt('employee.stats.department'),
        icon: Building2,
        options: departmentOptions,
        value: filterDept,
        onChange: (val: string[]) => setFilterDept(val),
      },
      {
        key: 'status',
        label: txt('employee.stats.status'),
        icon: Tag,
        options: statusOptions,
        value: filterStatus,
        onChange: (val: string[]) => setFilterStatus(val),
      },
    ],
    [departmentOptions, statusOptions, filterDept, filterStatus]
  );

  const handleExportReport = useCallback(
    async (format: 'excel' | 'pdf') => {
      if (!canExportStats(userRole)) return;
      const exportedAt = formatDateTime(new Date());
      const filterDeptLabels = filterDept.map(
        (id) => departments.find((d) => d.id === id)?.ten_phong_ban ?? id
      );
      const filterStatusLabels = filterStatus.map(
        (v) => STATUS_OPTIONS.find((s) => String(s.value) === v)?.label ?? v
      );
      const meta = {
        dateRangeLabel: dateRange.label,
        filterDeptLabels,
        filterStatusLabels,
        exportedAt,
      };
      try {
        if (format === 'excel') {
          await exportStatsToExcel(meta, kpis, deptSummary);
        } else {
          await exportStatsToPdf(meta, kpis, deptSummary);
        }
        toast.success(txt('employee.stats.exportSuccess'), {
          description: txt('employee.stats.exportSuccessDesc'),
        });
      } catch {
        toast.error(txt('employee.stats.exportError'));
      }
    },
    [userRole, filterDept, filterStatus, dateRange.label, departments, kpis, deptSummary]
  );

  const handleToggleKpi = (id: string) => {
    const next = visibleKpiIds.includes(id)
      ? visibleKpiIds.filter((k) => k !== id)
      : [...visibleKpiIds, id];
    if (next.length === 0) return;
    setVisibleKpiIds(next);
    localStorage.setItem(STATS_KPI_STORAGE_KEY, JSON.stringify(next));
  };

  const deptIdByName = useMemo(() => {
    const m: Record<string, string> = {};
    departments.forEach((d) => {
      m[d.ten_phong_ban] = d.id;
    });
    return m;
  }, [departments]);

  const dateRangePickerPresets = DATE_RANGE_PRESETS.map((p) => ({ id: p.id, label: p.label }));

  const renderFilters = (
    <>
      <DateRangePicker
        presets={dateRangePickerPresets}
        value={{ preset: dateRangePreset, customStart, customEnd }}
        onChange={(v) => {
          setDateRangePreset(v.preset as DateRangePresetId);
          setCustomStart(v.customStart);
          setCustomEnd(v.customEnd);
        }}
        displayLabel={dateRange.label}
      />
      <MultiSelect
        options={departmentOptions}
        value={filterDept}
        onChange={setFilterDept}
        icon={Building2}
        placeholder={txt('employee.stats.department')}
        className="w-[150px]"
      />
      <MultiSelect
        options={statusOptions}
        value={filterStatus}
        onChange={setFilterStatus}
        icon={Tag}
        placeholder={txt('employee.stats.status')}
        className="w-[140px]"
      />
    </>
  );

  const renderExportAction = canExportStats(userRole) ? (
    <StatsExportDropdown onExport={handleExportReport} compact={false} />
  ) : null;

  const renderMobileExportAction = canExportStats(userRole) ? (
    <StatsExportDropdown onExport={handleExportReport} compact />
  ) : null;

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-y-auto">
        <div className="shrink-0 py-3 px-3 sm:px-4 border-b border-border/50 bg-muted/20">
          <LoadingSpinnerWithText text={txt('employee.stats.loading')} centered />
        </div>
        <div className="flex-1 p-3 sm:p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card rounded-lg border border-border p-2.5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-16 bg-muted/60 rounded" />
                    <div className="h-5 w-10 bg-muted rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-3.5 h-[250px] animate-pulse">
                <div className="h-4 w-32 bg-muted rounded mb-3" />
                <div className="h-[200px] bg-muted/30 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = filtered.length === 0;

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-col">
      <DashboardToolbar
        desktopStartSlot={desktopToolbarStart}
        filters={renderFilters}
        actions={
          <div className="flex items-center gap-2">
            <StatsKpiConfigPopover visibleKpiIds={visibleKpiIds} onToggle={handleToggleKpi} />
            {renderExportAction}
          </div>
        }
        mobileActions={renderMobileExportAction}
        filterGroups={statsFilterGroups}
        activeFilterCount={statsActiveFilterCount}
        onClearFilters={handleClearStatsFilters}
        className="static z-auto"
      />

      <div className="min-h-0 min-w-0 w-full flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
        <div className="min-w-0 max-w-full space-y-3 p-3 sm:p-4 pb-4">
          {isEmpty ? (
            <div className="bg-card rounded-xl border border-border p-8 text-center">
              <Inbox size={40} className="mx-auto text-muted-foreground/60 mb-3" />
              <h3 className="text-sm font-semibold text-foreground mb-1">{txt('employee.stats.noData')}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {statsActiveFilterCount > 0
                  ? txt('employee.stats.noDataHint')
                  : txt('employee.stats.noEmployeeInPeriod')}
              </p>
              {statsActiveFilterCount > 0 && (
                <button
                  onClick={handleClearStatsFilters}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {txt('employee.stats.clearFilters')}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {kpis.map((kpi) => (
                  <div
                    key={kpi.id}
                    className="bg-card rounded-lg border border-border p-2.5 sm:p-3 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                          kpi.bg
                        )}
                      >
                        {React.createElement(kpi.icon as React.ComponentType<{ size?: number; className?: string }>, {
                          size: 15,
                          className: kpi.color,
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{kpi.label}</p>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="text-lg font-bold text-foreground tabular-nums">
                            {kpi.value}
                          </span>
                          {kpi.pct && (
                            <span className="text-xs font-medium text-muted-foreground tabular-nums">
                              {kpi.pct}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {kpi.delta !== null && (
                      <div className="mt-1.5 pl-[42px]">
                        <StatsTrendBadge delta={kpi.delta} />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-0.5 flex-wrap">
                <span>
                  {txt('employee.stats.newHiresInPeriod')} <strong className="text-foreground font-semibold">{miniSummary.hiredThisMonth}</strong>
                </span>
                <span className="text-border">|</span>
                <span>
                  {txt('employee.stats.genderRatio')} <strong className="text-foreground font-semibold">{miniSummary.maleCount}/{miniSummary.femaleCount}</strong>
                </span>
                {miniSummary.topDept && (
                  <>
                    <span className="text-border">|</span>
                    <span>
                      {txt('employee.stats.largestDepartment')} <strong className="text-foreground font-semibold">{miniSummary.topDept.name} ({miniSummary.topDept.value})</strong>
                    </span>
                  </>
                )}
                {(trends.totalYoY !== undefined || trends.activeYoY !== undefined) && (
                  <>
                    <span className="text-border">|</span>
                    <span>
                      {txt('employee.stats.comparedLastYear')}{' '}
                      <strong className={trends.totalYoY != null && trends.totalYoY >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}>
                        {trends.totalYoY != null ? (trends.totalYoY >= 0 ? `+${trends.totalYoY}` : trends.totalYoY) : '—'}
                      </strong>
                      {trends.activeYoY != null && (
                        <>
                          {' '}
                          · {txt('employee.stats.workingShort')}{' '}
                          <strong className={trends.activeYoY >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}>
                            {trends.activeYoY >= 0 ? `+${trends.activeYoY}` : trends.activeYoY}
                          </strong>
                        </>
                      )}
                    </span>
                  </>
                )}
              </div>

              {chartsVisible && (
                <div className="space-y-2">
                  {(onDrillDownDept || onDrillDownStatus) && (
                    <p className="text-[11px] text-muted-foreground leading-snug px-0.5">
                      {txt('employee.stats.chartDrillDownHint')}
                    </p>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {deptData.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-3.5">
                      <div className="flex items-center gap-2 mb-3">
                        <PieChartIcon size={14} className="text-primary" aria-hidden />
                        <h3 className="text-xs font-semibold text-foreground">{txt('employee.stats.departmentChart')}</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={chartHeight}>
                        <PieChart>
                          <Pie
                            data={deptData}
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            innerRadius={38}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                            onClick={(data: { name: string }) => {
                              const id = deptIdByName[data.name];
                              if (id && onDrillDownDept) onDrillDownDept(id);
                            }}
                            style={{ cursor: onDrillDownDept ? 'pointer' : 'default' }}
                          >
                            {deptData.map((_, i) => (
                              <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend
                            wrapperStyle={{ fontSize: '11px' }}
                            formatter={(value: string) => (
                              <span className="text-muted-foreground text-caption">{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="bg-card rounded-xl border border-border p-3.5">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 size={14} className="text-primary" />
                      <h3 className="text-xs font-semibold text-foreground">{txt('employee.stats.statusChart')}</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <BarChart data={statusData} barSize={isMdUp ? 32 : 28}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar
                          dataKey="value"
                          radius={[6, 6, 0, 0]}
                          name={txt('employee.stats.quantity')}
                          onClick={(data: { key?: string }) => {
                            if (data.key != null && onDrillDownStatus) onDrillDownStatus(data.key);
                          }}
                          style={{ cursor: onDrillDownStatus ? 'pointer' : 'default' }}
                        >
                          {statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-card rounded-xl border border-border p-3.5 md:col-span-2">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={14} className="text-primary" />
                      <h3 className="text-xs font-semibold text-foreground">{txt('employee.stats.trendChart')}</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={chartHeight}>
                      <AreaChart data={hiringData}>
                        <defs>
                          <linearGradient id="colorHire" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={primaryHex} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={primaryHex} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name={txt('employee.stats.newHires')}
                          stroke={primaryHex}
                          strokeWidth={2}
                          fill="url(#colorHire)"
                          dot={{ r: 3, fill: primaryHex, strokeWidth: 0 }}
                          activeDot={{ r: 5, fill: primaryHex, stroke: '#fff', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {genderData.length > 0 && (
                    <div className="bg-card rounded-xl border border-border p-3.5">
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={14} className="text-pink-500" />
                        <h3 className="text-xs font-semibold text-foreground">{txt('employee.stats.genderChart')}</h3>
                      </div>
                      <ResponsiveContainer width="100%" height={chartHeight}>
                        <PieChart>
                          <Pie
                            data={genderData}
                            cx="50%"
                            cy="50%"
                            outerRadius={isMdUp ? 75 : 70}
                            innerRadius={isMdUp ? 42 : 38}
                            paddingAngle={3}
                            dataKey="value"
                            stroke="none"
                            label={
                              isMdUp
                                ? ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`
                                : false
                            }
                            labelLine={false}
                          >
                            {genderData.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<ChartTooltip />} />
                          <Legend
                            wrapperStyle={{ fontSize: '11px' }}
                            formatter={(value: string) => (
                              <span className="text-muted-foreground text-caption">{value}</span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  </div>
                </div>
              )}

              {deptSummary.length > 0 && (
                <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card">
                  <div className="border-b border-border px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 size={14} className="text-primary" aria-hidden />
                      <h3 className="text-xs font-semibold text-foreground">{txt('employee.stats.departmentTable')}</h3>
                    </div>
                  </div>
                  <div
                    className="max-w-full min-w-0 w-full overflow-x-auto overflow-y-auto overscroll-x-contain overscroll-y-contain [-webkit-overflow-scrolling:touch] touch-pan-x touch-pan-y rounded-b-xl custom-scrollbar"
                    style={{ maxHeight: getDeptStatsTableScrollMaxHeightCss() }}
                    role="region"
                    aria-label={txt('employee.stats.departmentTable')}
                  >
                    <table className="w-full min-w-[36rem] text-xs border-separate border-spacing-0">
                      <thead>
                        <tr className="border-b border-border">
                          <th
                            scope="col"
                            className="sticky top-0 left-0 z-[5] min-w-[9rem] max-w-[14rem] text-left px-4 py-2 font-medium text-muted-foreground bg-muted border-b border-r border-border"
                          >
                            {txt('employee.stats.department')}
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-[4] text-center px-3 py-2 font-medium text-muted-foreground bg-muted border-b border-border"
                          >
                            {txt('employee.stats.total')}
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-[4] text-center px-3 py-2 font-medium text-muted-foreground bg-muted border-b border-border"
                          >
                            {txt('employee.stats.workingShort')}
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-[4] text-center px-3 py-2 font-medium text-muted-foreground bg-muted border-b border-border"
                          >
                            {txt('employee.stats.probation')}
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-[4] text-center px-3 py-2 font-medium text-muted-foreground bg-muted border-b border-border"
                          >
                            {txt('employee.stats.leave')}
                          </th>
                          <th
                            scope="col"
                            className="sticky top-0 z-[4] text-center px-3 py-2 font-medium text-muted-foreground bg-muted border-b border-border"
                          >
                            {txt('employee.stats.activeRate')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {deptSummary.map((row) => {
                          const deptId = deptIdByName[row.name];
                          return (
                            <tr
                              key={row.name}
                              className={cn(
                                'group border-b border-border/50 transition-colors',
                                'hover:bg-muted/20',
                                onDrillDownDept && deptId && 'cursor-pointer'
                              )}
                              onClick={() => deptId && onDrillDownDept?.(deptId)}
                            >
                              <td
                                className={cn(
                                  'sticky left-0 z-[2] px-4 py-2 font-medium text-foreground bg-card border-r border-border',
                                  'group-hover:bg-muted/20 max-w-[14rem] truncate sm:max-w-none sm:whitespace-normal'
                                )}
                                title={row.name}
                              >
                                {row.name}
                              </td>
                              <td className="text-center px-3 py-2 font-semibold text-foreground tabular-nums group-hover:bg-muted/20">
                                {row.total}
                              </td>
                              <td className="text-center px-3 py-2 text-emerald-600 dark:text-emerald-400 font-medium tabular-nums group-hover:bg-muted/20">
                                {row.active}
                              </td>
                              <td className="text-center px-3 py-2 text-blue-600 dark:text-blue-400 font-medium tabular-nums group-hover:bg-muted/20">
                                {row.probation}
                              </td>
                              <td className="text-center px-3 py-2 text-muted-foreground tabular-nums group-hover:bg-muted/20">
                                {row.inactive}
                              </td>
                              <td className="text-center px-3 py-2 group-hover:bg-muted/20">
                                <div className="flex items-center justify-center gap-1.5">
                                  <div className="w-14 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-primary rounded-full"
                                      style={{ width: `${row.rate}%` }}
                                    />
                                  </div>
                                  <span className="text-muted-foreground tabular-nums font-medium">
                                    {row.rate}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeStats;
