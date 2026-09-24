/**
 * Hằng số trạng thái lưu trên Supabase/DB bằng tiếng Việt có dấu.
 * Chỉ giữ các constant dùng chung nhiều module; trạng thái theo từng nghiệp vụ nằm trong core/constants.ts của từng feature.
 */

import { chuanHoaKhoaSoKhop } from '@/lib/vietnamese';

/** Hai trạng thái bật/tắt (Active/Inactive) – dùng cho Phòng ban, Chức vụ, Chi nhánh, Cấp bậc, Kho, Hàng hóa, v.v. */
export const TRANG_THAI_HOAT_DONG = ['Ngừng hoạt động', 'Đang hoạt động'] as const;
export type TrangThaiHoatDong = (typeof TRANG_THAI_HOAT_DONG)[number];

/** Trạng thái phiếu 3 bước (Chờ duyệt, Đã duyệt, Không duyệt) – Phiếu đề xuất VT, Phiếu kho, v.v. */
export const TRANG_THAI_PHIEU_3 = ['Chờ duyệt', 'Đã duyệt', 'Không duyệt'] as const;
export type TrangThaiPhieu3 = (typeof TRANG_THAI_PHIEU_3)[number];

/**
 * Import Excel/CSV: nhận đúng chuỗi lưu DB (không phân biệt hoa/thường, dấu),
 * hoặc cột số 1/0 kiểu cũ. Ô trống ⇒ "Đang hoạt động".
 *
 * Giá trị lạ trả `null` để nơi gọi báo lỗi dòng. Trước đây ô trống bị đọc thành
 * "Ngừng hoạt động" (`Number('') === 0`) và giá trị lạ lặng lẽ thành "Đang hoạt
 * động" — cả hai đều ghi sai trạng thái mà không để lại dấu vết.
 */
export function parseTrangThaiHoatDongImport(raw: unknown): TrangThaiHoatDong | null {
  const s = String(raw ?? '').trim();
  if (s === '') return 'Đang hoạt động';
  const key = chuanHoaKhoaSoKhop(s);
  const exact = TRANG_THAI_HOAT_DONG.find((v) => chuanHoaKhoaSoKhop(v) === key);
  if (exact) return exact;
  if (s === '1') return 'Đang hoạt động';
  if (s === '0') return 'Ngừng hoạt động';
  return null;
}
