import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqTapHuanCap } from '../core/constants';

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

export type BuildTapHuanCanBoOptionsParams = {
  cap: MttqTapHuanCap;
  donViIdLop: string;
  canBoList: readonly MttqCanBo[];
  /** Giữ hiển thị Combobox khi sửa dòng cán bộ không còn trong danh sách đã lọc (dữ liệu cũ). */
  ensureCanBoId?: string | null;
};

export function buildTapHuanCanBoOptions({
  cap,
  donViIdLop,
  canBoList,
  ensureCanBoId,
}: BuildTapHuanCanBoOptionsParams): { label: string; value: string }[] {
  const filtered = filterCanBoByLopDonVi(cap, donViIdLop, canBoList);
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
