import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqTapHuanCap } from '../core/constants';
import type { MttqLopTapHuanViewer } from '../hooks/use-mttq-tap-huan-viewer';

/**
 * Lọc cán bộ theo cấp + đơn vị của LỚP.
 * - `Cấp xã` + lớp có `don_vi_id`: chỉ cán bộ cùng `don_vi_id` với lớp.
 * - Khác: giữ nguyên.
 */
export function filterCanBoByLopDonVi(
  cap: MttqTapHuanCap,
  donViIdLop: string,
  canBoList: readonly MttqCanBo[],
): MttqCanBo[] {
  const dv = String(donViIdLop ?? '').trim();
  if (cap !== 'Cấp xã' || dv === '') {
    return [...canBoList];
  }
  return canBoList.filter((c) => String(c.don_vi_id ?? '').trim() === dv);
}

/**
 * Lọc thêm theo VIEWER (chức vụ người đăng nhập):
 * - Bypass (`canViewAll`) hoặc `cap_quan_ly === 'Tỉnh'` → không ràng buộc.
 * - `cap_quan_ly === 'Xã phường'`:
 *   - Có `viewerDonViId` → chỉ cán bộ cùng đơn vị.
 *   - Không có `viewerDonViId` → trả `[]` (đồng bộ pattern Khen thưởng / Ủy viên / Tăng lương).
 * - Còn lại / null → không ràng buộc.
 */
export function filterCanBoByViewerDonVi(
  viewer: MttqLopTapHuanViewer | null | undefined,
  canBoList: readonly MttqCanBo[],
): MttqCanBo[] {
  if (!viewer) return [...canBoList];
  if (viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh') {
    return [...canBoList];
  }
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    const dv = viewer.viewerDonViId;
    if (!dv) return [];
    return canBoList.filter((c) => String(c.don_vi_id ?? '').trim() === dv);
  }
  return [...canBoList];
}

export type BuildTapHuanCanBoOptionsParams = {
  cap: MttqTapHuanCap;
  donViIdLop: string;
  canBoList: readonly MttqCanBo[];
  /** Giữ hiển thị Combobox khi sửa dòng cán bộ không còn trong danh sách đã lọc (dữ liệu cũ). */
  ensureCanBoId?: string | null;
  /**
   * Người đăng nhập — nếu `cap_quan_ly === 'Xã phường'`, dropdown chỉ liệt kê
   * cán bộ có `don_vi_id` trùng `viewerDonViId`. Không truyền ⇒ không gating
   * theo viewer (giữ behavior cũ).
   */
  viewer?: MttqLopTapHuanViewer | null;
};

export function buildTapHuanCanBoOptions({
  cap,
  donViIdLop,
  canBoList,
  ensureCanBoId,
  viewer,
}: BuildTapHuanCanBoOptionsParams): { label: string; value: string }[] {
  const byLop = filterCanBoByLopDonVi(cap, donViIdLop, canBoList);
  const filtered = filterCanBoByViewerDonVi(viewer, byLop);
  const ensure = String(ensureCanBoId ?? '').trim();
  const byId = new Map<string, MttqCanBo>();
  for (const c of canBoList) byId.set(String(c.id), c);

  const seen = new Set<string>();
  const out: { label: string; value: string }[] = [];

  if (ensure && !filtered.some((c) => String(c.id) === ensure)) {
    const c = byId.get(ensure);
    if (c) {
      out.push({ label: c.ho_ten, value: String(c.id) });
      seen.add(ensure);
    }
  }

  const sorted = [...filtered].sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, 'vi'));
  for (const c of sorted) {
    const id = String(c.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ label: c.ho_ten, value: id });
  }

  return out;
}
