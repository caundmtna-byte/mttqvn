import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { txt } from '@/lib/text';
import { formatCurrency } from '@/lib/utils';
import type { CommissionSeriesPoint } from '../utils/aggregate-commission';

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(199 89% 48%)',
  'hsl(142 71% 45%)',
  'hsl(38 92% 50%)',
  'hsl(280 65% 60%)',
  'hsl(0 72% 51%)',
  'hsl(210 40% 50%)',
  'hsl(30 80% 55%)',
];

function TooltipMoney({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value?: number; name?: string }[];
}) {
  if (!active || !payload?.length) return null;
  const v = payload[0]?.value;
  if (v == null || !Number.isFinite(Number(v))) return null;
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1 text-xs shadow-md">
      {payload[0]?.name != null && <div className="text-muted-foreground mb-0.5">{String(payload[0].name)}</div>}
      {formatCurrency(Number(v))}
    </div>
  );
}

function TooltipMoneyCount({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: { total?: number; count?: number } }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="rounded-md border border-border bg-card px-2 py-1 text-xs shadow-md space-y-0.5">
      <div>{formatCurrency(p.total ?? 0)}</div>
      <div className="text-muted-foreground">
        {txt('articleCommission.axisCount')}: {p.count ?? 0}
      </div>
    </div>
  );
}

export const CommissionTrendChart: React.FC<{ series: CommissionSeriesPoint[] }> = ({ series }) => {
  const data = useMemo(
    () => series.map((s) => ({ label: s.label, total: s.total, count: s.count })),
    [series],
  );
  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{txt('articleCommission.noData')}</p>;
  }
  return (
    <div className="h-[260px] w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : String(v))}
          />
          <Tooltip content={(p) => <TooltipMoney active={p.active} payload={p.payload as { value?: number; name?: string}[]} />} />
          <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CommissionByTheLoaiChart: React.FC<{ series: CommissionSeriesPoint[] }> = ({ series }) => {
  const otherLabel = txt('articleCommission.chartOtherSlice');
  const data = useMemo(() => {
    const top = series.slice(0, 8);
    const rest = series.slice(8);
    if (rest.length === 0) return top.map((s) => ({ name: s.label, value: s.total, count: s.count }));
    const otherTotal = rest.reduce((a, s) => a + s.total, 0);
    const otherCount = rest.reduce((a, s) => a + s.count, 0);
    if (otherTotal <= 0 && otherCount <= 0) {
      return top.map((s) => ({ name: s.label, value: s.total, count: s.count }));
    }
    return [
      ...top.map((s) => ({ name: s.label, value: s.total, count: s.count })),
      { name: otherLabel, value: otherTotal, count: otherCount },
    ];
  }, [series, otherLabel]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{txt('articleCommission.noData')}</p>;
  }

  return (
    <div className="h-[260px] w-full min-h-[200px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={88}
            paddingAngle={1}
            label={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatCurrency(typeof value === 'number' ? value : Number(value) || 0)}
            contentStyle={{ fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const CommissionByAuthorChart: React.FC<{ series: CommissionSeriesPoint[] }> = ({ series }) => {
  const data = useMemo(() => {
    const top = series.slice(0, 12).map((s) => ({
      name: s.label.length > 20 ? `${s.label.slice(0, 18)}…` : s.label,
      total: s.total,
      count: s.count,
    }));
    return [...top].reverse();
  }, [series]);

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{txt('articleCommission.noData')}</p>;
  }

  return (
    <div className="h-[280px] w-full min-h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" tickFormatter={(v) => String(v)} />
          <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} className="text-muted-foreground" />
          <Tooltip content={<TooltipMoneyCount />} />
          <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
