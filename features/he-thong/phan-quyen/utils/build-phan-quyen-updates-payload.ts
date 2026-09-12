import type { ActionType } from '../core/types';
import { actionsToQuyenText } from '../core/var-phan-quyen-quyen-map';

/** Một chức vụ trong payload `rpc_phan_quyen_cap_nhat_module`. */
export interface PhanQuyenUpdateRpcRow {
  chuc_vu_id: number;
  /** Chuỗi token tiếng Việt; rỗng = gỡ hết quyền của chức vụ đó trên module. */
  quyen: string;
}

/** `roleId` của UI là id chức vụ dạng chuỗi; bỏ qua giá trị không hợp lệ. */
export function parseChucVuId(raw: string): number | null {
  const n = Number(String(raw).trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Gộp danh sách sửa của UI thành payload RPC: mỗi chức vụ đúng một dòng (RPC xoá
 * theo chuc_vu_id rồi chèn lại, trùng dòng sẽ vi phạm UNIQUE). Chức vụ không còn
 * hành động nào vẫn phải có mặt với `quyen` rỗng — đó là tín hiệu gỡ quyền.
 */
export function buildPhanQuyenUpdatesPayload(
  updates: { roleId: string; actions: ActionType[] }[],
): PhanQuyenUpdateRpcRow[] {
  const byChucVu = new Map<number, string>();
  for (const { roleId, actions } of updates) {
    const chucVuId = parseChucVuId(roleId);
    if (chucVuId == null) continue;
    byChucVu.set(chucVuId, actions.length > 0 ? actionsToQuyenText(actions) : '');
  }
  return [...byChucVu].map(([chuc_vu_id, quyen]) => ({ chuc_vu_id, quyen }));
}
