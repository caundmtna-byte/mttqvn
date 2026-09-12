import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

export interface QuyViewer {
  /** True ⇒ bypass: `cap_bac === 1`, quan_tri (`admin`/`all`), `role=admin`, hoặc legacy khi chưa hydrate matrix. */
  canViewAll: boolean;
  /** `var_chuc_vu.cap_quan_ly` sau hydrate — Tỉnh / Xã phường / null. */
  chucVuCapQuanLy: CapQuanLy | null;
  /** `var_nhan_vien.don_vi_id` — dùng điền sẵn `quy_so_thu_chi.don_vi_id` khi Xã phường. */
  viewerDonViId: string | null;
}

/**
 * Viewer cho hai quỹ (Vì người nghèo / Cứu trợ) — dùng chung một dòng phân quyền
 * `an-sinh-xa-hoi/quy/so-thu-chi`, đúng như ghi chú ở `lib/permissions.ts`.
 *
 * Hiện chỉ phục vụ **điền sẵn đơn vị khi tạo phiếu**; phạm vi XEM của quỹ vẫn
 * chưa siết (mọi cấp còn thấy sổ của mọi đơn vị) — việc đó phải làm cùng RLS.
 */
export function useQuyViewer(): QuyViewer {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId = APP_RESOURCE_TO_MODULE.quySoThuChi ?? 'an-sinh-xa-hoi/quy/so-thu-chi';
    const allowed = grantsByModule[moduleId] ?? [];
    const canViewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      allowed.includes('admin') ||
      allowed.includes('all');
    const dv = user?.don_vi_id?.toString().trim();
    return {
      canViewAll,
      chucVuCapQuanLy: chucVuCapQuanLy ?? null,
      viewerDonViId: dv ? dv : null,
    };
  }, [user?.role, user?.don_vi_id, matrixActive, grantsByModule, chucVuCapBac, chucVuCapQuanLy]);
}
