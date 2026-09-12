/**
 * Đọc / hiển thị số tiền trong ô nhập của sổ quỹ.
 *
 * Cán bộ gõ tiền theo thói quen tiếng Việt: `1.500.000` hoặc `1 500 000`, đôi khi
 * dán từ Excel ra thành `1,500,000`. Nếu đưa thẳng chuỗi đó vào `Number()` thì
 * ra `NaN` và phiếu bị từ chối mà không rõ lý do. Hàm dưới chuẩn hoá trước khi
 * kiểm tra, và **chỉ chấp nhận số dương** — đúng ràng buộc
 * `quy_so_thu_chi_so_tien_check` ở DB (hướng thu/chi nằm ở cột `loai`, không
 * bao giờ dùng số âm).
 */

/**
 * Ký tự phân cách hàng nghìn được chấp nhận khi nhập.
 *
 * Viết tường minh bằng mã Unicode, không dán ký tự thô: Word và Excel chèn dấu
 * cách KHÔNG NGẮT (U+00A0) và dấu cách hẹp không ngắt (U+202F) vào giữa các
 * nhóm chữ số. Người dán số vào ô nhập không hề nhìn thấy chúng, nên nếu không
 * chấp nhận thì họ sẽ gặp lỗi "số tiền chưa hợp lệ" trên một chuỗi trông hoàn
 * toàn bình thường.
 */
const KY_TU_PHAN_CACH = '.,\\s\'\\u00A0\\u202F';
const NHOM_NGHIN = new RegExp(`[${KY_TU_PHAN_CACH}]`, 'g');
const CHI_CHU_SO_VA_PHAN_CACH = new RegExp(`^[\\d${KY_TU_PHAN_CACH}]+$`);

/**
 * Trần trên của một dòng tiền: `Number.MAX_SAFE_INTEGER`.
 *
 * Cột DB là `numeric(18,2)` nên về lý thuyết nhận tới 9.999.999.999.999.999,99,
 * nhưng JavaScript **không biểu diễn chính xác** số nguyên vượt
 * `Number.MAX_SAFE_INTEGER` (≈ 9,007 × 10^15): mọi phép cộng dồn số dư từ đó
 * trở đi đều không còn đáng tin. Với sổ quỹ của một tỉnh thì mốc này (hơn 9
 * triệu tỷ đồng) là xa thực tế, nên từ chối an toàn hơn nhiều so với nhận rồi
 * cộng sai.
 */
export const SO_TIEN_TOI_DA = Number.MAX_SAFE_INTEGER;

/**
 * Chuyển chuỗi người dùng gõ thành số.
 *
 * Trả `null` khi không đọc được — người gọi hiện câu lỗi tiếng Việt, không tự
 * đoán 0 (0 đồng là một phiếu hợp lệ về cú pháp nhưng sai về nghiệp vụ, và DB
 * sẽ từ chối; đoán bừa chỉ làm lỗi khó hiểu hơn).
 */
export function parseTienInput(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;

  const s = raw.trim();
  if (s === '') return null;

  // Chỉ cho phép chữ số và dấu phân cách; chữ cái / ký hiệu tiền tệ ⇒ không đọc được.
  if (!CHI_CHU_SO_VA_PHAN_CACH.test(s)) return null;

  const cleaned = s.replace(NHOM_NGHIN, '');
  if (cleaned === '' || !/^\d+$/.test(cleaned)) return null;

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Số tiền hợp lệ cho một dòng sổ: đọc được, nguyên dương, trong ngưỡng cộng dồn an toàn. */
export function isSoTienHopLe(value: number | null): value is number {
  if (value == null || !Number.isFinite(value)) return false;
  if (value <= 0) return false;
  return value <= SO_TIEN_TOI_DA;
}

/** Hiển thị lại trong ô nhập: nhóm hàng nghìn bằng dấu chấm, không kèm "₫". */
export function formatTienInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
}
