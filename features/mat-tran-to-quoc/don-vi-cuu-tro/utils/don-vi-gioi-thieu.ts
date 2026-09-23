import { txt } from '@/lib/text';

/**
 * "Đơn vị giới thiệu" — MỘT ô chọn trên form, HAI cột dưới DB.
 *
 * DB tách hai cột để phân biệt rõ ba trạng thái; một khoá ngoại nullable đơn độc
 * sẽ trộn "MTTQ tỉnh giới thiệu" với "chưa ai nhập":
 *   (null, null)          → chưa nhập
 *   ('tinh', null)        → MTTQ tỉnh
 *   ('xa_phuong', <id>)   → một xã/phường cụ thể
 *
 * Trên form chỉ có một chuỗi: '' | DON_VI_GIOI_THIEU_TINH | '<id xã/phường>'.
 */

export const DON_VI_GIOI_THIEU_LOAI = ['tinh', 'xa_phuong'] as const;
export type DonViGioiThieuLoai = (typeof DON_VI_GIOI_THIEU_LOAI)[number];

/** Sentinel cho "MTTQ tỉnh" — trùng quy ước đã dùng ở Kỳ họp / Uỷ viên uỷ ban. */
export const DON_VI_GIOI_THIEU_TINH = '__tinh_cap__';

export interface DonViGioiThieuPayload {
  don_vi_gioi_thieu_loai: DonViGioiThieuLoai | null;
  don_vi_gioi_thieu_id: number | null;
}

/** Giá trị ô chọn trên form → hai cột gửi lên DB. */
export function donViGioiThieuToPayload(value: string | null | undefined): DonViGioiThieuPayload {
  const v = String(value ?? '').trim();
  if (v === '') return { don_vi_gioi_thieu_loai: null, don_vi_gioi_thieu_id: null };
  if (v === DON_VI_GIOI_THIEU_TINH) return { don_vi_gioi_thieu_loai: 'tinh', don_vi_gioi_thieu_id: null };
  const id = Number(v);
  if (!Number.isFinite(id) || id <= 0) {
    return { don_vi_gioi_thieu_loai: null, don_vi_gioi_thieu_id: null };
  }
  return { don_vi_gioi_thieu_loai: 'xa_phuong', don_vi_gioi_thieu_id: id };
}

/** Hai cột đọc từ DB → giá trị ô chọn trên form. */
export function donViGioiThieuToFormValue(
  loai: string | null | undefined,
  id: string | number | null | undefined,
): string {
  if (loai === 'tinh') return DON_VI_GIOI_THIEU_TINH;
  if (loai === 'xa_phuong' && id != null && String(id) !== '') return String(id);
  return '';
}

/** Chuẩn hoá giá trị `don_vi_gioi_thieu_loai` đọc từ DB. */
export function parseDonViGioiThieuLoai(raw: unknown): DonViGioiThieuLoai | null {
  const s = String(raw ?? '').trim();
  if (s === 'tinh' || s === 'xa_phuong') return s;
  return null;
}

/**
 * Nhãn hiển thị ở bảng / chi tiết / file xuất.
 * `tenXaPhuong` là tên lấy từ join; thiếu tên thì trả chuỗi rỗng chứ không bịa.
 */
export function donViGioiThieuLabel(
  loai: DonViGioiThieuLoai | null,
  tenXaPhuong: string | null | undefined,
): string {
  if (loai === 'tinh') return txt('matTranDonViCuuTro.tinhCap');
  if (loai === 'xa_phuong') return (tenXaPhuong ?? '').trim();
  return '';
}

/* ------------------------------------------------------------------ *
 * Nhập từ file Excel
 *
 * Trong file nhập, "Đơn vị giới thiệu" là TÊN chứ không phải id. Tra tên về
 * đúng xã/phường; gõ sai thì báo lỗi dòng chứ không im lặng bỏ trống — một ô
 * bỏ trống lặng lẽ không để lại dấu vết nào trên giao diện.
 * ------------------------------------------------------------------ */

/** Chuẩn hoá tên để so khớp: bỏ dấu cách thừa, về chữ thường. */
export function chuanHoaTenDonVi(raw: unknown): string {
  return String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Các cách người dùng hay gõ để chỉ MTTQ cấp tỉnh. */
const TEN_CAP_TINH = new Set(['mttq tỉnh', 'mttq tinh', 'tỉnh', 'tinh', 'cấp tỉnh', 'cap tinh']);

export type DonViGioiThieuImportResult =
  | { ok: true; value: string }
  | { ok: false; ten: string };

/**
 * Tên trong file nhập → giá trị dùng cho form (rồi qua `donViGioiThieuToPayload`).
 * `xaPhuongTheoTen` là map tên đã chuẩn hoá → id, dựng một lần trước vòng lặp.
 */
export function resolveDonViGioiThieuImport(
  raw: unknown,
  xaPhuongTheoTen: Map<string, string>,
): DonViGioiThieuImportResult {
  const ten = String(raw ?? '').trim();
  if (ten === '') return { ok: true, value: '' };

  const khoa = chuanHoaTenDonVi(ten);
  if (TEN_CAP_TINH.has(khoa)) return { ok: true, value: DON_VI_GIOI_THIEU_TINH };

  const id = xaPhuongTheoTen.get(khoa);
  if (id) return { ok: true, value: String(id) };

  return { ok: false, ten };
}
