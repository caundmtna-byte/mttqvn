import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

/** Resolve giá trị bigint hợp lệ từ id dạng string/number (Supabase trả bigint as string). */
function toBigintOrNull(value: string | number | null | undefined): number | null {
  if (value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

export interface TaskReportViewer {
  /** `var_nhan_vien.id` (bigint) hoặc null nếu chưa map / mock mode. */
  viewerId: number | null;
  /** `var_nhan_vien.don_vi_id` của viewer hoặc null. */
  viewerDonViId: number | null;
  /**
   * `var_nhan_vien.id_phong_ban`. Hiện **luôn `null`**: cấp Tỉnh đã chuyển sang `viewAll`,
   * và cấp Xã phường phải lọc theo đơn vị chứ không theo phòng ban. Giữ trường để RPC
   * `cong_viec_bao_cao_*` không phải đổi chữ ký.
   */
  viewerPhongBanId: number | null;
  /** True ⇒ bypass mọi gating: cap_bac=1, quan_tri/admin, mock admin, hoặc legacy mode. */
  viewAll: boolean;
}

export interface TaskReportViewerInput {
  role: string | null | undefined;
  nhanVienId: string | number | null | undefined;
  donViId: string | number | null | undefined;
  phongBanId: string | number | null | undefined;
  matrixActive: boolean;
  grantsByModule: Record<string, readonly string[]>;
  chucVuCapBac: number | null;
  chucVuCapQuanLy: CapQuanLy | null;
}

/**
 * Hàm thuần dựng viewer — tách khỏi hook để unit-test được
 * (cùng kiểu với `buildBaoCaoUyVienViewerFromGrants`).
 *
 * `viewAll` (xem toàn hệ thống):
 * - `role === 'admin'`: mock admin.
 * - `!matrixActive`: chế độ legacy, chưa hydrate matrix.
 * - `cap_bac === 1`: cấp lãnh đạo.
 * - Token `admin` / `all` (map từ `quan_tri`) trên module báo cáo.
 * - `cap_quan_ly === 'Tỉnh'`: thống nhất với BC thống kê bài viết.
 *
 * Khi không `viewAll`, **chỉ gửi đúng MỘT tiêu chí phạm vi** — RPC ghép các tham số
 * bằng `OR`, nên gửi thừa là nới quyền:
 * - Xã phường → chỉ `viewerDonViId`; `viewerPhongBanId` phải là `null`, nếu không
 *   user xã sẽ thấy thêm mọi việc của người cùng phòng ban ở đơn vị khác.
 * - Còn lại (không có cấp quản lý) → chỉ `viewerId`: việc mình tạo / hỗ trợ / phụ trách.
 */
export function buildTaskReportViewer(input: TaskReportViewerInput): TaskReportViewer {
  const moduleId = APP_RESOURCE_TO_MODULE.taskReports ?? 'quan-ly-giao-viec/bao-cao-cong-viec';
  const allowed = input.grantsByModule[moduleId] ?? [];
  const viewAll =
    input.role === 'admin' ||
    !input.matrixActive ||
    isChucVuCapBacOne(input.chucVuCapBac) ||
    allowed.includes('admin') ||
    allowed.includes('all') ||
    input.chucVuCapQuanLy === 'Tỉnh';

  const viewerId = toBigintOrNull(input.nhanVienId);

  if (viewAll) {
    return { viewerId, viewerDonViId: null, viewerPhongBanId: null, viewAll: true };
  }

  if (input.chucVuCapQuanLy === 'Xã phường') {
    return {
      viewerId,
      viewerDonViId: toBigintOrNull(input.donViId),
      viewerPhongBanId: null,
      viewAll: false,
    };
  }

  return { viewerId, viewerDonViId: null, viewerPhongBanId: null, viewAll: false };
}

/** Viewer cho RPC `cong_viec_bao_cao_*`. Xem `buildTaskReportViewer` cho quy tắc. */
export function useTaskReportViewer(): TaskReportViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(
    () =>
      buildTaskReportViewer({
        role: user?.role,
        nhanVienId: user?.nhan_vien_id,
        donViId: user?.don_vi_id,
        phongBanId: user?.id_phong_ban,
        matrixActive,
        grantsByModule,
        chucVuCapBac,
        chucVuCapQuanLy,
      }),
    [
      user?.role,
      user?.nhan_vien_id,
      user?.don_vi_id,
      user?.id_phong_ban,
      matrixActive,
      grantsByModule,
      chucVuCapBac,
      chucVuCapQuanLy,
    ],
  );
}

/** True khi đã đủ dữ liệu viewer để gọi RPC — tránh gọi với phạm vi rỗng. */
export function canLoadTaskReport(viewer: TaskReportViewer): boolean {
  if (viewer.viewAll) return true;
  return viewer.viewerDonViId != null || viewer.viewerId != null;
}
