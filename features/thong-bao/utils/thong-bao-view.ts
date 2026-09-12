/**
 * Logic thuần của hộp thông báo: thứ tự hiển thị, số trên chuông, mô tả thời
 * gian, và kiểm tra đường dẫn trước khi cho bấm. Không chạm React, không chạm
 * Supabase — đây là phần đáng viết test.
 */
import type { ThongBao } from '../core/types';

/** Ngưỡng hiển thị trên huy hiệu chuông: quá mức này thì ghi "99+". */
export const SO_CHUA_DOC_TOI_DA = 99;

/**
 * Thứ tự trong chuông: **chưa đọc lên trên**, trong mỗi nhóm thì mới nhất trước.
 *
 * Không sắp ở database bằng `ORDER BY da_doc, tg_tao DESC` rồi thôi, vì sau khi
 * người dùng bấm "đánh dấu đã đọc" thì cache được vá tại chỗ — dòng vừa đọc phải
 * tự trôi xuống mà không cần gọi lại máy chủ.
 *
 * Trả về mảng MỚI, không sửa mảng đầu vào (cache TanStack Query là bất biến).
 */
export function sapXepThongBao(danhSach: readonly ThongBao[]): ThongBao[] {
  return [...danhSach].sort((a, b) => {
    if (a.da_doc !== b.da_doc) return a.da_doc ? 1 : -1;
    const ta = Date.parse(a.tg_tao);
    const tb = Date.parse(b.tg_tao);
    // Mốc thời gian hỏng thì đẩy xuống cuối nhóm thay vì làm loạn thứ tự.
    const va = Number.isNaN(ta) ? -Infinity : ta;
    const vb = Number.isNaN(tb) ? -Infinity : tb;
    if (va !== vb) return vb - va;
    return Number(b.id) - Number(a.id);
  });
}

/** Số hiển thị trên huy hiệu chuông. 0 ⇒ chuỗi rỗng (không vẽ huy hiệu). */
export function nhanSoChuaDoc(so: number): string {
  if (!Number.isFinite(so) || so <= 0) return '';
  if (so > SO_CHUA_DOC_TOI_DA) return `${SO_CHUA_DOC_TOI_DA}+`;
  return String(Math.floor(so));
}

/**
 * Đường dẫn an toàn để bấm vào.
 *
 * Bảng `thong_bao` chỉ do hàm sinh phía database ghi, nhưng đây vẫn là dữ liệu
 * đọc từ máy chủ và được nhét thẳng vào `<Link to=…>`. Chỉ chấp nhận đường dẫn
 * NỘI BỘ: bắt đầu bằng đúng một dấu `/`. Chặn `http://…`, `javascript:…` và
 * `//evil.example` (trình duyệt hiểu dạng này là sang tên miền khác).
 */
export function duongDanAnToan(duongDan: string | null | undefined): string | null {
  if (duongDan == null) return null;
  const s = duongDan.trim();
  if (!s.startsWith('/')) return null;
  if (s.startsWith('//')) return null;
  if (s.includes('\\')) return null;
  return s;
}

const PHUT = 60_000;
const GIO = 60 * PHUT;
const NGAY = 24 * GIO;

function haiChuSo(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Mô tả thời gian cho cán bộ đọc, không dùng thuật ngữ kỹ thuật.
 * Dưới 1 phút → "Vừa xong"; trong ngày → "N phút/giờ trước"; xa hơn → ngày tháng.
 */
export function moTaThoiGian(tgTao: string, bayGio: Date = new Date()): string {
  const t = Date.parse(tgTao);
  if (Number.isNaN(t)) return '';
  const lech = bayGio.getTime() - t;
  if (lech < PHUT) return 'Vừa xong';
  if (lech < GIO) return `${Math.floor(lech / PHUT)} phút trước`;
  if (lech < NGAY) return `${Math.floor(lech / GIO)} giờ trước`;
  if (lech < 2 * NGAY) return 'Hôm qua';
  const d = new Date(t);
  return `${haiChuSo(d.getDate())}/${haiChuSo(d.getMonth() + 1)}/${d.getFullYear()}`;
}
