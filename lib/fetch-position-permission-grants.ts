import type { ActionType } from '@/features/he-thong/phan-quyen/core/types';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { resolveEffectiveCapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import { getRoleByChucVu } from '@/features/he-thong/phan-quyen/services/phan-quyen-service';
import { mergeModulePermissionsToGrants } from '@/lib/permission-merge';

export interface PositionPermissionGrantsPayload {
  grantsByModule: Record<string, ActionType[]>;
  chucVuCapBac: number | null;
  chucVuCapQuanLy: CapQuanLy | null;
}

/**
 * Lấy map `module_id → actions` theo `id_chuc_vu` + `cap_bac` chức vụ.
 * `nhanVienCapQuanLy`: mảng cap_quan_ly trực tiếp từ var_nhan_vien (thay vì từ var_chuc_vu).
 * Supabase: filter server-side `.eq('id_chuc_vu', ...)` — không load toàn bảng.
 * Mock: fallback getAll().find() trong getRoleByChucVu.
 */
export async function fetchPositionPermissionGrants(
  id_chuc_vu: string,
  nhanVienCapQuanLy?: string[],
): Promise<PositionPermissionGrantsPayload> {
  const role = await getRoleByChucVu(id_chuc_vu);
  if (!role) {
    return {
      grantsByModule: {},
      chucVuCapBac: null,
      chucVuCapQuanLy: resolveEffectiveCapQuanLy(nhanVienCapQuanLy ?? []),
    };
  }
  const cap =
    role.cap_bac != null && String(role.cap_bac).trim() !== '' && Number.isFinite(Number(role.cap_bac))
      ? Number(role.cap_bac)
      : null;
  return {
    grantsByModule: mergeModulePermissionsToGrants(role.quyen_han),
    chucVuCapBac: cap,
    chucVuCapQuanLy: resolveEffectiveCapQuanLy(nhanVienCapQuanLy ?? []),
  };
}
