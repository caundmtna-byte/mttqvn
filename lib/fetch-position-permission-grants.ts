import type { ActionType } from '@/features/he-thong/phan-quyen/core/types';
import { getRoleByChucVu } from '@/features/he-thong/phan-quyen/services/phan-quyen-service';
import { mergeModulePermissionsToGrants } from '@/lib/permission-merge';

export interface PositionPermissionGrantsPayload {
  grantsByModule: Record<string, ActionType[]>;
  chucVuCapBac: number | null;
}

/**
 * Lấy map `module_id → actions` theo `id_chuc_vu` + `cap_bac` chức vụ.
 * Supabase: filter server-side `.eq('id_chuc_vu', ...)` — không load toàn bảng.
 * Mock: fallback getAll().find() trong getRoleByChucVu.
 */
export async function fetchPositionPermissionGrants(id_chuc_vu: string): Promise<PositionPermissionGrantsPayload> {
  const role = await getRoleByChucVu(id_chuc_vu);
  if (!role) {
    return { grantsByModule: {}, chucVuCapBac: null };
  }
  const cap =
    role.cap_bac != null && String(role.cap_bac).trim() !== '' && Number.isFinite(Number(role.cap_bac))
      ? Number(role.cap_bac)
      : null;
  return {
    grantsByModule: mergeModulePermissionsToGrants(role.quyen_han),
    chucVuCapBac: cap,
  };
}
