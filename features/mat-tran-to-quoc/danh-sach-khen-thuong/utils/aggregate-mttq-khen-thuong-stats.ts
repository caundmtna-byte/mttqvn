import type { MttqKhenThuongListRow } from '../core/types';

export function yearFromNgayKhenThuong(d: string | null | undefined): string | null {
  if (!d?.trim()) return null;
  const y = d.trim().slice(0, 4);
  return /^\d{4}$/.test(y) ? y : null;
}

export function computeKhenThuongKpis(rows: MttqKhenThuongListRow[]): {
  totalQuyetDinh: number;
  totalSoDong: number;
} {
  let totalSoDong = 0;
  for (const r of rows) {
    totalSoDong += Number(r.so_dong) || 0;
  }
  return { totalQuyetDinh: rows.length, totalSoDong };
}

/** Phân bố theo trạng thái — nhãn hiển thị = giá trị trạng thái. */
export function aggregateKhenThuongByTrangThai(rows: MttqKhenThuongListRow[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r.trang_thai || '';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label: label || '—', count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function aggregateKhenThuongByNam(rows: MttqKhenThuongListRow[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const y = yearFromNgayKhenThuong(r.ngay_khen_thuong);
    if (!y) continue;
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.label.localeCompare(a.label));
}

const DON_VI_EMPTY_KEY = '__none__';

export interface TopDonViRow {
  id: string;
  label: string;
  value: number;
}

export function aggregateKhenThuongTopDonVi(rows: MttqKhenThuongListRow[], topN: number): TopDonViRow[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const raw = (r.don_vi_de_xuat ?? '').trim();
    const key = raw || DON_VI_EMPTY_KEY;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([id, value]) => ({
      id,
      label: id === DON_VI_EMPTY_KEY ? '—' : id,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}
