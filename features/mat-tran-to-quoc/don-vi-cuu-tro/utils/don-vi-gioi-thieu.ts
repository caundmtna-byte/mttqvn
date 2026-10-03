import { txt } from '@/lib/text';
import { findRefStrict, type NamedRef } from '@/lib/data/import-cells';
import { chuanHoaKhoaVanBan } from '@/lib/data/import-plan';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

/**
 * "Đơn vị giới thiệu" — MỘT ô chọn trên form, HAI cột dưới DB. Bắt buộc:
 * không chọn xã/phường nào thì là MTTQ tỉnh.
 *   ('tinh', null)        → MTTQ tỉnh (mặc định)
 *   ('xa_phuong', <id>)   → một xã/phường cụ thể
 *
 * Trên form chỉ có một chuỗi: DON_VI_GIOI_THIEU_TINH | '<id xã/phường>'
 * ('' — ô trống từ file nhập — cũng quy về MTTQ tỉnh).
 */

export const DON_VI_GIOI_THIEU_LOAI = ['tinh', 'xa_phuong'] as const;
export type DonViGioiThieuLoai = (typeof DON_VI_GIOI_THIEU_LOAI)[number];

/** Sentinel cho "MTTQ tỉnh" — trùng quy ước đã dùng ở Kỳ họp / Uỷ viên uỷ ban. */
export const DON_VI_GIOI_THIEU_TINH = '__tinh_cap__';

export interface DonViGioiThieuPayload {
  don_vi_gioi_thieu_loai: DonViGioiThieuLoai;
  don_vi_gioi_thieu_id: number | null;
}

/** Giá trị ô chọn trên form → hai cột gửi lên DB. */
export function donViGioiThieuToPayload(value: string | null | undefined): DonViGioiThieuPayload {
  const tinh: DonViGioiThieuPayload = { don_vi_gioi_thieu_loai: 'tinh', don_vi_gioi_thieu_id: null };
  const v = String(value ?? '').trim();
  if (v === '' || v === DON_VI_GIOI_THIEU_TINH) return tinh;
  const id = Number(v);
  if (!Number.isFinite(id) || id <= 0) return tinh;
  return { don_vi_gioi_thieu_loai: 'xa_phuong', don_vi_gioi_thieu_id: id };
}

/** Hai cột đọc từ DB → giá trị ô chọn trên form. */
export function donViGioiThieuToFormValue(
  loai: string | null | undefined,
  id: string | number | null | undefined,
): string {
  if (loai === 'xa_phuong' && id != null && String(id) !== '') return String(id);
  return DON_VI_GIOI_THIEU_TINH;
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
  if (loai === 'xa_phuong') return (tenXaPhuong ?? '').trim();
  // NULL chỉ còn ở dữ liệu trước migration bắt buộc — cũng là MTTQ tỉnh.
  return txt('matTranDonViCuuTro.tinhCap');
}

/* ------------------------------------------------------------------ *
 * Tài khoản cấp xã: ô "Đơn vị giới thiệu" khoá cứng về xã/phường của mình
 * ------------------------------------------------------------------ */

export interface DonViGioiThieuScopeInput {
  /** cap_bac = 1, quan_tri, role admin, hoặc ma trận chưa hydrate. */
  canViewAll: boolean;
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — id xã/phường của người đăng nhập. */
  viewerDonViId: string | null;
}

export interface DonViGioiThieuScope {
  /** True ⇒ ô chọn bị khoá, người dùng không đổi được. */
  khoa: boolean;
  /** Giá trị điền sẵn khi thêm mới; `null` = cấp xã nhưng tài khoản chưa gán xã. */
  xaPhuongId: string | null;
}

/**
 * Cán bộ cấp xã chỉ giới thiệu nhà tài trợ cho chính xã mình — điền sẵn, khoá ô.
 * Tỉnh / quản trị / chức vụ chưa phân cấp ⇒ chọn tự do như cũ.
 */
export function donViGioiThieuScope(input: DonViGioiThieuScopeInput): DonViGioiThieuScope {
  if (input.canViewAll || input.chucVuCapQuanLy !== 'Xã phường') return { khoa: false, xaPhuongId: null };
  const dv = input.viewerDonViId?.trim();
  return { khoa: true, xaPhuongId: dv ? dv : null };
}

/* ------------------------------------------------------------------ *
 * Tên nhà tài trợ là duy nhất (unique index `uq_kho_don_vi_cuu_tro_ten_lower`)
 * ------------------------------------------------------------------ */

/**
 * Bản ghi KHÁC đang mang cùng tên (so như unique index dưới DB: bỏ khoảng trắng
 * thừa, không phân biệt hoa thường). `boQuaId` = bản ghi đang sửa.
 */
export function timDonViTrungTen<T extends { id: string; ten: string }>(
  ten: string,
  rows: readonly T[],
  boQuaId?: string | null,
): T | undefined {
  const khoa = chuanHoaKhoaVanBan(ten);
  if (!khoa) return undefined;
  return rows.find((r) => r.id !== boQuaId && chuanHoaKhoaVanBan(r.ten) === khoa);
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
  | { ok: false; ten: string; reason: 'missing' | 'ambiguous' };

/**
 * Tên (hoặc id) trong file nhập → giá trị dùng cho form (rồi qua
 * `donViGioiThieuToPayload`). `xaPhuong` là danh mục nạp một lần trước vòng lặp.
 * Khớp NGUYÊN VẸN tên sau khi bỏ dấu; hai xã trùng tên ⇒ báo lỗi thay vì lấy bừa.
 */
export function resolveDonViGioiThieuImport(
  raw: unknown,
  xaPhuong: readonly NamedRef[],
): DonViGioiThieuImportResult {
  const ten = String(raw ?? '').trim();
  if (ten === '') return { ok: true, value: DON_VI_GIOI_THIEU_TINH };

  if (TEN_CAP_TINH.has(chuanHoaTenDonVi(ten))) return { ok: true, value: DON_VI_GIOI_THIEU_TINH };

  const hit = findRefStrict(xaPhuong, ten);
  if (hit.ok && hit.ref) return { ok: true, value: String(hit.ref.id) };
  return { ok: false, ten, reason: !hit.ok && hit.reason === 'ambiguous' ? 'ambiguous' : 'missing' };
}
