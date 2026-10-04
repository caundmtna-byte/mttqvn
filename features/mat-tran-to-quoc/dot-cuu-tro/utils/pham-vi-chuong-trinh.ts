import {
  isKhoPhamViUnrestricted,
  type KhoPhamViViewer,
} from '../../danh-sach-kho/utils/pham-vi-kho';
import { DOT_TRANG_THAI_DANG_TRIEN_KHAI } from '../core/constants';

/**
 * Phạm vi Chương trình vận động — cùng luật với kho (`pham-vi-kho.ts`):
 * quản trị / Tỉnh / chức vụ chưa phân cấp ⇒ mọi chương trình; cán bộ Xã phường ⇒ chỉ
 * chương trình do xã mình chủ trì ("chương trình xã nào tạo chỉ xã đó thấy").
 *
 * Bản sao luật RLS của `tn_tiep_nhan` (policy `tn_tiep_nhan_*`, migration
 * `20261004170000_pham_vi_tinh_mot_lan`) và bộ lọc trong `get_tn_tiep_nhan_page` — DB
 * mới là nơi chặn thật. Riêng danh sách chương trình chỉ lọc ở client: phiếu XUẤT của
 * kho xã vẫn phải chọn được chương trình của tỉnh.
 */
export interface ChuongTrinhDonViChuTri {
  don_vi_chu_tri_loai: 'tinh' | 'xa_phuong';
  don_vi_chu_tri_id: string | null;
}

export function chuongTrinhTrongPhamVi(viewer: KhoPhamViViewer, ct: ChuongTrinhDonViChuTri): boolean {
  if (isKhoPhamViUnrestricted(viewer)) return true;
  if (!viewer.viewerDonViId) return false;
  return ct.don_vi_chu_tri_loai === 'xa_phuong' && ct.don_vi_chu_tri_id === viewer.viewerDonViId;
}

/**
 * Chương trình chọn được cho một khoản Tiếp nhận: trong phạm vi VÀ đang triển khai.
 * `giuId` — chương trình đang gắn trên khoản cũ, giữ lại để ô không trống khi sửa.
 */
export function chuongTrinhChonDuocChoTiepNhan<
  T extends ChuongTrinhDonViChuTri & { id: string; trang_thai: string },
>(rows: readonly T[], viewer: KhoPhamViViewer, giuId?: string | null): T[] {
  return rows.filter(
    (r) =>
      (giuId != null && r.id === giuId) ||
      (r.trang_thai === DOT_TRANG_THAI_DANG_TRIEN_KHAI && chuongTrinhTrongPhamVi(viewer, r)),
  );
}
