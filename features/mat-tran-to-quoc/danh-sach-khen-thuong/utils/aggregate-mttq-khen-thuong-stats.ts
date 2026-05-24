import type { MttqKhenThuongChiTietFlatRow, MttqKhenThuongListRow } from '../core/types';

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

const DON_VI_EMPTY_KEY = '__none__';

export interface TopDonViRow {
  id: string;
  label: string;
  value: number;
}

/** KPI đồng bộ tab Chi tiết: số QĐ theo danh sách lọc; số người = số dòng CT trong phạm vi `flatRows`. */
export function computeKhenThuongKpisScoped(
  qdRows: MttqKhenThuongListRow[],
  flatRows: MttqKhenThuongChiTietFlatRow[],
): { totalQuyetDinh: number; totalSoDong: number } {
  return { totalQuyetDinh: qdRows.length, totalSoDong: flatRows.length };
}

/** Phân bố theo trạng thái — đếm dòng CT phẳng (phạm vi quyền xem Xã phường). */
export function aggregateKhenThuongByTrangThaiFromFlat(
  flatRows: MttqKhenThuongChiTietFlatRow[],
): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of flatRows) {
    const k = r.trang_thai || '';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label: label || '—', count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Phân bố theo năm — đếm dòng CT phẳng. */
export function aggregateKhenThuongByNamFromFlat(
  flatRows: MttqKhenThuongChiTietFlatRow[],
): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of flatRows) {
    const y = yearFromNgayKhenThuong(r.ngay_khen_thuong);
    if (!y) continue;
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.label.localeCompare(a.label));
}

/** Top đơn vị đề xuất — đếm dòng CT theo `don_vi_de_xuat` quyết định cha. */
export function aggregateKhenThuongTopDonViFromFlat(
  flatRows: MttqKhenThuongChiTietFlatRow[],
  topN: number,
): TopDonViRow[] {
  const map = new Map<string, number>();
  for (const r of flatRows) {
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
