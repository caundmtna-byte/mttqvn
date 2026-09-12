/**
 * Phạm vi dòng cho thẻ "Kỳ họp sắp tới" ở Trang chủ.
 *
 * Đây là bản dịch **nguyên văn** quy tắc của `canViewKyHopRow` (module Kỳ họp) sang
 * dạng điều kiện lọc gửi thẳng cho PostgREST — vì Trang chủ chỉ đếm chứ không kéo dòng
 * về lọc ở client. Nếu hai nơi lệch nhau thì cán bộ cấp xã sẽ đếm được kỳ họp của
 * đơn vị khác (RLS Supabase vẫn là `USING (true)`), nên mọi nhánh ở đây đều có test
 * đối chiếu trực tiếp với `canViewKyHopRow`.
 *
 * - `all`       — xem hết (bypass hoặc cấp Tỉnh).
 * - `don_vi`    — cấp Xã phường: chỉ kỳ họp cùng `don_vi_id`.
 * - `nguoi_tao` — không có cấp quản lý: chỉ kỳ họp do mình tạo.
 * - `none`      — không đủ dữ liệu để xác định phạm vi ⇒ **không đếm gì cả**
 *                 (cấp Xã phường mà nhân viên chưa gắn đơn vị, hoặc tài khoản chưa gắn hồ sơ).
 */
import type { MttqKyHopViewer } from '@/features/mat-tran-to-quoc/ky-hop/hooks/use-mttq-ky-hop-viewer';

export type KyHopUpcomingScope =
  | { kind: 'all' }
  | { kind: 'don_vi'; donViId: string }
  | { kind: 'nguoi_tao'; nhanVienId: string }
  | { kind: 'none' };

export function resolveKyHopUpcomingScope(viewer: MttqKyHopViewer): KyHopUpcomingScope {
  if (viewer.canViewAll) return { kind: 'all' };
  if (viewer.chucVuCapQuanLy === 'Tỉnh') return { kind: 'all' };
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    const dv = viewer.viewerDonViId?.trim();
    return dv ? { kind: 'don_vi', donViId: dv } : { kind: 'none' };
  }
  const nv = viewer.viewerNhanVienId?.trim();
  return nv ? { kind: 'nguoi_tao', nhanVienId: nv } : { kind: 'none' };
}

/** Có phạm vi hợp lệ để phát truy vấn đếm hay không. */
export function canCountKyHop(scope: KyHopUpcomingScope): boolean {
  return scope.kind !== 'none';
}
