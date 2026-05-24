import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { BarChart3, TrendingUp, Users } from 'lucide-react';
import { txt } from '@/lib/text';
import { StatsKpiGrid, StatsCard, StatsTableCard, ColoredBar } from '@/components/shared/stats';
import ChartTooltip from '@/components/ui/ChartTooltip';
import { chartFillByIndex, chartFillFromBadgeConfig } from '@/lib/constants/chart-colors';
import { getTangLuongLoaiKyBadgeConfig } from '../utils/display-format';
import type { MttqTangLuongListRow } from '../core/types';
import {
  aggregateByLoaiKy,
  aggregateByMonth,
  aggregateByNgachMoi,
  aggregateByPhongBan,
  aggregatePlanVsDone,
  computeTangLuongKpis,
  filterRowsForStats,
} from '../utils/aggregate-tang-luong-stats';

const loaiKyBadgeConfig = getTangLuongLoaiKyBadgeConfig();

interface Props {
  rows: MttqTangLuongListRow[];
  statsYear: number;
  loaiKy?: string[];
  phongBanIds?: string[];
  isLoading: boolean;
}

const MttqTangLuongThongKePanel: React.FC<Props> = ({
  rows,
  statsYear,
  loaiKy,
  phongBanIds,
  isLoading,
}) => {
  const scoped = useMemo(
    () => filterRowsForStats(rows, { year: statsYear, loaiKy, phongBanIds }),
    [rows, statsYear, loaiKy, phongBanIds],
  );
  const kpis = useMemo(() => computeTangLuongKpis(scoped, statsYear), [scoped, statsYear]);
  const byLoaiKy = useMemo(() => aggregateByLoaiKy(scoped), [scoped]);
  const byMonth = useMemo(() => aggregateByMonth(scoped, statsYear), [scoped, statsYear]);
  const byPhongBan = useMemo(() => aggregateByPhongBan(scoped), [scoped]);
  const byNgach = useMemo(() => aggregateByNgachMoi(scoped), [scoped]);
  const planVsDone = useMemo(() => aggregatePlanVsDone(rows, statsYear), [rows, statsYear]);

  const kpiItems = useMemo(
    () => [
      {
        id: 'rec',
        label: txt('matTranTangLuong.stats.kpiTotalRecords'),
        value: kpis.totalRecords,
        icon: TrendingUp,
        bg: 'bg-primary/10',
        color: 'text-primary',
        delta: null,
      },
      {
        id: 'cb',
        label: txt('matTranTangLuong.stats.kpiTotalCanBo'),
        value: kpis.totalCanBo,
        icon: Users,
        bg: 'bg-violet-500/10',
        color: 'text-violet-600 dark:text-violet-400',
        delta: null,
      },
      {
        id: 'due',
        label: txt('matTranTangLuong.stats.kpiDueInYear'),
        value: kpis.dueInYear,
        icon: BarChart3,
        bg: 'bg-amber-500/10',
        color: 'text-amber-700 dark:text-amber-400',
        delta: null,
      },
      {
        id: 'done',
        label: txt('matTranTangLuong.stats.kpiDoneInYear'),
        value: kpis.doneInYear,
        icon: BarChart3,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
    ],
    [kpis],
  );

  const planChart = useMemo(
    () => [
      { name: txt('matTranTangLuong.stats.planDue'), value: planVsDone.due },
      { name: txt('matTranTangLuong.stats.planDone'), value: planVsDone.done },
      { name: txt('matTranTangLuong.stats.planPending'), value: planVsDone.pending },
    ],
    [planVsDone],
  );

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{txt('matTranTangLuong.stats.loading')}</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center space-y-2">
        <p className="text-sm font-medium">{txt('matTranTangLuong.stats.noData')}</p>
        <p className="text-xs text-muted-foreground">{txt('matTranTangLuong.stats.noDataHint')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
      <StatsKpiGrid items={kpiItems} columns={4} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title={txt('matTranTangLuong.stats.chartLoaiKy')} icon={BarChart3}>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={byLoaiKy} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RechartsTooltip content={<ChartTooltip />} />
                <ColoredBar
                  data={byLoaiKy}
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  getFill={(row) =>
                    chartFillFromBadgeConfig(loaiKyBadgeConfig, (row as { id: string }).id)
                  }
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatsCard>

        <StatsCard title={txt('matTranTangLuong.stats.chartPlanVsDone')} icon={TrendingUp}>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={planChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RechartsTooltip content={<ChartTooltip />} />
                <ColoredBar
                  data={planChart}
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  getFill={(_, i) => chartFillByIndex(i)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatsCard>

        <StatsCard title={txt('matTranTangLuong.stats.chartMonth')} icon={BarChart3} spanTwo={false}>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={byMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <RechartsTooltip content={<ChartTooltip />} />
                <ColoredBar
                  data={byMonth}
                  dataKey="value"
                  radius={[4, 4, 0, 0]}
                  getFill={(_, i) => chartFillByIndex(i)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatsCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsTableCard
          title={txt('matTranTangLuong.stats.chartPhongBan')}
          rows={byPhongBan.map((r) => ({ id: r.id, label: r.label, value: r.value }))}
        />
        <StatsTableCard
          title={txt('matTranTangLuong.stats.chartNgach')}
          rows={byNgach.map((r) => ({ id: r.id, label: r.label, value: r.value }))}
        />
      </div>
    </div>
  );
};

export default MttqTangLuongThongKePanel;
