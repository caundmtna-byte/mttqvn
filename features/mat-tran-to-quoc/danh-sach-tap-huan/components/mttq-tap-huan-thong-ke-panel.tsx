import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { BookOpen, Users, BarChart3, ShieldAlert } from 'lucide-react';
import { txt } from '@/lib/text';
import { StatsKpiGrid, StatsCard, StatsTableCard, ColoredBar } from '@/components/shared/stats';
import ChartTooltip from '@/components/ui/ChartTooltip';
import { chartFillByIndex, chartFillFromBadgeConfig } from '@/lib/constants/chart-colors';
import { getTapHuanCapBadgeConfig, getTapHuanThuocDienBadgeConfig } from '../utils/display-format';
import type { MttqLopTapHuanListRow, MttqTapHuanChiTietFlatRow } from '../core/types';
import {
  isTapHuanUngVienScopedToXaPhuong,
  type MttqLopTapHuanViewer,
} from '../hooks/use-mttq-tap-huan-viewer';
import {
  computeTapHuanKpisScoped,
  aggregateTapHuanByCap,
  aggregateTapHuanByNam,
  aggregateTapHuanTopDonViLop,
  aggregateTapHuanByThuocDien,
  aggregateTapHuanTopTenLop,
  aggregateTapHuanByCapFromFlat,
  aggregateTapHuanByNamFromFlat,
  aggregateTapHuanTopDonViLopFromFlat,
  aggregateTapHuanTopTenLopFromFlat,
} from '../utils/aggregate-mttq-tap-huan-stats';

const DON_VI_NONE_ID = '__none__';

const capBadgeConfig = getTapHuanCapBadgeConfig();
const thuocDienBadgeConfig = getTapHuanThuocDienBadgeConfig();

interface Props {
  rows: MttqLopTapHuanListRow[];
  /** Dòng CT trong phạm vi các lớp đã lọc — đồng bộ tab Danh sách CT + quyền xem. */
  flatRows: MttqTapHuanChiTietFlatRow[];
  viewer: MttqLopTapHuanViewer;
  isLoading: boolean;
  isLoadingFlat: boolean;
}

const MttqTapHuanThongKePanel: React.FC<Props> = ({ rows, flatRows, viewer, isLoading, isLoadingFlat }) => {
  const statsFromFlat = isTapHuanUngVienScopedToXaPhuong(viewer);

  const kpis = useMemo(() => computeTapHuanKpisScoped(rows, flatRows), [rows, flatRows]);
  const byCap = useMemo(
    () => (statsFromFlat ? aggregateTapHuanByCapFromFlat(flatRows) : aggregateTapHuanByCap(rows)),
    [statsFromFlat, rows, flatRows],
  );
  const byNam = useMemo(
    () => (statsFromFlat ? aggregateTapHuanByNamFromFlat(flatRows) : aggregateTapHuanByNam(rows)),
    [statsFromFlat, rows, flatRows],
  );
  const byThuocDien = useMemo(() => aggregateTapHuanByThuocDien(flatRows), [flatRows]);
  const topDonVi = useMemo(
    () =>
      statsFromFlat ? aggregateTapHuanTopDonViLopFromFlat(flatRows, 10) : aggregateTapHuanTopDonViLop(rows, 10),
    [statsFromFlat, rows, flatRows],
  );
  const topLop = useMemo(
    () => (statsFromFlat ? aggregateTapHuanTopTenLopFromFlat(flatRows, 10) : aggregateTapHuanTopTenLop(rows, 10)),
    [statsFromFlat, rows, flatRows],
  );

  const topDonViRows = useMemo(
    () =>
      topDonVi.map((r) => ({
        id: r.id,
        label: r.id === DON_VI_NONE_ID ? txt('matTranTapHuan.tinhCapDefault') : r.label,
        value: r.value,
      })),
    [topDonVi],
  );

  const topLopRows = useMemo(
    () => topLop.map((r) => ({ id: r.id, label: r.label, value: r.value })),
    [topLop],
  );

  const kpiItems = useMemo(
    () => [
      {
        id: 'lop',
        label: txt('matTranTapHuan.stats.kpiTotalLop'),
        value: kpis.totalLop,
        icon: BookOpen,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
      {
        id: 'nguoi',
        label: txt('matTranTapHuan.stats.kpiTotalNguoi'),
        value: kpis.totalNguoi,
        icon: Users,
        bg: 'bg-violet-500/10',
        color: 'text-violet-600 dark:text-violet-400',
        delta: null,
      },
    ],
    [kpis],
  );

  const showScopeHint = statsFromFlat;

  if (isLoading || isLoadingFlat) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">{txt('matTranTapHuan.stats.loading')}</p>
    );
  }

  if (rows.length === 0 && flatRows.length === 0) {
    return (
      <div className="py-12 text-center space-y-2">
        <p className="text-sm font-medium text-foreground">{txt('matTranTapHuan.stats.noData')}</p>
        <p className="text-xs text-muted-foreground">{txt('matTranTapHuan.stats.noDataHint')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
      {showScopeHint ? (
        <div
          role="status"
          className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground"
        >
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <p>{txt('matTranTapHuan.stats.scopeHint')}</p>
        </div>
      ) : null}

      <StatsKpiGrid items={kpiItems} columns={2} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title={txt('matTranTapHuan.stats.chartCap')} icon={BarChart3} spanTwo={false}>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={byCap} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={56} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <RechartsTooltip content={<ChartTooltip />} />
                <ColoredBar
                  data={byCap}
                  dataKey="count"
                  name={txt('matTranTapHuan.stats.colValue')}
                  radius={[4, 4, 0, 0]}
                  getFill={(row) => chartFillFromBadgeConfig(capBadgeConfig, (row as { label: string }).label)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatsCard>

        <StatsCard title={txt('matTranTapHuan.stats.chartNam')} icon={BarChart3}>
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={byNam} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                <RechartsTooltip content={<ChartTooltip />} />
                <ColoredBar
                  data={byNam}
                  dataKey="count"
                  name={txt('matTranTapHuan.stats.colValue')}
                  radius={[4, 4, 0, 0]}
                  getFill={(_, i) => chartFillByIndex(i)}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatsCard>

        <StatsCard title={txt('matTranTapHuan.stats.chartThuocDien')} icon={BarChart3} spanTwo>
          <div className="h-[220px] w-full min-w-0">
            {flatRows.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">{txt('matTranTapHuan.stats.noFlatData')}</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={byThuocDien} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={52} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                  <RechartsTooltip content={<ChartTooltip />} />
                  <ColoredBar
                    data={byThuocDien}
                    dataKey="count"
                    name={txt('matTranTapHuan.stats.colValue')}
                    radius={[4, 4, 0, 0]}
                    getFill={(row) =>
                      chartFillFromBadgeConfig(thuocDienBadgeConfig, (row as { label: string }).label)
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </StatsCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <StatsTableCard
          title={txt('matTranTapHuan.stats.tableTopDonVi')}
          rows={topDonViRows.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
          columnLabelKey="matTranTapHuan.stats.colLabel"
          columnValueKey="matTranTapHuan.stats.colValue"
          emptyKey="matTranTapHuan.stats.noData"
          maxHeight="max-h-[260px]"
        />
        <StatsTableCard
          title={txt('matTranTapHuan.stats.tableTopLop')}
          rows={topLopRows.map((r) => ({ label: r.label, value: r.value, id: r.id }))}
          columnLabelKey="matTranTapHuan.stats.colTenLop"
          columnValueKey="matTranTapHuan.stats.colSoNguoi"
          emptyKey="matTranTapHuan.stats.noData"
          maxHeight="max-h-[260px]"
        />
      </div>
    </div>
  );
};

export default MttqTapHuanThongKePanel;
