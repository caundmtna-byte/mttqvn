import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqKhenThuongViewer } from '../hooks/use-mttq-khen-thuong-viewer';

/** Cấp Xã phường: chỉ chọn cán bộ cùng `don_vi_id` với nhân viên đăng nhập. */
export function filterCanBoForKhenThuongLine(
  viewer: MttqKhenThuongViewer,
  canBoList: readonly MttqCanBo[],
): MttqCanBo[] {
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

export type BuildKhenThuongCanBoOptionsParams = {
  viewer: MttqKhenThuongViewer;
  canBoList: readonly MttqCanBo[];
  /** Giữ hiển thị Combobox khi sửa dòng cán bộ không còn trong danh sách đã lọc. */
  ensureCanBoId?: string | null;
};

export function buildKhenThuongCanBoOptions({
  viewer,
  canBoList,
  ensureCanBoId,
}: BuildKhenThuongCanBoOptionsParams): { label: string; value: string }[] {
  const filtered = filterCanBoForKhenThuongLine(viewer, canBoList);
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
