import { useMemo } from 'react';
import { APP_RESOURCE_TO_MODULE, isChucVuCapBacOne } from '@/lib/permissions';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { donViGioiThieuScope, type DonViGioiThieuScope } from '../utils/don-vi-gioi-thieu';

/**
 * Ô "Đơn vị giới thiệu" trên form: tài khoản cấp xã bị khoá về xã/phường của mình.
 * Tín hiệu giống `use-ho-ngheo-viewer.ts`; luật thuần ở `donViGioiThieuScope`.
 */
export function useDonViGioiThieuScope(): DonViGioiThieuScope {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);
  const chucVuCapQuanLy = usePermissionGrantStore((s) => s.chucVuCapQuanLy);

  return useMemo(() => {
    const moduleId = APP_RESOURCE_TO_MODULE.matTranReliefSupportUnits ?? 'nghia-tinh-dong-lam/nha-tai-tro';
    const allowed = grantsByModule[moduleId] ?? [];
    const canViewAll =
      user?.role === 'admin' ||
      !matrixActive ||
      isChucVuCapBacOne(chucVuCapBac) ||
      allowed.includes('admin') ||
      allowed.includes('all');
    return donViGioiThieuScope({
      canViewAll,
      chucVuCapQuanLy: chucVuCapQuanLy ?? null,
      viewerDonViId: user?.don_vi_id?.toString() ?? null,
    });
  }, [user?.role, user?.don_vi_id, matrixActive, grantsByModule, chucVuCapBac, chucVuCapQuanLy]);
}
