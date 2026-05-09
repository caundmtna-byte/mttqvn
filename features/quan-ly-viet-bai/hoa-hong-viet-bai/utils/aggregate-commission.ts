import type { BaiVietDanhSach } from '../../bai-viet/core/types';
import type { StatsTableRow } from '@/components/shared/stats/types';

export type CommissionScope = 'mine' | 'all';

export interface CommissionFilters {
  dateFrom: string | null;
  dateTo: string | null;
  theLoaiIds: string[];
  authorIds: string[];
}

export interface CommissionSeriesPoint {
  key: string;
  label: string;
  total: number;
  count: number;
}

export interface CommissionAggregateResult {
  filteredRows: BaiVietDanhSach[];
  totalCommission: number;
  articleCount: number;
  avgCommission: number;
  seriesByMonth: CommissionSeriesPoint[];
  seriesByTheLoai: CommissionSeriesPoint[];
  seriesByAuthor: CommissionSeriesPoint[];
  authorTableRows: StatsTableRow[];
  theLoaiTableRows: StatsTableRow[];
}

function inDateRange(isoDate: string, from: string | null, to: string | null): boolean {
  const d = isoDate.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function labelMonth(key: string): string {
  const [y, m] = key.split('-');
  return `${m}/${y}`;
}

/** Gom KPI + chuỗi chart/bảng từ danh sách bài (don_gia = nhuận bút). */
export function aggregateCommission(
  rows: BaiVietDanhSach[],
  scope: CommissionScope,
  currentAuthorId: string,
  filters: CommissionFilters,
): CommissionAggregateResult {
  const authorId = String(currentAuthorId ?? '').trim();

  let list = rows;

  if (scope === 'mine') {
    if (!authorId) {
      list = [];
    } else {
      list = list.filter((r) => String(r.id_nguoi_tao) === authorId);
    }
  }

  list = list.filter((r) => inDateRange(r.ngay_dang, filters.dateFrom, filters.dateTo));

  if (filters.theLoaiIds.length > 0) {
    const set = new Set(filters.theLoaiIds);
    list = list.filter((r) => set.has(String(r.id_the_loai)));
  }

  if (scope === 'all' && filters.authorIds.length > 0) {
    const set = new Set(filters.authorIds);
    list = list.filter((r) => set.has(String(r.id_nguoi_tao)));
  }

  const totalCommission = list.reduce((s, r) => s + (Number(r.don_gia) || 0), 0);
  const articleCount = list.length;
  const avgCommission = articleCount > 0 ? totalCommission / articleCount : 0;

  const byMonth = new Map<string, { total: number; count: number }>();
  for (const r of list) {
    const k = monthKey(r.ngay_dang);
    const cur = byMonth.get(k) ?? { total: 0, count: 0 };
    cur.total += Number(r.don_gia) || 0;
    cur.count += 1;
    byMonth.set(k, cur);
  }
  const monthKeys = [...byMonth.keys()].sort();
  const seriesByMonth: CommissionSeriesPoint[] = monthKeys.map((key) => {
    const v = byMonth.get(key)!;
    return { key, label: labelMonth(key), total: v.total, count: v.count };
  });

  const byTl = new Map<string, { label: string; total: number; count: number }>();
  for (const r of list) {
    const id = String(r.id_the_loai);
    const label = r.ten_the_loai?.trim() || id;
    const cur = byTl.get(id) ?? { label, total: 0, count: 0 };
    cur.total += Number(r.don_gia) || 0;
    cur.count += 1;
    byTl.set(id, cur);
  }
  const seriesByTheLoai: CommissionSeriesPoint[] = [...byTl.entries()]
    .map(([id, v]) => ({ key: id, label: v.label, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);

  const byAu = new Map<string, { label: string; total: number; count: number }>();
  for (const r of list) {
    const id = String(r.id_nguoi_tao);
    const label =
      r.ho_va_ten_nguoi_tao?.trim() ||
      r.ten_tai_khoan_nguoi_tao?.trim() ||
      `NV ${id}`;
    const cur = byAu.get(id) ?? { label, total: 0, count: 0 };
    cur.total += Number(r.don_gia) || 0;
    cur.count += 1;
    byAu.set(id, cur);
  }
  const seriesByAuthor: CommissionSeriesPoint[] = [...byAu.entries()]
    .map(([id, v]) => ({ key: id, label: v.label, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);

  const authorTableRows: StatsTableRow[] = seriesByAuthor.map((p) => ({
    id: p.key,
    label: p.label,
    value: `${fmtMoney(p.total)} (${p.count})`,
  }));

  const theLoaiTableRows: StatsTableRow[] = seriesByTheLoai.map((p) => ({
    id: p.key,
    label: p.label,
    value: `${fmtMoney(p.total)} (${p.count})`,
  }));

  return {
    filteredRows: list,
    totalCommission,
    articleCount,
    avgCommission,
    seriesByMonth,
    seriesByTheLoai,
    seriesByAuthor,
    authorTableRows,
    theLoaiTableRows,
  };
}
