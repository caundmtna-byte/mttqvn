import type { ActionType } from '@/features/he-thong/phan-quyen/core/types';
import { getRoleByChucVu } from '@/features/he-thong/phan-quyen/services/phan-quyen-service';
import { mergeModulePermissionsToGrants } from '@/lib/permission-merge';

/**
 * Lấy map `module_id → actions` theo `id_chuc_vu`.
 * Supabase: filter server-side `.eq('id_chuc_vu', ...)` — không load toàn bảng.
 * Mock: fallback getAll().find() trong getRoleByChucVu.
 */
export async function fetchPositionPermissionGrants(
  id_chuc_vu: string
): Promise<Record<string, ActionType[]>> {
  const role = await getRoleByChucVu(id_chuc_vu);
  if (!role) return {};
  return mergeModulePermissionsToGrants(role.quyen_han);
}
