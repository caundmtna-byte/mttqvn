import type { KhoDanhSachHangHoaListRow } from '../core/types';

/** Đơn vị thường dùng cứu trợ — gộp với giá trị đã có trong DB, không trùng (so khóa chữ thường). */
export const DON_VI_TINH_GOI_Y_MAC_DINH = [
  'kg',
  'g',
  'tấn',
  'bao',
  'thùng',
  'hộp',
  'gói',
  'chai',
  'lọ',
  'lon',
  'tuýp',
  'chai/lốc',
  'cái',
  'chiếc',
  'bộ',
  'cuộn',
  'đôi',
  'xấp',
  'can',
  'lít',
  'ml',
] as const;

/** Danh sách gợi ý ĐVT: ưu tiên cách viết đã có trong DB, bổ sung mặc định, sắp xếp theo locale vi. */
export function buildDonViTinhSuggestions(rows: readonly KhoDanhSachHangHoaListRow[] | null | undefined): string[] {
  const displayByKey = new Map<string, string>();
  for (const r of rows ?? []) {
    const u = (r.don_vi_tinh ?? '').trim();
    if (!u) continue;
    const k = u.toLowerCase();
    if (!displayByKey.has(k)) displayByKey.set(k, u);
  }
  for (const d of DON_VI_TINH_GOI_Y_MAC_DINH) {
    const k = d.toLowerCase();
    if (!displayByKey.has(k)) displayByKey.set(k, d);
  }
  return [...displayByKey.values()].sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
}
