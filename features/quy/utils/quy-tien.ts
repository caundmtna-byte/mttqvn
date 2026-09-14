/**
 * Đọc / hiển thị số tiền trong ô nhập của sổ quỹ.
 *
 * Luật đọc chuỗi đã chuyển lên `lib/number.ts` để mọi ô tiền trong app dùng
 * chung — trước đây bốn module mỗi nơi tự parse một kiểu, ba trong số đó sai
 * âm thầm. File này giữ lại tên gọi theo nghiệp vụ quỹ cho ba nơi đang dùng.
 *
 * Sổ quỹ **chỉ chấp nhận số dương** — đúng ràng buộc `quy_so_thu_chi_so_tien_check`
 * ở DB (hướng thu/chi nằm ở cột `loai`, không bao giờ dùng số âm).
 */
import { formatSoInput, parseSoInput } from '@/lib/number';

export { SO_TIEN_TOI_DA, isSoTienHopLe } from '@/lib/number';

/** Chuỗi người dùng gõ → số. Trả `null` khi không đọc được, không đoán 0. */
export function parseTienInput(raw: string | number | null | undefined): number | null {
  return parseSoInput(raw);
}

/** Hiển thị lại trong ô nhập: nhóm hàng nghìn bằng dấu chấm, không kèm "₫". */
export function formatTienInput(value: number | null | undefined): string {
  return formatSoInput(value);
}
