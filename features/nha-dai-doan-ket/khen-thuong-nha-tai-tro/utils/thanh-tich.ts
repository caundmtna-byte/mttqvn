import { KTNT_NAM_MAX, KTNT_NAM_MIN } from '../core/constants';
import type { KtntThanhTich } from '../core/types';

/**
 * Tổng giá trị đóng góp = tiền mặt + hiện vật quy đổi + hàng nhập kho + đóng góp
 * khác. Bản sao công thức cột `tong_gia_tri` trong RPC `get_ktnt_page` — sửa một
 * bên phải sửa cả bên kia.
 */
export function tongGiaTriKtnt(
  tt: Pick<KtntThanhTich, 'tien_mat' | 'hien_vat_quy_doi' | 'gia_tri_nhap_kho'>,
  giaTriKhac: number | null | undefined,
): number {
  const n = (v: number | null | undefined) => (v != null && Number.isFinite(v) ? v : 0);
  return n(tt.tien_mat) + n(tt.hien_vat_quy_doi) + n(tt.gia_tri_nhap_kho) + n(giaTriKhac);
}

export type KtntKyNam =
  | { ok: true; tuNam: number | null; denNam: number | null }
  | { ok: false };

/**
 * Đọc kỳ thành tích đang gõ trong form (chuỗi). Trống = không giới hạn; năm lẻ,
 * ngoài 2000–2100 hoặc "từ" > "đến" ⇒ không hợp lệ (không gọi RPC tự tính).
 */
export function docKyNamKtnt(tu: string | null | undefined, den: string | null | undefined): KtntKyNam {
  const doc = (s: string | null | undefined): number | null | undefined => {
    const t = s?.trim() ?? '';
    if (t === '') return null;
    const n = Number(t);
    return Number.isInteger(n) && n >= KTNT_NAM_MIN && n <= KTNT_NAM_MAX ? n : undefined;
  };
  const tuNam = doc(tu);
  const denNam = doc(den);
  if (tuNam === undefined || denNam === undefined) return { ok: false };
  if (tuNam != null && denNam != null && tuNam > denNam) return { ok: false };
  return { ok: true, tuNam, denNam };
}
