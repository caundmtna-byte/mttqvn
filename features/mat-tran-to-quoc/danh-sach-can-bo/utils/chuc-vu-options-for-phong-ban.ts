import type { Position } from '@/features/he-thong/chuc-vu/core/types';
import type { Department } from '@/features/he-thong/phong-ban/core/types';
import { CHIP_FILTER_NULL } from '../core/constants';
import { rootPhongBanIdForForm } from './phong-ban-form';

type DeptNode = Pick<Department, 'id' | 'cha_id' | 'trang_thai'>;
type PositionNode = Pick<Position, 'id' | 'ten_chuc_vu' | 'phong_ban_id' | 'trang_thai'>;

export type ChucVuComboboxOption = { label: string; value: string };

/** Phòng ban gốc + các bộ phận con đang hoạt động. */
export function collectAllowedPhongBanIds(
  rootPhongBanId: string,
  departments: readonly DeptNode[],
): Set<string> {
  const root = String(rootPhongBanId ?? '').trim();
  const allowed = new Set<string>();
  if (!root) return allowed;
  allowed.add(root);
  for (const d of departments) {
    if (d.trang_thai === 'Đang hoạt động' && d.cha_id != null && String(d.cha_id) === root) {
      allowed.add(String(d.id));
    }
  }
  return allowed;
}

export function positionPhongBanId(p: Pick<PositionNode, 'phong_ban_id'>): string {
  return p.phong_ban_id == null || p.phong_ban_id === '' ? '' : String(p.phong_ban_id);
}

export function positionMatchesAllowedPhongBan(
  p: Pick<PositionNode, 'phong_ban_id'>,
  allowedDeptIds: Set<string>,
): boolean {
  const pb = positionPhongBanId(p);
  return pb !== '' && allowedDeptIds.has(pb);
}

export function buildMttqCanBoChucVuOptions(params: {
  positions: readonly PositionNode[];
  departments: readonly DeptNode[];
  rootPhongBanId: string;
  /** Giữ hiển thị khi sửa (chức vụ ngừng hoạt động hoặc dữ liệu cũ). */
  ensureChucVuId?: string | null;
}): ChucVuComboboxOption[] {
  const root = String(params.rootPhongBanId ?? '').trim();
  if (!root) return [];

  const allowedDeptIds = collectAllowedPhongBanIds(root, params.departments);
  const ensure = String(params.ensureChucVuId ?? '').trim();
  const active = params.positions.filter((p) => p.trang_thai === 'Đang hoạt động');

  const byId = new Map<string, ChucVuComboboxOption>();
  for (const p of active) {
    if (!positionMatchesAllowedPhongBan(p, allowedDeptIds)) continue;
    byId.set(String(p.id), { label: p.ten_chuc_vu, value: String(p.id) });
  }
  if (ensure && !byId.has(ensure)) {
    const p = params.positions.find((x) => String(x.id) === ensure);
    if (p) byId.set(ensure, { label: p.ten_chuc_vu, value: ensure });
  }

  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'));
}

export function chucVuBelongsToRootPhongBan(
  chucVuId: string,
  rootPhongBanId: string,
  positions: readonly PositionNode[],
  departments: readonly DeptNode[],
): boolean {
  const cvId = String(chucVuId ?? '').trim();
  const root = String(rootPhongBanId ?? '').trim();
  if (!cvId || !root) return false;
  const p = positions.find((x) => String(x.id) === cvId);
  if (!p) return false;
  return positionMatchesAllowedPhongBan(p, collectAllowedPhongBanIds(root, departments));
}

/** Dòng list khớp một trong các phòng ban đã chọn (id gốc hoặc bộ phận con). */
export function rowMatchesPhongBanFilter(
  phongBanId: string | null | undefined,
  selectedPhongBanIds: readonly string[],
  departments: readonly Pick<DeptNode, 'id' | 'cha_id'>[],
): boolean {
  if (selectedPhongBanIds.length === 0) return true;
  const pbKey = phongBanId != null && String(phongBanId).trim() !== '' ? String(phongBanId) : '';
  if (!pbKey) return selectedPhongBanIds.includes(CHIP_FILTER_NULL);
  if (selectedPhongBanIds.includes(pbKey)) return true;
  const root = rootPhongBanIdForForm(pbKey, departments);
  return root !== '' && selectedPhongBanIds.includes(root);
}
