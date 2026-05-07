import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { txt } from '@/lib/text';
import ChartTooltip from '@/components/ui/ChartTooltip';
import type {
  TaskReportEnumCount,
  TaskReportPersonRow,
  TaskReportTrendPoint,
} from '../core/types';
import type {
  CongViecMucDo,
  CongViecTrangThai,
} from '@/features/quan-ly-giao-viec/cong-viec/core/constants';

/* ------------------------------------------------------------------ */
/*  Color palette - khớp badge config trong cong-viec/display-badges  */
/* ------------------------------------------------------------------ */

/** sky / blue / emerald / amber / rose */
const TRANG_THAI_COLORS: Record<CongViecTrangThai, string> = {
  Mới: 'hsl(199 89% 48%)',
  'Đang thực hiện': 'hsl(217 91% 60%)',
  'Hoàn thành': 'hsl(142 71% 45%)',
  'Tạm dừng': 'hsl(38 92% 50%)',
  Hủy: 'hsl(0 72% 51%)',
};

/** slate / blue / amber / rose */
const MUC_DO_COLORS: Record<CongViecMucDo, string> = {
  Thấp: 'hsl(215 20% 55%)',
  'Trung bình': 'hsl(217 91% 60%)',
  Cao: 'hsl(38 92% 50%)',
  Khẩn: 'hsl(0 72% 51%)',
};

const COLOR_DONE = 'hsl(142 71% 45%)';
const COLOR_DOING = 'hsl(217 91% 60%)';
const COLOR_OVERDUE = 'hsl(0 72% 51%)';

/* ------------------------------------------------------------------ */
/*  Components                                                         */
/* ------------------------------------------------------------------ */

const EmptyState: React.FC<{ height?: number }> = ({ height = 240 }) => (
  <div
    className="flex items-center justify-center text-sm text-muted-foreground"
    style={{ height }}
  >
    {txt('taskReport.noData')}
  </div>
);

export const TrendChart: React.FC<{ data: TaskReportTrendPoint[] }> = ({ data }) => {
  const isEmpty = data.every((d) => d.created === 0 && d.done === 0 && d.overdue === 0);
  if (data.length === 0 || isEmpty) return <EmptyState />;

  return (
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <RechartsTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line
            type="monotone"
            dataKey="created"
            name={txt('taskReport.chartTrendCreated')}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="done"
            name={txt('taskReport.chartTrendDone')}
            stroke={COLOR_DONE}
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="overdue"
            name={txt('taskReport.chartTrendOverdue')}
            stroke={COLOR_OVERDUE}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TrangThaiPieChart: React.FC<{ data: TaskReportEnumCount<CongViecTrangThai>[] }> = ({
  data,
}) => {
  const chart = useMemo(
    () => data.filter((d) => d.count > 0).map((d) => ({ name: d.value, value: d.count })),
    [data],
  );
  if (chart.length === 0) return <EmptyState />;

  return (
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chart}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={88}
            innerRadius={48}
            paddingAngle={2}
            label={false}
          >
            {chart.map((row, i) => (
              <Cell
                key={i}
                fill={TRANG_THAI_COLORS[row.name as CongViecTrangThai] ?? 'hsl(215 20% 55%)'}
              />
            ))}
          </Pie>
          <RechartsTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MucDoBarChart: React.FC<{ data: TaskReportEnumCount<CongViecMucDo>[] }> = ({
  data,
}) => {
  const chart = useMemo(
    () => data.filter((d) => d.count > 0).map((d) => ({ name: d.value, count: d.count })),
    [data],
  );
  if (chart.length === 0) return <EmptyState />;

  return (
    <div className="h-[260px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
          <RechartsTooltip content={<ChartTooltip />} />
          <Bar dataKey="count" name={txt('taskReport.chartPhanBoMucDo')} radius={[4, 4, 0, 0]}>
            {chart.map((row, i) => (
              <Cell
                key={i}
                fill={MUC_DO_COLORS[row.name as CongViecMucDo] ?? 'hsl(215 20% 55%)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const TopTrachNhiemChart: React.FC<{ data: TaskReportPersonRow[] }> = ({ data }) => {
  const chart = useMemo(() => {
    const top = data.slice(0, 10).map((r) => ({
      name:
        (r.ho_va_ten ?? r.ten_tai_khoan ?? r.id).length > 18
          ? `${(r.ho_va_ten ?? r.ten_tai_khoan ?? r.id).slice(0, 16)}…`
          : (r.ho_va_ten ?? r.ten_tai_khoan ?? r.id),
      hoan_thanh: r.hoan_thanh,
      dang: r.dang ?? 0,
      qua_han: r.qua_han,
    }));
    return top.reverse();
  }, [data]);

  if (chart.length === 0) return <EmptyState height={280} />;

  return (
    <div className="h-[300px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chart}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
          <RechartsTooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar
            dataKey="hoan_thanh"
            name={txt('taskReport.chartTrendDone')}
            stackId="a"
            fill={COLOR_DONE}
            maxBarSize={20}
          />
          <Bar
            dataKey="dang"
            name={txt('taskReport.kpiDang')}
            stackId="a"
            fill={COLOR_DOING}
            maxBarSize={20}
          />
          <Bar
            dataKey="qua_han"
            name={txt('taskReport.chartTrendOverdue')}
            stackId="a"
            fill={COLOR_OVERDUE}
            maxBarSize={20}
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
