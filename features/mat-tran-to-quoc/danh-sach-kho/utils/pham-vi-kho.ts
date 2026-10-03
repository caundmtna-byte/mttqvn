import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import type { NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';

/**
 * Phạm vi kho của người dùng — dùng chung cho Danh sách kho, Nhập xuất kho, Tồn kho, Báo cáo hỗ trợ.
 *
 * Đây là BẢN SAO của luật dưới DB (`fn_kho_xem_tat_ca`, `fn_kho_cua_toi`, `fn_kho_phieu_ghi_duoc`,
 * migration `20261003140000_kho_rls_pham_vi_xa.sql`). DB mới là lớp chặn thật; sửa một bên phải sửa
 * cả bên kia — `pham-vi-kho.test.ts` đối chiếu với `supabase/schema.sql`.
 *
 * - Chỉ cán bộ **Xã phường** bị giới hạn; quản trị / Tỉnh / không có cấp → mọi kho.
 * - ĐỌC phiếu: kho xuất HOẶC kho nhập thuộc xã mình.
 * - GHI phiếu: kho chính (`khoChinhCuaPhieu`) thuộc xã mình; kho nhập của chuyển kho để tự do.
 * - Xã chưa gán đơn vị ⇒ không kho nào.
 */
export interface KhoPhamViViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_nhan_vien.cap_quan_ly` sau chuẩn hoá — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — so khớp `kho_danh_sach_kho.don_vi_id`. */
  viewerDonViId: string | null;
}

type KhoCoDonVi = { id: string; don_vi_id: string | null };

export function isKhoPhamViUnrestricted(viewer: KhoPhamViViewer): boolean {
  return viewer.canViewAll || viewer.chucVuCapQuanLy !== 'Xã phường';
}

/** Kho có thuộc phạm vi của viewer không (xã mình, hoặc viewer không bị giới hạn). */
export function khoTrongPhamVi(viewer: KhoPhamViViewer, kho: { don_vi_id: string | null }): boolean {
  if (isKhoPhamViUnrestricted(viewer)) return true;
  if (!viewer.viewerDonViId) return false;
  return String(kho.don_vi_id ?? '').trim() === viewer.viewerDonViId;
}

/** Tập `kho_id` viewer được thấy. `null` = không giới hạn; `[]` = không kho nào. */
export function getViewerKhoIds(viewer: KhoPhamViViewer, khoList: readonly KhoCoDonVi[]): string[] | null {
  if (isKhoPhamViUnrestricted(viewer)) return null;
  return khoList.filter((k) => khoTrongPhamVi(viewer, k)).map((k) => k.id);
}

/** Kho quyết định phạm vi GHI của phiếu — khớp `fn_kho_phieu_ghi_duoc`. */
export function khoChinhCuaPhieu(loai: NhapXuatKhoLoaiPhieu): 'kho_nhap_id' | 'kho_xuat_id' {
  return loai === 'nhap_ngoai' ? 'kho_nhap_id' : 'kho_xuat_id';
}

/**
 * Kho chọn được cho ô kho chính trên form phiếu. `giuId`: kho đang gắn trên phiếu cũ — vẫn giữ
 * để ô không bị trống khi sửa.
 */
export function locKhoTheoPhamVi<T extends KhoCoDonVi>(
  rows: readonly T[],
  viewer: KhoPhamViViewer,
  giuId?: string | null,
): T[] {
  return rows.filter((k) => khoTrongPhamVi(viewer, k) || (giuId != null && k.id === giuId));
}

/** Xã chỉ có đúng một kho ⇒ id kho đó để tự điền; còn lại `null` (để người dùng chọn). */
export function khoTuDienTheoXa<T extends { id: string }>(khoCuaXa: readonly T[]): string | null {
  return khoCuaXa.length === 1 ? khoCuaXa[0].id : null;
}
