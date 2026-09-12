import type { MttqTapHuanFormValues } from '../core/schema';

/** Một dòng cán bộ gửi xuống `rpc_tap_huan_*`. `id` chỉ có với dòng đã lưu. */
export interface MttqTapHuanChiTietRpcLine {
  id?: string;
  can_bo_id: string;
  thuoc_dien: string;
}

/** Dòng đã lưu trên DB có id toàn chữ số; dòng mới thêm trong form thì không. */
export function isPersistedChildId(id: unknown): id is string {
  if (id == null || typeof id !== 'string') return false;
  return /^\d+$/.test(id.trim());
}

/**
 * Dựng mảng `p_chi_tiet` cho RPC. Dòng đã lưu giữ `id` để RPC sửa tại chỗ (không
 * đổi id); dòng mới không có `id` để RPC chèn thêm; dòng cũ vắng mặt sẽ bị RPC
 * xoá — tất cả trong cùng một transaction.
 */
export function buildTapHuanChiTietPayload(
  lines: MttqTapHuanFormValues['chi_tiet'],
): MttqTapHuanChiTietRpcLine[] {
  return lines.map((line) => {
    const base: MttqTapHuanChiTietRpcLine = {
      can_bo_id: String(line.can_bo_id).trim(),
      thuoc_dien: line.thuoc_dien,
    };
    return isPersistedChildId(line.id) ? { id: String(line.id).trim(), ...base } : base;
  });
}
