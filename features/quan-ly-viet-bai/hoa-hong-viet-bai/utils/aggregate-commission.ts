import type { BaiVietDanhSach } from '../../bai-viet/core/types';
import type { BaiVietThongKeNhom } from '../../bai-viet/utils/thong-ke-nhom';
import type { StatsTableRow } from '@/components/shared/stats/types';
import { formatDecimal } from '@/lib/utils';

export type CommissionScope = 'mine' | 'all';

/** Khoảng ngày đăng đã lọc ở máy chủ (RPC gộp nhóm) — ở đây chỉ còn lọc theo chiều. */
export interface CommissionFilters {
  theLoaiIds: string[];
  authorIds: string[];
  donViIds: string[];
}

/**
 * Nhân viên chưa gán `don_vi_id` vẫn phải chọn lọc được: bỏ họ khỏi danh sách
 * đơn vị là đúng chỗ dễ in sót khi chi trả theo đơn vị.
 */
export const DON_VI_CHUA_GAN = '__chua_gan__';

export function donViKeyOf(row: Pick<BaiVietDanhSach, 'id_don_vi_nguoi_tao'>): string {
  const id = String(row.id_don_vi_nguoi_tao ?? '').trim();
  return id === '' ? DON_VI_CHUA_GAN : id;
}

export interface CommissionSeriesPoint {
  key: string;
  label: string;
  total: number;
  count: number;
}

export interface CommissionAggregateResult {
  /** Các nhóm (kỳ × thể loại × … × người tạo) còn lại sau bộ lọc. */
  filteredRows: BaiVietThongKeNhom[];
  totalCommission: number;
  articleCount: number;
  avgCommission: number;
  seriesByMonth: CommissionSeriesPoint[];
  seriesByTheLoai: CommissionSeriesPoint[];
  seriesByAuthor: CommissionSeriesPoint[];
  authorTableRows: StatsTableRow[];
  theLoaiTableRows: StatsTableRow[];
}

function labelMonth(key: string): string {
  const [y, m] = key.split('-');
  return `${m}/${y}`;
}

/**
 * Gom KPI + chuỗi chart/bảng từ các nhóm máy chủ đã gộp theo THÁNG ĐĂNG
 * (`so_tien` = tổng nhuận bút, `so_bai` = số bài của nhóm).
 */
export function aggregateCommission(
  rows: BaiVietThongKeNhom[],
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

  if (filters.theLoaiIds.length > 0) {
    const set = new Set(filters.theLoaiIds);
    list = list.filter((r) => set.has(String(r.id_the_loai)));
  }

  if (scope === 'all' && filters.authorIds.length > 0) {
    const set = new Set(filters.authorIds);
    list = list.filter((r) => set.has(String(r.id_nguoi_tao)));
  }

  if (scope === 'all' && filters.donViIds.length > 0) {
    const set = new Set(filters.donViIds);
    list = list.filter((r) => set.has(donViKeyOf(r)));
  }

  const totalCommission = list.reduce((s, r) => s + r.so_tien, 0);
  const articleCount = list.reduce((s, r) => s + r.so_bai, 0);
  const avgCommission = articleCount > 0 ? totalCommission / articleCount : 0;

  const byMonth = new Map<string, { total: number; count: number }>();
  for (const r of list) {
    const k = r.ky.slice(0, 7);
    const cur = byMonth.get(k) ?? { total: 0, count: 0 };
    cur.total += r.so_tien;
    cur.count += r.so_bai;
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
    cur.total += r.so_tien;
    cur.count += r.so_bai;
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
    cur.total += r.so_tien;
    cur.count += r.so_bai;
    byAu.set(id, cur);
  }
  const seriesByAuthor: CommissionSeriesPoint[] = [...byAu.entries()]
    .map(([id, v]) => ({ key: id, label: v.label, total: v.total, count: v.count }))
    .sort((a, b) => b.total - a.total);

  // `Intl.NumberFormat(undefined, …)` lấy locale của MÁY: bảng hoa hồng mở trên
  // máy cài tiếng Anh sẽ hiện "500,000,000" — đọc nhầm thành năm trăm nghìn.
  const fmtMoney = (n: number) => formatDecimal(n, 0);

  const authorTableRows: StatsTableRow[] = seriesByAuthor.map((p) => ({
    id: p.key,
    label: p.label,
    value: `${fmtMoney(p.total)} (${fmtMoney(p.count)})`,
  }));

  const theLoaiTableRows: StatsTableRow[] = seriesByTheLoai.map((p) => ({
    id: p.key,
    label: p.label,
    value: `${fmtMoney(p.total)} (${fmtMoney(p.count)})`,
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
