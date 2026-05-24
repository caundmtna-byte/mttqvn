import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqUyVienUyBanViewer } from '../hooks/use-mttq-uy-vien-uy-ban-viewer';

export type UyVienCanBoComboboxOption = {
  label: string;
  value: string;
  subLabel?: string;
};

function canBoSubLabel(c: MttqCanBo): string | undefined {
  const s = [c.ten_chuc_vu, c.ten_don_vi].filter(Boolean).join(' · ');
  return s || undefined;
}

/** Cấp Xã phường: chỉ chọn cán bộ cùng `don_vi_id` với nhân viên đăng nhập. */
export function filterCanBoForUyVienForm(
  viewer: MttqUyVienUyBanViewer,
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

export type BuildUyVienCanBoOptionsParams = {
  viewer: MttqUyVienUyBanViewer;
  canBoList: readonly MttqCanBo[];
  /** Giữ hiển thị Combobox khi sửa ủy viên gắn cán bộ không còn trong danh sách đã lọc. */
  ensureCanBoId?: string | null;
  /** Fallback label khi cán bộ không có trong `canBoList` (cache flatten). */
  ensureCanBoLabel?: string | null;
};

export function buildUyVienCanBoOptions({
  viewer,
  canBoList,
  ensureCanBoId,
  ensureCanBoLabel,
}: BuildUyVienCanBoOptionsParams): UyVienCanBoComboboxOption[] {
  const filtered = filterCanBoForUyVienForm(viewer, canBoList);
  const ensure = String(ensureCanBoId ?? '').trim();
  const byId = new Map<string, MttqCanBo>();
  for (const c of canBoList) byId.set(String(c.id), c);

  const seen = new Set<string>();
  const out: UyVienCanBoComboboxOption[] = [];

  if (ensure && !filtered.some((c) => String(c.id) === ensure)) {
    const c = byId.get(ensure);
    if (c) {
      out.push({ label: c.ho_ten, value: String(c.id), subLabel: canBoSubLabel(c) });
      seen.add(ensure);
    } else if (ensureCanBoLabel?.trim()) {
      out.push({
        label: `${ensureCanBoLabel.trim()} (#${ensure})`,
        value: ensure,
      });
      seen.add(ensure);
    } else {
      out.push({ label: `#${ensure}`, value: ensure });
      seen.add(ensure);
    }
  }

  const sorted = [...filtered].sort((a, b) => a.ho_ten.localeCompare(b.ho_ten, 'vi'));
  for (const c of sorted) {
    const id = String(c.id);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ label: c.ho_ten, value: id, subLabel: canBoSubLabel(c) });
  }

  return out;
}
