/**
 * Người tạo / người cập nhật — embed PostgREST `var_nhan_vien(ho_va_ten,ten_tai_khoan)`
 * hoặc cột phẳng từ RPC. Dùng chung cho mục "Thông tin hệ thống" ở màn chi tiết.
 */
export interface NhanVienEmbed {
  ho_va_ten?: string | null;
  ten_tai_khoan?: string | null;
}

/** Họ tên, không có thì tên tài khoản; không có cả hai ⇒ `null`. */
export function tenNguoiThaoTac(nv: NhanVienEmbed | null | undefined): string | null {
  const ten = nv?.ho_va_ten?.trim() || nv?.ten_tai_khoan?.trim();
  return ten ? ten : null;
}

/** Embed PostgREST có thể là object hoặc mảng một phần tử. */
export function docNhanVienEmbed(v: unknown): NhanVienEmbed | null {
  const o = Array.isArray(v) ? v[0] : v;
  if (!o || typeof o !== 'object') return null;
  const r = o as Record<string, unknown>;
  return {
    ho_va_ten: r.ho_va_ten == null ? null : String(r.ho_va_ten),
    ten_tai_khoan: r.ten_tai_khoan == null ? null : String(r.ten_tai_khoan),
  };
}

/** Chuỗi embed cho select: `<alias>:var_nhan_vien!<fk>(ho_va_ten,ten_tai_khoan)`. */
export function nhanVienEmbedSelect(alias: string, fkName: string): string {
  return `${alias}:var_nhan_vien!${fkName}(ho_va_ten,ten_tai_khoan)`;
}
