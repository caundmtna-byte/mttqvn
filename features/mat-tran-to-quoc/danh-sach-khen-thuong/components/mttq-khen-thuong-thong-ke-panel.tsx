import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { FileText, Users, BarChart3 } from 'lucide-react';
import { txt } from '@/lib/text';
import { StatsKpiGrid, StatsCard, StatsTableCard } from '@/components/shared/stats';
import ChartTooltip from '@/components/ui/ChartTooltip';
import type { MttqKhenThuongListRow } from '../core/types';
import {
  computeKhenThuongKpis,
  aggregateKhenThuongByTrangThai,
  aggregateKhenThuongByNam,
  aggregateKhenThuongTopDonVi,
} from '../utils/aggregate-mttq-khen-thuong-stats';

const DON_VI_NONE_ID = '__none__';

interface Props {
  rows: MttqKhenThuongListRow[];
  isLoading: boolean;
}

const MttqKhenThuongThongKePanel: React.FC<Props> = ({ rows, isLoading }) => {
  const kpis = useMemo(() => computeKhenThuongKpis(rows), [rows]);
  const byTrangThai = useMemo(() => aggregateKhenThuongByTrangThai(rows), [rows]);
  const byNam = useMemo(() => aggregateKhenThuongByNam(rows), [rows]);
  const topDonVi = useMemo(() => aggregateKhenThuongTopDonVi(rows, 10), [rows]);

  const topDonViRows = useMemo(
    () =>
      topDonVi.map((r) => ({
        id: r.id,
        label: r.id === DON_VI_NONE_ID ? txt('matTranKhenThuong.filter.donViNone') : r.label,
        value: r.value,
      })),
    [topDonVi],
  );

  const kpiItems = useMemo(
    () => [
      {
        id: 'qd',
        label: txt('matTranKhenThuong.stats.kpiTotalQd'),
        value: kpis.totalQuyetDinh,
        icon: FileText,
        bg: 'bg-teal-500/10',
        color: 'text-teal-600 dark:text-teal-400',
        delta: null,
      },
      {
        id: 'nguoi',
        label: txt('matTranKhenThuong.stats.kpiTotalNguoi'),
        value: kpis.totalSoDong,
        icon: Users,
        bg: 'bg-rose-500/10',
        color: 'text-rose-600 dark:text-rose-400',
        delta: null,
      },
    ],
    [kpis],
  );

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{txt('matTranKhenThuong.stats.loading')}</p>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-12 text-center space-y-2">
        <p className="text-sm font-medium text-foreground">{txt('matTranKhenThuong.stats.noData')}</p>
        <p className="text-xs text-muted-foreground">{txt('matTranKhenThuong.stats.noDataHint')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
      <StatsKpiGrid items={kpiItems} columns={2} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title={txt('matTranKhenThuong.stats.chartTrangThai')} icon={BarChart3} spanTwo={false}>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={byTrangThai} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={56} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="count"
                  name={txt('matTranKhenThuong.stats.colValue')}
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatsCard>

        <StatsCard title={txt('matTranKhenThuong.stats.chartNam')} icon={BarChart3}>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={byNam} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Bar
                  dataKey="count"
                  name={txt('matTranKhenThuong.stats.colValue')}
                  fill="hsl(173 58% 39%)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatsCard>
      </div>

      <StatsTableCard
        title={txt('matTranKhenThuong.stats.tableTopDonVi')}
        rows={topDonViRows.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
        columnLabelKey="matTranKhenThuong.stats.colLabel"
        columnValueKey="matTranKhenThuong.stats.colValue"
        emptyKey="matTranKhenThuong.stats.noData"
        maxHeight="max-h-[260px]"
      />
    </div>
  );
};

export default MttqKhenThuongThongKePanel;
