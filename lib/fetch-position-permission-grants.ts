import type { ActionType } from '@/features/he-thong/phan-quyen/core/types';
import { getRoles } from '@/features/he-thong/phan-quyen/services/phan-quyen-service';
import { mergeModulePermissionsToGrants } from '@/lib/permission-merge';

/**
 * Lấy map `module_id → actions` theo `id_chuc_vu`.
 * Mock: đọc từ cùng nguồn màn Phân quyền (`getRoles`).
 *
 * Supabase: thay bằng RPC/view hoặc `.from('...').select(...)` theo chức vụ;
 * RLS/policy phía server vẫn là nguồn sự thật cho dữ liệu nhạy cảm.
 */
export async function fetchPositionPermissionGrants(
  id_chuc_vu: string
): Promise<Record<string, ActionType[]>> {
  const roles = await getRoles();
  const role = roles.find((r) => r.id_chuc_vu === id_chuc_vu);
  if (!role) return {};
  return mergeModulePermissionsToGrants(role.quyen_han);
}
