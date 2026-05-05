/** Bật ma trận quyền theo chức vụ (hydrate từ API / mock). Tắt = chỉ luật legacy admin/member. */
export function isPermissionMatrixEnabled(): boolean {
  return import.meta.env.VITE_USE_PERMISSION_MATRIX === 'true';
}
