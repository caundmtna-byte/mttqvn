import type { MttqKhenThuongFormValues } from '../core/schema';

/** Một dòng chi tiết gửi xuống `rpc_khen_thuong_*`. `id` chỉ có với dòng đã lưu. */
export interface MttqKhenThuongChiTietRpcLine {
  id?: string;
  can_bo_id: string;
  cap_khen_thuong: string;
  hinh_thuc_khen: string;
  danh_hieu: string;
  noi_dung_khen: string;
  ho_so_khen: string;
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
export function buildKhenThuongChiTietPayload(
  lines: MttqKhenThuongFormValues['chi_tiet'],
): MttqKhenThuongChiTietRpcLine[] {
  return lines.map((line) => {
    const base: MttqKhenThuongChiTietRpcLine = {
      can_bo_id: String(line.can_bo_id).trim(),
      cap_khen_thuong: line.cap_khen_thuong,
      hinh_thuc_khen: line.hinh_thuc_khen,
      danh_hieu: line.danh_hieu,
      noi_dung_khen: line.noi_dung_khen?.trim() ?? '',
      ho_so_khen: line.ho_so_khen?.trim() ?? '',
    };
    return isPersistedChildId(line.id) ? { id: String(line.id).trim(), ...base } : base;
  });
}
