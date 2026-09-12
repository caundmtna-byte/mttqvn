import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from 'recharts';
import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  Download,
  MapPin,
  Receipt,
  Tag,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { formatCurrency } from '@/lib/utils';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import DateRangePicker from '@/components/ui/DateRangePicker';
import FilterChipMultiSelect from '@/components/shared/FilterChipMultiSelect';
import ExportDialog from '@/components/shared/ExportDialog';
import { useExportData } from '@/lib/useExportData';
import { useModuleAccess } from '@/hooks/use-module-access';
import { resolveStandardDateRange } from '@/lib/date-range-presets';
import {
  ReportSkeleton,
  StatsKpiGrid,
  StatsCard,
  StatsTableCard,
  useStatsPageFilters,
} from '@/components/shared/stats';
import type { StatsKpiCardItem } from '@/components/shared/stats';
import { chartFillByIndex } from '@/lib/constants/chart-colors';
import {
  QUY_FILE_SUFFIX,
  QUY_LABEL,
  QUY_LOAI_KEYS,
  QUY_LOAI_PHIEU_LABEL,
  type QuyKey,
} from '../core/constants';
import { useQuyKhoanOptions } from '../danh-muc-khoan/hooks/use-quy-danh-muc-khoan';
import { useQuyTaiKhoanOptions } from '../danh-muc-tai-khoan/hooks/use-quy-danh-muc-tai-khoan';
import { resolveLoaiParam } from '../so-thu-chi/utils/column-search';
import { useQuyBaoCaoRows } from './hooks/use-quy-bao-cao';
import {
  aggregateQuyStats,
  buildQuyTrendSeries,
  type QuyNhomRow,
} from './utils/aggregate-quy-stats';

export interface QuyBaoCaoThongKePageProps {
  quy: QuyKey;
}

interface QuyBaoCaoDims {
  loai: string[];
  khoan_ids: string[];
  tai_khoan_ids: string[];
}

/** Phải là hằng số cấp module — nếu tạo mới mỗi lần render thì `clearFilters` đổi liên tục. */
const INITIAL_DIMS: QuyBaoCaoDims = { loai: [], khoan_ids: [], tai_khoan_ids: [] };

/** Báo cáo không phân trang, không chọn dòng — hai hằng số này chỉ để hợp lệ API. */
const EXPORT_PAGINATION = { page: 1, pageSize: 100_000 };
const EXPORT_NO_SELECTION: Set<string> = new Set();

/** Tooltip biểu đồ hiển thị SỐ TIỀN, không phải số trần — đây là báo cáo tiền. */
const TooltipTien: React.FC<{
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string; fill?: string }[];
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-xs">
      {label ? <p className="font-medium text-foreground mb-1 m-0">{label}</p> : null}
      {payload.map((p, i) => (
        <p key={i} className="text-muted-foreground m-0">
          <span
            className="inline-block w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: p.color ?? p.fill }}
          />
          {p.name}:{' '}
          <span className="font-semibold text-foreground tabular-nums">
            {formatCurrency(Number(p.value ?? 0))}
          </span>
        </p>
      ))}
    </div>
  );
};

/**
 * Báo cáo thống kê quỹ: tổng thu – tổng chi – số dư theo kỳ, theo khoản mục,
 * theo tài khoản và theo xã/phường.
 *
 * Số liệu cộng trên TOÀN BỘ tập đã lọc (kéo hết mọi trang), không phải trang
 * đang xem — báo cáo công khai mà cộng theo trang là con số vô nghĩa.
 */
const QuyBaoCaoThongKePage: React.FC<QuyBaoCaoThongKePageProps> = ({ quy }) => {
  const navigate = useNavigate();
  const { canView, waiting, ready } = useModuleAccess('quyBaoCaoThongKe');
  const didRedirect = useRef(false);
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    if (waiting || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('quy.baoCao.noViewPermission'));
    navigate('/an-sinh-xa-hoi', { replace: true });
  }, [waiting, canView, navigate]);

  const { dateRange, setDateRange, dims, setDims, presets, activeFilterCount, clearFilters } =
    useStatsPageFilters<QuyBaoCaoDims>(INITIAL_DIMS);

  const { data: khoanOptions = [] } = useQuyKhoanOptions(quy, { enabled: ready });
  const { data: taiKhoanOptions = [] } = useQuyTaiKhoanOptions(quy, { enabled: ready });

  /**
   * ⚠️ Preset «Tất cả» trả `start`/`end` RỖNG — phải đổi thành `null` trước khi
   * gửi xuống RPC, và tuyệt đối không đưa chuỗi rỗng vào vòng lặp dayjs nào
   * (xem "Bẫy đã biết" trong CLAUDE.md). `buildQuyTrendSeries` cũng tự chặn lần
   * nữa bên trong.
   */
  const resolvedRange = useMemo(
    () => resolveStandardDateRange(dateRange.preset, dateRange.customStart, dateRange.customEnd),
    [dateRange],
  );

  const baoCaoParams = useMemo(
    () => ({
      quy,
      tuNgay: resolvedRange.allTime || !resolvedRange.start ? null : resolvedRange.start,
      denNgay: resolvedRange.allTime || !resolvedRange.end ? null : resolvedRange.end,
      loai: resolveLoaiParam(dims.loai),
      khoanIds: dims.khoan_ids,
      taiKhoanIds: dims.tai_khoan_ids,
    }),
    [quy, resolvedRange, dims.loai, dims.khoan_ids, dims.tai_khoan_ids],
  );

  const { data: rows = [], isLoading, isError, refetch } = useQuyBaoCaoRows(baoCaoParams, {
    enabled: ready,
  });

  const stats = useMemo(() => aggregateQuyStats(rows), [rows]);
  const trend = useMemo(() => buildQuyTrendSeries(rows, resolvedRange), [rows, resolvedRange]);

  const kpis = useMemo<StatsKpiCardItem[]>(
    () => [
      {
        id: 'thu',
        label: txt('quy.baoCao.kpiTongThu'),
        value: formatCurrency(stats.tongThu),
        icon: ArrowDownLeft,
        color: 'text-emerald-600',
        bg: 'bg-emerald-500/10',
        pct: `${stats.soPhieuThu} ${txt('quy.baoCao.kpiSoPhieuThu').toLowerCase()}`,
      },
      {
        id: 'chi',
        label: txt('quy.baoCao.kpiTongChi'),
        value: formatCurrency(stats.tongChi),
        icon: ArrowUpRight,
        color: 'text-rose-600',
        bg: 'bg-rose-500/10',
        pct: `${stats.soPhieuChi} ${txt('quy.baoCao.kpiSoPhieuChi').toLowerCase()}`,
      },
      {
        id: 'du',
        label: txt('quy.baoCao.kpiSoDu'),
        value: formatCurrency(stats.soDu),
        icon: Wallet,
        color: stats.soDu < 0 ? 'text-rose-600' : 'text-primary',
        bg: stats.soDu < 0 ? 'bg-rose-500/10' : 'bg-primary/10',
      },
      {
        id: 'phieu',
        label: txt('quy.baoCao.kpiSoPhieu'),
        value: stats.soPhieu,
        icon: Receipt,
        color: 'text-sky-600',
        bg: 'bg-sky-500/10',
      },
    ],
    [stats],
  );

  const loaiOptions = useMemo(
    () => QUY_LOAI_KEYS.map((l) => ({ value: l, label: QUY_LOAI_PHIEU_LABEL[l] })),
    [],
  );
  const khoanChipOptions = useMemo(
    () => khoanOptions.map((k) => ({ value: k.id, label: k.ten })),
    [khoanOptions],
  );
  const taiKhoanChipOptions = useMemo(
    () => taiKhoanOptions.map((t) => ({ value: t.id, label: t.ten })),
    [taiKhoanOptions],
  );

  const bangSoDu = useCallback(
    (nhom: QuyNhomRow[]) =>
      nhom.map((r) => ({ id: r.id, label: r.label, value: formatCurrency(r.soDu) })),
    [],
  );

  // ---- Xuất Excel: một dòng cho mỗi nhóm, kèm cột nhóm để đọc được ngoài ngữ cảnh
  const exportRows = useMemo(
    () => [
      ...stats.theoKy.map((r) => ({ nhom: txt('quy.baoCao.colKy'), ...r })),
      ...stats.theoKhoanThu.map((r) => ({ nhom: txt('quy.common.khoanThu'), ...r })),
      ...stats.theoKhoanChi.map((r) => ({ nhom: txt('quy.common.khoanChi'), ...r })),
      ...stats.theoTaiKhoan.map((r) => ({ nhom: txt('quy.baoCao.colTaiKhoan'), ...r })),
      ...stats.theoDonVi.map((r) => ({ nhom: txt('quy.baoCao.colDonVi'), ...r })),
    ],
    [stats],
  );

  const EXPORT_COLUMNS = useMemo(
    () => [
      { key: 'nhom', label: 'Nhóm' },
      { key: 'label', label: 'Tên' },
      { key: 'thu', label: txt('quy.baoCao.colThu') },
      { key: 'chi', label: txt('quy.baoCao.colChi') },
      { key: 'soDu', label: txt('quy.baoCao.colSoDu') },
      { key: 'soPhieu', label: txt('quy.baoCao.colSoPhieu') },
    ],
    [],
  );

  const exportMapFn = useCallback(
    (r: (typeof exportRows)[number]) => ({
      nhom: r.nhom,
      label: r.label,
      thu: formatCurrency(r.thu),
      chi: formatCurrency(r.chi),
      soDu: formatCurrency(r.soDu),
      soPhieu: r.soPhieu,
    }),
    [],
  );

  const { exportData } = useExportData({
    data: exportRows,
    isOpen: showExport,
    mapFn: exportMapFn,
    // Báo cáo không phân trang và không chọn dòng — chỉ có phạm vi "Tất cả".
    pagination: EXPORT_PAGINATION,
    selectedIds: EXPORT_NO_SELECTION,
    keyExtractor: (r) => `${r.nhom}-${r.id}`,
  });

  const handleExport = () => {
    if (exportRows.length === 0) {
      toast.warning(txt('quy.baoCao.noExportData'));
      return;
    }
    setShowExport(true);
  };

  if (waiting || !canView) {
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

  const filtersSlot = (
    <div className="flex flex-wrap items-center gap-2 min-w-0">
      <DateRangePicker
        value={dateRange}
        onChange={setDateRange}
        presets={presets}
        className="shrink-0 w-full min-w-0 sm:w-auto"
      />
      <FilterChipMultiSelect
        options={loaiOptions}
        value={dims.loai}
        onChange={(val) => setDims((d) => ({ ...d, loai: val }))}
        placeholder={txt('quy.baoCao.filterLoaiPlaceholder')}
        icon={Tag}
        className="shrink-0 w-full min-w-0 sm:w-[min(180px,24vw)] sm:max-w-[220px]"
      />
      <FilterChipMultiSelect
        options={khoanChipOptions}
        value={dims.khoan_ids}
        onChange={(val) => setDims((d) => ({ ...d, khoan_ids: val }))}
        placeholder={txt('quy.baoCao.filterKhoanPlaceholder')}
        icon={Tag}
        className="shrink-0 w-full min-w-0 sm:w-[min(220px,26vw)] sm:max-w-[260px]"
      />
      <FilterChipMultiSelect
        options={taiKhoanChipOptions}
        value={dims.tai_khoan_ids}
        onChange={(val) => setDims((d) => ({ ...d, tai_khoan_ids: val }))}
        placeholder={txt('quy.baoCao.filterTaiKhoanPlaceholder')}
        icon={Wallet}
        className="shrink-0 w-full min-w-0 sm:w-[min(200px,24vw)] sm:max-w-[240px]"
      />
    </div>
  );

  const actionsSlot = (
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
  );

  return (
    <div className="flex flex-col h-page">
      <DashboardToolbar
        filters={filtersSlot}
        actions={actionsSlot}
        activeFilterCount={activeFilterCount}
        onClearFilters={clearFilters}
        onBack={() => navigate('/an-sinh-xa-hoi')}
        desktopToolbarWrap
      />

      <div className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
        {isLoading ? (
          <ReportSkeleton />
        ) : isError ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground m-0">{txt('shared.error.message')}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void refetch()}>
              {txt('shared.error.retry')}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <BarChart3 size={28} className="mx-auto mb-2 text-muted-foreground" aria-hidden />
            <p className="text-sm font-medium text-foreground m-0">
              {activeFilterCount > 0
                ? txt('quy.baoCao.emptyTitle')
                : txt('quy.baoCao.emptyNoData')}
            </p>
            {activeFilterCount > 0 ? (
              <p className="text-xs text-muted-foreground mt-1 m-0">
                {txt('quy.baoCao.emptyHint')}
              </p>
            ) : null}
          </div>
        ) : (
          <>
            <StatsKpiGrid items={kpis} columns={4} />

            <StatsCard title={txt('quy.baoCao.chartXuHuong')} icon={TrendingUp}>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      width={72}
                      tickFormatter={(v: number) => new Intl.NumberFormat('vi-VN').format(v)}
                    />
                    <RechartsTooltip content={<TooltipTien />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar
                      dataKey="thu"
                      name={txt('quy.baoCao.colThu')}
                      fill={chartFillByIndex(0)}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="chi"
                      name={txt('quy.baoCao.colChi')}
                      fill={chartFillByIndex(3)}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </StatsCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <StatsTableCard
                title={txt('quy.baoCao.chartTheoKhoanThu')}
                icon={ArrowDownLeft}
                rows={stats.theoKhoanThu.map((r) => ({
                  id: r.id,
                  label: r.label,
                  value: formatCurrency(r.thu),
                }))}
                emptyKey="quy.baoCao.emptyTitle"
              />
              <StatsTableCard
                title={txt('quy.baoCao.chartTheoKhoanChi')}
                icon={ArrowUpRight}
                rows={stats.theoKhoanChi.map((r) => ({
                  id: r.id,
                  label: r.label,
                  value: formatCurrency(r.chi),
                }))}
                emptyKey="quy.baoCao.emptyTitle"
              />
              <StatsTableCard
                title={txt('quy.baoCao.tableTheoTaiKhoan')}
                icon={Wallet}
                rows={bangSoDu(stats.theoTaiKhoan)}
                emptyKey="quy.baoCao.emptyTitle"
              />
              <StatsTableCard
                title={txt('quy.baoCao.tableTheoDonVi')}
                icon={MapPin}
                rows={bangSoDu(stats.theoDonVi)}
                emptyKey="quy.baoCao.emptyTitle"
              />
            </div>

            <StatsTableCard
              title={txt('quy.baoCao.tableTheoKy')}
              icon={BarChart3}
              rows={bangSoDu(stats.theoKy)}
              maxHeight="max-h-[320px]"
              emptyKey="quy.baoCao.emptyTitle"
            />
          </>
        )}
      </div>

      <AnimatePresence>
        {showExport && (
          <ExportDialog
            open={showExport}
            onClose={() => setShowExport(false)}
            columns={EXPORT_COLUMNS}
            data={exportData}
            fileName={`${txt('quy.baoCao.exportFileName')}-${QUY_FILE_SUFFIX[quy]}`}
            visibleColumnKeys={EXPORT_COLUMNS.map((c) => c.key)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default QuyBaoCaoThongKePage;

export { QUY_LABEL };
