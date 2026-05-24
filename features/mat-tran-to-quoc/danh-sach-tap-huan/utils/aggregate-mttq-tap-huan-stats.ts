import type { MttqLopTapHuanListRow, MttqTapHuanChiTietFlatRow } from '../core/types';

const DON_VI_EMPTY_KEY = '__none__';

export function computeTapHuanKpis(rows: MttqLopTapHuanListRow[]): {
  totalLop: number;
  totalNguoi: number;
} {
  let totalNguoi = 0;
  for (const r of rows) {
    totalNguoi += Number(r.so_dong) || 0;
  }
  return { totalLop: rows.length, totalNguoi };
}

/** KPI đồng bộ tab CT: số lớp theo danh sách lọc; số người = số dòng chi tiết trong phạm vi `flatRows`. */
export function computeTapHuanKpisScoped(
  lopRows: MttqLopTapHuanListRow[],
  flatRows: MttqTapHuanChiTietFlatRow[],
): { totalLop: number; totalNguoi: number } {
  return { totalLop: lopRows.length, totalNguoi: flatRows.length };
}

/** Phân bố theo cấp tập huấn (Cấp tỉnh / Cấp xã). */
export function aggregateTapHuanByCap(rows: MttqLopTapHuanListRow[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r.cap_tap_huan || '';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label: label || '—', count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function aggregateTapHuanByNam(rows: MttqLopTapHuanListRow[]): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const y = String(r.nam_tap_huan ?? '');
    if (!y || y === 'NaN') continue;
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.label.localeCompare(a.label));
}

export interface TopDonViLopRow {
  id: string;
  label: string;
  value: number;
}

/** Top đơn vị (nhãn xã/phường lớp) theo số lớp. */
export function aggregateTapHuanTopDonViLop(rows: MttqLopTapHuanListRow[], topN: number): TopDonViLopRow[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const raw = (r.ten_don_vi ?? '').trim();
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

/** Phân bố theo thuộc diện (dòng CT trong phạm vi). */
export function aggregateTapHuanByThuocDien(
  flatRows: MttqTapHuanChiTietFlatRow[],
): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of flatRows) {
    const k = r.thuoc_dien || '';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label: label || '—', count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export interface TopTenLopRow {
  id: string;
  label: string;
  value: number;
}

/** Top lớp theo số người tham gia (`so_dong`). */
export function aggregateTapHuanTopTenLop(rows: MttqLopTapHuanListRow[], topN: number): TopTenLopRow[] {
  return [...rows]
    .map((r) => ({
      id: r.id,
      label: r.ten_lop_tap_huan?.trim() ? r.ten_lop_tap_huan : '—',
      value: Number(r.so_dong) || 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, topN);
}

/** Phân bố theo cấp lớp — đếm dòng CT (phạm vi đã lọc quyền xem). */
export function aggregateTapHuanByCapFromFlat(
  flatRows: MttqTapHuanChiTietFlatRow[],
): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of flatRows) {
    const k = r.cap_tap_huan || '';
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label: label || '—', count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Phân bố theo năm — đếm dòng CT trong phạm vi flat. */
export function aggregateTapHuanByNamFromFlat(
  flatRows: MttqTapHuanChiTietFlatRow[],
): { label: string; count: number }[] {
  const map = new Map<string, number>();
  for (const r of flatRows) {
    const y = String(r.nam_tap_huan ?? '');
    if (!y || y === 'NaN') continue;
    map.set(y, (map.get(y) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.label.localeCompare(a.label));
}

/** Top đơn vị lớp — đếm ứng viên theo `ten_don_vi_lop` (flat). */
export function aggregateTapHuanTopDonViLopFromFlat(
  flatRows: MttqTapHuanChiTietFlatRow[],
  topN: number,
): TopDonViLopRow[] {
  const map = new Map<string, number>();
  for (const r of flatRows) {
    const raw = (r.ten_don_vi_lop ?? '').trim();
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

/** Top lớp — đếm số dòng CT theo lớp trong phạm vi flat. */
export function aggregateTapHuanTopTenLopFromFlat(
  flatRows: MttqTapHuanChiTietFlatRow[],
  topN: number,
): TopTenLopRow[] {
  const map = new Map<string, { label: string; value: number }>();
  for (const r of flatRows) {
    const id = r.id_lop_tap_huan;
    const label = r.ten_lop_tap_huan?.trim() ? r.ten_lop_tap_huan : '—';
    const cur = map.get(id);
    if (cur) cur.value += 1;
    else map.set(id, { label, value: 1 });
  }
  return [...map.values()].sort((a, b) => b.value - a.value).slice(0, topN);
}
