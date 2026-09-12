import type { MttqTangLuongViewer } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/hooks/use-mttq-tang-luong-viewer';
import type { HomeTangLuongScope } from '../services/home-tang-luong-service';

/**
 * Dịch viewer của module Tăng lương sang tham số phạm vi cho RPC đếm.
 *
 * Phải khớp `canViewTangLuongRow`, và module này có BA nhánh:
 *   · bypass       → đếm toàn bộ;
 *   · cấp Tỉnh     → chỉ cán bộ có 'Tỉnh' trong `cap_quan_ly` (thuộc tính CÁN BỘ,
 *                    không phải đơn vị — đây là chỗ dễ làm sai nhất);
 *   · cấp Xã phường→ chỉ cán bộ cùng đơn vị; chưa được gán đơn vị thì trả `null`
 *                    để KHÔNG phát truy vấn — đếm "không lọc" là lộ số liệu lương
 *                    toàn tỉnh.
 */
export function resolveTangLuongHomeScope(viewer: MttqTangLuongViewer): HomeTangLuongScope | null {
  if (viewer.canViewAll) return { kieu: 'all', viewerDonViId: null };
  if (viewer.chucVuCapQuanLy === 'Tỉnh') return { kieu: 'tinh', viewerDonViId: null };
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return null;
    return { kieu: 'xa_phuong', viewerDonViId: viewer.viewerDonViId };
  }
  // Cấp khác: hàm gate ở client trả `true` ⇒ không giới hạn.
  return { kieu: 'all', viewerDonViId: null };
}
