import React, { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef } from 'react';
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
  FileText,
  Hash,
  Users,
  User,
  Layers,
  Download,
  Share2,
  LayoutTemplate,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { cn, formatCurrency, getLanguage } from '@/lib/utils';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import type { FilterGroup } from '@/components/ui/MobileFilterSheet';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useResourcePermissions } from '@/hooks/use-resource-permissions';
import DateRangePicker, { type DateRangeValue } from '@/components/ui/DateRangePicker';
import { StatsKpiGrid, StatsCard, StatsTableCard } from '@/components/shared/stats';
import type { StatsTableRow } from '@/components/shared/stats/types';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import type { Option } from '@/components/ui/MultiSelect';
import ExportDialog from '@/components/shared/ExportDialog';
import { useExportData } from '@/lib/useExportData';
import { useConfirmStore } from '@/store/useConfirmStore';
import { useAuthStore } from '@/store/useStore';
import { CONFIRM_DELETE } from '@/lib/button-labels';
import { DRAWER_Z_CONTENT_BASE } from '@/lib/dialog-sizes';
import { AnimatePresence } from 'framer-motion';
import { useBaiVietDanhSachList, useDeleteBaiVietDanhSachMany } from '../bai-viet/hooks/use-bai-viet-danh-sach';
import type { BaiVietDanhSach } from '../bai-viet/core/types';
import {
  type ArticleStatsDimensionFilters,
  resolveArticleStatsDateRange,
  filterArticlesForStats,
  computeArticleStatsKpis,
  pickTrendBucket,
  buildTrendSeries,
  aggregateTopCounts,
  sortLookupRows,
  type LookupSortKey,
} from './utils/aggregate-bai-viet-stats';
import ChartTooltip from '@/components/ui/ChartTooltip';
import { useCan } from '@/hooks/use-can';

const BaiVietDetail = lazy(() => import('../bai-viet/components/bai-viet-detail'));

const CUSTOM_PRESET = 'custom';

const initialDateRange: DateRangeValue = {
  preset: 'thisMonth',
  customStart: '',
  customEnd: '',
};

const initialDims: ArticleStatsDimensionFilters = {
  idTheLoai: [],
  idNguonDang: [],
  idTrangDang: [],
  idNguoiTao: [],
};

const EXPORT_PAGINATION = { page: 1, pageSize: 100_000 };

const DrawerLazyFallback: React.FC = () => (
  <div
    className="fixed inset-0 flex items-center justify-center bg-black/30 pointer-events-none"
    style={{ zIndex: DRAWER_Z_CONTENT_BASE }}
  >
    <div
      className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent"
      aria-hidden
    />
  </div>
);

function buildDimOptions(
  rows: BaiVietDanhSach[],
  pick: (r: BaiVietDanhSach) => { id: string; label: string },
): Option[] {
  const m = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const { id, label } = pick(r);
    const prev = m.get(id);
    if (prev) prev.count += 1;
    else m.set(id, { label: label || id, count: 1 });
  }
  return [...m.entries()]
    .map(([value, v]) => ({ value, label: v.label, count: v.count }))
    .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
}

const BcThongKeBaiVietPage: React.FC = () => {
  const navigate = useNavigate();
  const confirm = useConfirmStore((s) => s.confirm);
  const user = useAuthStore((s) => s.user);
  const { canExport } = useResourcePermissions('articles');
  const canViewStats = useCan('view', 'articleStats');
  const canViewArticles = useCan('view', 'articles');
  const canOpenPage = canViewStats || canViewArticles;
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canOpenPage || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('articleStats.noViewPermission'));
    navigate('/quan-ly-viet-bai', { replace: true });
  }, [user, canOpenPage, navigate]);

  const { data: rows = [], isLoading } = useBaiVietDanhSachList({ enabled: canOpenPage });
  const deleteMutation = useDeleteBaiVietDanhSachMany();

  const [dateRange, setDateRange] = useState<DateRangeValue>(initialDateRange);
  const [dims, setDims] = useState<ArticleStatsDimensionFilters>(initialDims);
  const [sortKey, setSortKey] = useState<LookupSortKey>('ngay_dang');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [viewing, setViewing] = useState<BaiVietDanhSach | null>(null);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (!viewing) return;
    const fresh = rows.find((r) => r.id === viewing.id);
    if (fresh && fresh !== viewing) queueMicrotask(() => setViewing(fresh));
  }, [rows, viewing]);

  const presets = useMemo(
    () => [
      { id: 'thisWeek', label: txt('articleStats.preset.thisWeek') },
      { id: 'thisMonth', label: txt('articleStats.preset.thisMonth') },
      { id: 'thisQuarter', label: txt('articleStats.preset.thisQuarter') },
      { id: 'thisYear', label: txt('articleStats.preset.thisYear') },
      { id: CUSTOM_PRESET, label: txt('articleStats.preset.custom') },
    ],
    [],
  );

  const resolvedRange = useMemo(
    () => resolveArticleStatsDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange.preset, dateRange.customStart, dateRange.customEnd],
  );

  const filtered = useMemo(
    () => filterArticlesForStats(rows, resolvedRange, dims),
    [rows, resolvedRange, dims],
  );

  const kpis = useMemo(() => computeArticleStatsKpis(filtered), [filtered]);

  const bucket = useMemo(() => pickTrendBucket(resolvedRange.start, resolvedRange.end), [resolvedRange]);
  const trendSeries = useMemo(
    () => buildTrendSeries(filtered, resolvedRange, bucket),
    [filtered, resolvedRange, bucket],
  );

  const topTheLoai = useMemo(() => {
    const rowsTop = aggregateTopCounts(filtered, 'the_loai', 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const topNguon = useMemo(() => {
    const rowsTop = aggregateTopCounts(filtered, 'nguon', 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const topNguoi = useMemo(() => {
    const rowsTop = aggregateTopCounts(filtered, 'nguoi_tao', 10);
    return rowsTop.map((r) => ({ id: r.id, label: r.label, value: r.value }));
  }, [filtered]);

  const sortedLookup = useMemo(
    () => sortLookupRows(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const theLoaiOptions = useMemo(
    () => buildDimOptions(rows, (r) => ({ id: String(r.id_the_loai), label: r.ten_the_loai?.trim() || '' })),
    [rows],
  );
  const nguonOptions = useMemo(
    () => buildDimOptions(rows, (r) => ({ id: String(r.id_nguon_dang), label: r.ten_nguon_dang?.trim() || '' })),
    [rows],
  );
  const trangOptions = useMemo(
    () => buildDimOptions(rows, (r) => ({ id: String(r.id_trang_dang), label: r.ten_trang_dang?.trim() || '' })),
    [rows],
  );
  const nguoiOptions = useMemo(
    () =>
      buildDimOptions(rows, (r) => ({
        id: String(r.id_nguoi_tao),
        label: r.ho_va_ten_nguoi_tao?.trim() || r.ten_tai_khoan_nguoi_tao?.trim() || '',
      })),
    [rows],
  );

  const filterGroups = useMemo<FilterGroup[]>(
    () => [
      {
        key: 'the_loai',
        label: txt('articleStats.filterTheLoai'),
        icon: Layers,
        options: theLoaiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idTheLoai,
        onChange: (v) => setDims((d) => ({ ...d, idTheLoai: v })),
      },
      {
        key: 'nguon',
        label: txt('articleStats.filterNguon'),
        icon: Share2,
        options: nguonOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idNguonDang,
        onChange: (v) => setDims((d) => ({ ...d, idNguonDang: v })),
      },
      {
        key: 'trang',
        label: txt('articleStats.filterTrang'),
        icon: LayoutTemplate,
        options: trangOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idTrangDang,
        onChange: (v) => setDims((d) => ({ ...d, idTrangDang: v })),
      },
      {
        key: 'nguoi',
        label: txt('articleStats.filterNguoiTao'),
        icon: User,
        options: nguoiOptions.map((o) => ({ label: o.label, value: o.value, count: o.count })),
        value: dims.idNguoiTao,
        onChange: (v) => setDims((d) => ({ ...d, idNguoiTao: v })),
      },
    ],
    [theLoaiOptions, nguonOptions, trangOptions, nguoiOptions, dims.idTheLoai, dims.idNguonDang, dims.idTrangDang, dims.idNguoiTao],
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
    if (dims.idTheLoai.length) n += 1;
    if (dims.idNguonDang.length) n += 1;
    if (dims.idTrangDang.length) n += 1;
    if (dims.idNguoiTao.length) n += 1;
    return n;
  }, [dims, isNonDefaultDateRange]);

  const clearFilters = useCallback(() => {
    setDims(initialDims);
    setDateRange(initialDateRange);
  }, []);

  const exportColumns = useMemo(
    () => [
      { key: 'ten_bai', label: txt('articleStats.tableColTenBai') },
      { key: 'ten_the_loai', label: txt('articleStats.tableColTheLoai') },
      { key: 'don_gia_num', label: txt('articleStats.tableColDonGia') },
      { key: 'ngay_dang', label: txt('articleStats.tableColNgayDang') },
      { key: 'ten_nguon_dang', label: txt('articleStats.tableColNguon') },
      { key: 'ten_trang_dang', label: txt('articleStats.tableColTrang') },
      { key: 'ho_va_ten_nguoi_tao', label: txt('articleStats.tableColNguoi') },
      { key: 'link', label: txt('articleStats.tableColLink') },
      { key: 'range_start', label: txt('articleStats.exportRangeFrom') },
      { key: 'range_end', label: txt('articleStats.exportRangeTo') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (item: BaiVietDanhSach) => ({
      ten_bai: item.ten_bai,
      ten_the_loai: item.ten_the_loai ?? '',
      don_gia_num: item.don_gia,
      ngay_dang: item.ngay_dang,
      ten_nguon_dang: item.ten_nguon_dang ?? '',
      ten_trang_dang: item.ten_trang_dang ?? '',
      ho_va_ten_nguoi_tao: item.ho_va_ten_nguoi_tao ?? item.ten_tai_khoan_nguoi_tao ?? '',
      link: item.link,
      range_start: resolvedRange.start,
      range_end: resolvedRange.end,
    }),
    [resolvedRange.start, resolvedRange.end],
  );

  const { exportData, paginatedData: paginatedExportData, selectedData: selectedExportData } = useExportData({
    data: sortedLookup,
    isOpen: showExport,
    mapFn: exportMapFn,
    pagination: EXPORT_PAGINATION,
    selectedIds: new Set(),
    keyExtractor: (r) => r.id,
  });

  const kpiItems = useMemo(
    () => [
      {
        id: 'count',
        label: txt('articleStats.kpiTotal'),
        value: kpis.totalCount,
        icon: FileText,
        bg: 'bg-violet-500/10',
        color: 'text-violet-600 dark:text-violet-400',
        delta: null,
      },
      {
        id: 'sum',
        label: txt('articleStats.kpiTotalDonGia'),
        value: formatCurrency(kpis.totalDonGia),
        icon: Hash,
        bg: 'bg-emerald-500/10',
        color: 'text-emerald-600 dark:text-emerald-400',
        delta: null,
      },
      {
        id: 'avg',
        label: txt('articleStats.kpiAvgDonGia'),
        value: formatCurrency(Math.round(kpis.avgDonGia)),
        icon: Layers,
        bg: 'bg-amber-500/10',
        color: 'text-amber-600 dark:text-amber-400',
        delta: null,
      },
      {
        id: 'authors',
        label: txt('articleStats.kpiDistinctAuthors'),
        value: kpis.distinctNguoiTao,
        icon: Users,
        bg: 'bg-sky-500/10',
        color: 'text-sky-600 dark:text-sky-400',
        delta: null,
      },
    ],
    [kpis],
  );

  const handleExport = () => {
    if (sortedLookup.length === 0) {
      toast.warning(txt('articleStats.noExportData'));
      return;
    }
    setShowExport(true);
  };

  const handleDelete = (id: string) => {
    confirm({
      title: txt('articleList.deleteTitle'),
      message: txt('articleList.deleteMessage'),
      variant: 'danger',
      confirmText: CONFIRM_DELETE(),
      onConfirm: async () => {
        deleteMutation.mutate([id], {
          onSuccess: () => {
            if (viewing?.id === id) setViewing(null);
          },
        });
      },
    });
  };

  const toggleSort = (key: LookupSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir(key === 'ten_bai' || key === 'ten_the_loai' || key === 'ten_nguon_dang' || key === 'ten_trang_dang' || key === 'creator' ? 'asc' : 'desc');
    }
  };

  const chartData = useMemo(
    () => trendSeries.map((p) => ({ ...p, amount: p.totalDonGia })),
    [trendSeries],
  );

  const dateRangeRow = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 w-full">
      <DateRangePicker
        presets={presets}
        value={dateRange}
        onChange={setDateRange}
        placeholder={txt('articleStats.dateRangeLabel')}
        customPresetId={CUSTOM_PRESET}
        className="shrink-0"
      />
    </div>
  );

  const filterRowDesktop = (
    <div className="flex flex-nowrap items-center gap-2 min-w-0 pb-0.5">
      {dateRangeRow}
      <div className="h-6 w-px bg-border shrink-0 self-center" aria-hidden />
      <FilterChipMultiSelect
        icon={Layers}
        options={theLoaiOptions}
        value={dims.idTheLoai}
        onChange={(v) => setDims((d) => ({ ...d, idTheLoai: v }))}
        placeholder={txt('articleStats.filterTheLoai')}
        className="shrink-0 w-[160px]"
      />
      <FilterChipMultiSelect
        icon={Share2}
        options={nguonOptions}
        value={dims.idNguonDang}
        onChange={(v) => setDims((d) => ({ ...d, idNguonDang: v }))}
        placeholder={txt('articleStats.filterNguon')}
        className="shrink-0 w-[150px]"
      />
      <FilterChipMultiSelect
        icon={LayoutTemplate}
        options={trangOptions}
        value={dims.idTrangDang}
        onChange={(v) => setDims((d) => ({ ...d, idTrangDang: v }))}
        placeholder={txt('articleStats.filterTrang')}
        className="shrink-0 w-[150px]"
      />
      <FilterChipMultiSelect
        icon={User}
        options={nguoiOptions}
        value={dims.idNguoiTao}
        onChange={(v) => setDims((d) => ({ ...d, idNguoiTao: v }))}
        placeholder={txt('articleStats.filterNguoiTao')}
        className="shrink-0 w-[160px]"
      />
    </div>
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
    <div className="flex flex-col h-page relative min-h-0" aria-label={txt('articleStats.title')}>
      <DashboardToolbar
        className="shrink-0 mb-3"
        onBack={() => navigate('/quan-ly-viet-bai')}
        mobileRow2Content={
          <div className="min-w-0 overflow-x-auto pb-0.5 -mx-0.5 px-0.5">{dateRangeRow}</div>
        }
        filters={filterRowDesktop}
        filtersSingleRow
        filterGroups={filterGroups}
        actions={<div className="hidden sm:flex items-center gap-2 shrink-0">{renderExportToolbarButton()}</div>}
        mobileActions={renderExportToolbarButton()}
        activeFilterCount={activeFilterCount}
        onClearFilters={activeFilterCount ? clearFilters : undefined}
      />

      <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card shadow-sm p-3 sm:p-4 space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{txt('articleStats.loading')}</p>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-medium text-foreground">{txt('articleStats.noData')}</p>
            <p className="text-xs text-muted-foreground">{txt('articleStats.noDataHint')}</p>
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpiItems} columns={4} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatsCard title={txt('articleStats.chartTrendCount')} icon={FileText} spanTwo={false}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={36} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Line type="monotone" dataKey="count" name="Số bài" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>

              <StatsCard title={txt('articleStats.chartTrendAmount')} icon={Hash}>
                <div className="h-[240px] w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : String(v))} />
                      <RechartsTooltip content={<ChartTooltip />} />
                      <Bar dataKey="amount" name={txt('articleStats.kpiTotalDonGia')} fill="hsl(142 76% 36%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </StatsCard>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsTableCard
                title={txt('articleStats.chartTopTheLoai')}
                rows={topTheLoai as StatsTableRow[]}
                columnLabelKey="articleStats.tableTwoColLabel"
                columnValueKey="articleStats.tableTwoColValue"
                emptyKey="articleStats.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('articleStats.chartTopNguon')}
                rows={topNguon as StatsTableRow[]}
                columnLabelKey="articleStats.tableTwoColLabel"
                columnValueKey="articleStats.tableTwoColValue"
                emptyKey="articleStats.noData"
                maxHeight="max-h-[220px]"
              />
              <StatsTableCard
                title={txt('articleStats.chartTopNguoi')}
                rows={topNguoi as StatsTableRow[]}
                columnLabelKey="articleStats.tableTwoColLabel"
                columnValueKey="articleStats.tableTwoColValue"
                emptyKey="articleStats.noData"
                maxHeight="max-h-[220px]"
              />
            </div>

            <StatsCard title={txt('articleStats.tableLookupTitle')} icon={Layers}>
              <div className="overflow-x-auto max-h-[min(480px,50vh)] overflow-y-auto -m-4">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="sticky top-0 z-[1] bg-card border-b border-border">
                    <tr className="text-left text-muted-foreground">
                      {(
                        [
                          ['ten_bai', txt('articleStats.tableColTenBai')],
                          ['ten_the_loai', txt('articleStats.tableColTheLoai')],
                          ['ngay_dang', txt('articleStats.tableColNgayDang')],
                          ['don_gia', txt('articleStats.tableColDonGia')],
                          ['ten_nguon_dang', txt('articleStats.tableColNguon')],
                          ['ten_trang_dang', txt('articleStats.tableColTrang')],
                          ['creator', txt('articleStats.tableColNguoi')],
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
                      <th className="py-2 font-medium">{txt('articleStats.tableColLink')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedLookup.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/60 hover:bg-muted/40 cursor-pointer"
                        onClick={() => setViewing(row)}
                      >
                        <td className="py-2 pr-3 max-w-[200px] truncate">{row.ten_bai}</td>
                        <td className="py-2 pr-3">{row.ten_the_loai ?? '—'}</td>
                        <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{row.ngay_dang}</td>
                        <td className="py-2 pr-3 tabular-nums">{formatCurrency(row.don_gia)}</td>
                        <td className="py-2 pr-3 max-w-[120px] truncate">{row.ten_nguon_dang ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[120px] truncate">{row.ten_trang_dang ?? '—'}</td>
                        <td className="py-2 pr-3 max-w-[140px] truncate">
                          {row.ho_va_ten_nguoi_tao ?? row.ten_tai_khoan_nguoi_tao ?? '—'}
                        </td>
                        <td className="py-2">
                          {row.link ? (
                            <a
                              href={row.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate max-w-[160px] inline-block align-bottom"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.link}
                            </a>
                          ) : (
                            '—'
                          )}
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
        fileName={txt('articleStats.exportFileName')}
        visibleColumnKeys={exportColumns.map((c) => c.key)}
      />

      <AnimatePresence>
        {viewing && (
          <Suspense fallback={<DrawerLazyFallback />}>
            <BaiVietDetail
              data={viewing}
              onClose={() => setViewing(null)}
              onEdit={() => {
                navigate('/quan-ly-viet-bai/bai-viet');
              }}
              onDelete={handleDelete}
            />
          </Suspense>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BcThongKeBaiVietPage;
