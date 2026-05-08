import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { FolderOpen, Coins, FileText, Users, TrendingUp } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import TabGroup from '@/components/ui/TabGroup';
import Button from '@/components/ui/Button';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import DateRangePicker, { type DateRangeValue } from '@/components/ui/DateRangePicker';
import StatsKpiGrid from '@/components/shared/stats/StatsKpiGrid';
import StatsCard from '@/components/shared/stats/StatsCard';
import StatsTableCard from '@/components/shared/stats/StatsTableCard';
import type { StatsKpiCardItem } from '@/components/shared/stats/types';
import { useBaiVietDanhSachList } from '../bai-viet/hooks/use-bai-viet-danh-sach';
import { aggregateCommission, type CommissionScope } from './utils/aggregate-commission';
import { resolveArticleStatsDateRange } from '../bc-thong-ke-bai-viet/utils/aggregate-bai-viet-stats';
import {
  CommissionTrendChart,
  CommissionByTheLoaiChart,
  CommissionByAuthorChart,
} from './components/commission-charts';
import { useCommissionAllTabViewer, rowVisibleOnCommissionAllTab } from './hooks/use-commission-all-tab-viewer';

const TAB_MINE: CommissionScope = 'mine';
const TAB_ALL: CommissionScope = 'all';

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'all',
  customStart: '',
  customEnd: '',
};

const HoaHongVietBaiPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const nhanVienId = String(user?.nhan_vien_id ?? '').trim();
  /** Tab "Tất cả": quyền xem danh sách bài hoặc module Hoa hồng trong ma trận phân quyền. */
  const canViewArticles = useCan('view', 'articles');
  const canViewCommissionModule = useCan('view', 'articleCommission');
  const canOpenPage = canViewArticles || canViewCommissionModule;
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canOpenPage || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('articleCommission.noViewPermission'));
    navigate('/quan-ly-viet-bai', { replace: true });
  }, [user, canOpenPage, navigate]);

  const [scopeRaw, setScope] = useState<CommissionScope>(TAB_MINE);
  /** Khi không có quyền xem phạm vi rộng, luôn coi như tab "Của tôi" (không gọi setState trong effect). */
  const scope = !canOpenPage && scopeRaw === TAB_ALL ? TAB_MINE : scopeRaw;

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [theLoaiIds, setTheLoaiIds] = useState<string[]>([]);
  const [authorIds, setAuthorIds] = useState<string[]>([]);

  const { data: rows = [], isLoading } = useBaiVietDanhSachList({ enabled: canOpenPage });
  const allTabViewer = useCommissionAllTabViewer();

  const presets = useMemo(
    () => [
      { id: 'all', label: txt('articleCommission.presetAll') },
      { id: 'thisWeek', label: txt('articleStats.preset.thisWeek') },
      { id: 'thisMonth', label: txt('articleStats.preset.thisMonth') },
      { id: 'thisQuarter', label: txt('articleStats.preset.thisQuarter') },
      { id: 'thisYear', label: txt('articleStats.preset.thisYear') },
      { id: CUSTOM_PRESET, label: txt('articleStats.preset.custom') },
    ],
    [],
  );

  const { dateFrom, dateTo } = useMemo(() => {
    if (dateRange.preset === 'all') return { dateFrom: null as string | null, dateTo: null as string | null };
    const r = resolveArticleStatsDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd);
    return { dateFrom: r.start, dateTo: r.end };
  }, [dateRange]);

  const scopedRows = useMemo(() => {
    if (scope === TAB_MINE) {
      if (!nhanVienId) return [];
      return rows.filter((r) => String(r.id_nguoi_tao) === nhanVienId);
    }
    return rows.filter((r) => rowVisibleOnCommissionAllTab(allTabViewer, r));
  }, [rows, scope, nhanVienId, allTabViewer]);

  const rowsForTheLoaiOptions = useMemo(() => {
    let r = scopedRows.filter((row) => {
      const d = row.ngay_dang.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
    if (scope === TAB_ALL && authorIds.length > 0) {
      const set = new Set(authorIds);
      r = r.filter((row) => set.has(String(row.id_nguoi_tao)));
    }
    return r;
  }, [scopedRows, dateFrom, dateTo, scope, authorIds]);

  const rowsForAuthorOptions = useMemo(() => {
    let r = scopedRows.filter((row) => {
      const d = row.ngay_dang.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
    if (theLoaiIds.length > 0) {
      const set = new Set(theLoaiIds);
      r = r.filter((row) => set.has(String(row.id_the_loai)));
    }
    return r;
  }, [scopedRows, dateFrom, dateTo, theLoaiIds]);

  const theLoaiOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const row of rowsForTheLoaiOptions) {
      const id = String(row.id_the_loai);
      const label = row.ten_the_loai?.trim() || id;
      const cur = map.get(id) ?? { label, count: 0 };
      cur.count += 1;
      map.set(id, cur);
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ label, value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rowsForTheLoaiOptions]);

  const authorOptions = useMemo(() => {
    const map = new Map<string, { label: string; count: number }>();
    for (const row of rowsForAuthorOptions) {
      const id = String(row.id_nguoi_tao);
      const label =
        row.ho_va_ten_nguoi_tao?.trim() ||
        row.ten_tai_khoan_nguoi_tao?.trim() ||
        `NV ${id}`;
      const cur = map.get(id) ?? { label, count: 0 };
      cur.count += 1;
      map.set(id, cur);
    }
    return [...map.entries()]
      .map(([value, { label, count }]) => ({ label, value, count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [rowsForAuthorOptions]);

  const tabs = useMemo((): { id: CommissionScope; label: string }[] => {
    const base: { id: CommissionScope; label: string }[] = [{ id: TAB_MINE, label: txt('articleCommission.tabMine') }];
    if (canOpenPage) {
      base.push({ id: TAB_ALL, label: txt('articleCommission.tabAll') });
    }
    return base;
  }, [canOpenPage]);

  const agg = useMemo(
    () =>
      aggregateCommission(scopedRows, scope, nhanVienId, {
        dateFrom,
        dateTo,
        theLoaiIds,
        authorIds: scope === TAB_ALL ? authorIds : [],
      }),
    [scopedRows, scope, nhanVienId, dateFrom, dateTo, theLoaiIds, authorIds],
  );

  const handleClearFilters = useCallback(() => {
    setDateRange(initialDateRange);
    setTheLoaiIds([]);
    setAuthorIds([]);
  }, []);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (dateRange.preset !== 'all') n += 1;
    if (theLoaiIds.length > 0) n += 1;
    if (scope === TAB_ALL && authorIds.length > 0) n += 1;
    return n;
  }, [dateRange.preset, theLoaiIds.length, authorIds.length, scope]);

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        key: 'theLoai',
        label: txt('articleCommission.filterTheLoai'),
        icon: FolderOpen,
        options: theLoaiOptions,
        value: theLoaiIds,
        onChange: setTheLoaiIds,
      },
      ...(scope === TAB_ALL
        ? [
            {
              key: 'author',
              label: txt('articleCommission.filterAuthor'),
              icon: Users,
              options: authorOptions,
              value: authorIds,
              onChange: setAuthorIds,
            } as FilterGroup,
          ]
        : []),
    ],
    [theLoaiOptions, theLoaiIds, authorOptions, authorIds, scope],
  );

  const dateRangeRow = (
    <DateRangePicker
      presets={presets}
      value={dateRange}
      onChange={setDateRange}
      placeholder={txt('articleCommission.dateRangePlaceholder')}
      customPresetId={CUSTOM_PRESET}
      className="shrink-0"
    />
  );

  const filterRowDesktop = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 pb-0.5">
      {dateRangeRow}
      <div className="h-6 w-px bg-border shrink-0 self-center" aria-hidden />
      <FilterChipMultiSelect
        options={theLoaiOptions}
        value={theLoaiIds}
        onChange={setTheLoaiIds}
        placeholder={txt('articleCommission.filterTheLoai')}
        icon={FolderOpen}
        className="shrink-0 w-[160px]"
      />
      {scope === TAB_ALL && (
        <FilterChipMultiSelect
          options={authorOptions}
          value={authorIds}
          onChange={setAuthorIds}
          placeholder={txt('articleCommission.filterAuthor')}
          icon={Users}
          className="shrink-0 w-[160px]"
        />
      )}
    </div>
  );

  const kpiItems: StatsKpiCardItem[] = useMemo(() => {
    const top = agg.seriesByAuthor[0];
    const topLabel =
      scope === TAB_ALL && top
        ? `${top.label}: ${formatCurrency(top.total)}`
        : txt('articleCommission.kpiTopAuthorEmpty');

    const base: StatsKpiCardItem[] = [
      {
        id: 'total',
        label: txt('articleCommission.kpiTotal'),
        value: formatCurrency(agg.totalCommission),
        icon: Coins,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10',
      },
      {
        id: 'count',
        label: txt('articleCommission.kpiArticles'),
        value: agg.articleCount,
        icon: FileText,
      },
      {
        id: 'avg',
        label: txt('articleCommission.kpiAvg'),
        value: formatCurrency(Math.round(agg.avgCommission)),
        icon: TrendingUp,
      },
    ];

    if (scope === TAB_ALL) {
      base.push({
        id: 'top',
        label: txt('articleCommission.kpiTopAuthor'),
        value: topLabel,
        icon: Users,
        color: 'text-violet-600 dark:text-violet-400',
        bg: 'bg-violet-500/10',
      });
    }

    return base;
  }, [agg, scope]);

  const tabLeading = (
    <TabGroup
      tabs={tabs}
      activeTab={scope}
      onChange={(id) => {
        const next = id as CommissionScope;
        if (next === TAB_ALL && !canOpenPage) return;
        setScope(next);
        setAuthorIds([]);
      }}
      className="shrink-0"
    />
  );

  if (!canOpenPage) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] px-4"
        aria-busy="true"
        aria-label={txt('common.loading')}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-page relative min-h-0" aria-label={txt('page.articleDashboard.commission')}>
      <DashboardToolbar
        className="shrink-0 mb-3"
        onBack={() => navigate('/quan-ly-viet-bai')}
        desktopStartSlot={tabLeading}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">
            {dateRangeRow}
          </div>
        }
        filters={filterRowDesktop}
        filtersSingleRow
        filterGroups={filterGroups}
        activeFilterCount={activeFilterCount}
        onClearFilters={handleClearFilters}
      />

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card shadow-sm p-3 sm:p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4 py-2 animate-pulse" aria-busy="true" aria-label={txt('articleCommission.loading')}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-[72px] rounded-lg bg-muted border border-border/60" />
              ))}
            </div>
            <div className="h-[200px] rounded-xl bg-muted border border-border/60" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-[280px] rounded-xl bg-muted border border-border/60" />
              <div className="h-[280px] rounded-xl bg-muted border border-border/60 md:block hidden" />
            </div>
          </div>
        ) : agg.filteredRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 sm:p-8 text-center space-y-3">
            {scope === TAB_MINE && !nhanVienId ? (
              <>
                <p className="text-sm font-medium text-foreground">{txt('articleList.service.noEmployeeProfile')}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => navigate('/quan-ly-viet-bai/bai-viet')}>
                  {txt('articleCommission.goToArticles')}
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">{txt('articleCommission.noData')}</p>
                <p className="text-xs text-muted-foreground">{txt('articleCommission.noDataHint')}</p>
              </>
            )}
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={scope === TAB_ALL ? 4 : 3} />

            <StatsCard title={txt('articleCommission.chartTrend')} icon={TrendingUp} spanTwo>
              <CommissionTrendChart series={agg.seriesByMonth} />
            </StatsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard
                title={txt('articleCommission.chartByTheLoai')}
                icon={FolderOpen}
                spanTwo={scope === TAB_MINE}
              >
                <CommissionByTheLoaiChart series={agg.seriesByTheLoai} />
              </StatsCard>
              {scope === TAB_ALL && (
                <StatsCard title={txt('articleCommission.chartByAuthor')} icon={Users}>
                  <CommissionByAuthorChart series={agg.seriesByAuthor} />
                </StatsCard>
              )}
            </div>

            {scope === TAB_ALL ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <StatsTableCard
                  title={txt('articleCommission.tableByAuthor')}
                  icon={Users}
                  rows={agg.authorTableRows}
                  columnLabelKey="articleCommission.tableColLabel"
                  columnValueKey="articleCommission.tableColValue"
                  maxHeight="max-h-[280px]"
                  emptyKey="articleCommission.noData"
                />
                <StatsTableCard
                  title={txt('articleCommission.tableByTheLoai')}
                  icon={FolderOpen}
                  rows={agg.theLoaiTableRows}
                  columnLabelKey="articleCommission.tableColLabel"
                  columnValueKey="articleCommission.tableColValue"
                  maxHeight="max-h-[280px]"
                  emptyKey="articleCommission.noData"
                />
              </div>
            ) : (
              <StatsTableCard
                title={txt('articleCommission.tableByTheLoai')}
                icon={FolderOpen}
                rows={agg.theLoaiTableRows}
                columnLabelKey="articleCommission.tableColLabel"
                columnValueKey="articleCommission.tableColValue"
                maxHeight="max-h-[280px]"
                emptyKey="articleCommission.noData"
              />
            )}
          </>
        )}

        {!canOpenPage && (
          <p className="text-xs text-muted-foreground text-center pt-1 border-t border-border/60">
            {txt('articleCommission.allTabNoPermission')}
          </p>
        )}
      </div>
    </div>
  );
};

export default HoaHongVietBaiPage;
