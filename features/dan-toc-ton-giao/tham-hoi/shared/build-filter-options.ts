import { getLanguage } from '@/lib/utils';
import type { OptionWithCount } from '@/lib/filterOptionsWithCount';
import type { DipThamHoiOption } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/core/types';

export type FilterChipOption = OptionWithCount;

/** Dịp thăm hỏi — merge catalog + count từ rows; giữ option đang chọn. */
export function buildDipThamHoiFilterOptions(
  rows: Array<{ dip_tham_hoi_id?: string | null }>,
  dipList: DipThamHoiOption[],
  selectedIds: string[],
): FilterChipOption[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const id = r.dip_tham_hoi_id?.trim();
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const dipById = new Map(dipList.map((d) => [d.id, d.ten_dip]));
  const allIds = new Set([...counts.keys(), ...selectedIds.filter(Boolean)]);

  return [...allIds]
    .map((value) => ({
      value,
      label: dipById.get(value) ?? value,
      count: counts.get(value) ?? 0,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
}

/** Phòng ban tham mưu — đếm từ rows theo id/label field. */
export function buildPhongBanFilterOptions<T>(
  rows: T[],
  idField: keyof T,
  labelField: keyof T,
): FilterChipOption[] {
  const map = new Map<string, { label: string; count: number }>();
  for (const r of rows) {
    const id = String(r[idField] ?? '').trim();
    if (!id) continue;
    const label = String(r[labelField] ?? '').trim() || id;
    const cur = map.get(id);
    if (cur) cur.count += 1;
    else map.set(id, { label, count: 1 });
  }
  return [...map.entries()]
    .map(([value, { label, count }]) => ({ value, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
}

/** Đơn vị tổ chức dịp — null id → sentinel MTTQ Tỉnh. */
export function buildDonViToChucFilterOptions<T>(
  rows: T[],
  idField: keyof T,
  labelField: keyof T,
  tinhSentinel: string,
  tinhLabel: string,
): FilterChipOption[] {
  const map = new Map<string, { label: string; count: number }>();
  let tinhCount = 0;
  for (const r of rows) {
    const rawId = r[idField];
    if (rawId == null || rawId === '') {
      tinhCount += 1;
      continue;
    }
    const id = String(rawId).trim();
    if (!id) continue;
    const label = String(r[labelField] ?? '').trim() || id;
    const cur = map.get(id);
    if (cur) cur.count += 1;
    else map.set(id, { label, count: 1 });
  }
  const options = [...map.entries()]
    .map(([value, { label, count }]) => ({ value, label, count }))
    .sort((a, b) => a.label.localeCompare(b.label, getLanguage()));
  return [{ value: tinhSentinel, label: tinhLabel, count: tinhCount }, ...options];
}

/** Đơn vị thăm hỏi — null id → sentinel (MTTQ/CQMTTQ Tỉnh). */
export function buildDonViThamHoiFilterOptions<T>(
  rows: T[],
  idField: keyof T,
  labelField: keyof T,
  tinhSentinel: string,
  tinhLabel: string,
): FilterChipOption[] {
  return buildDonViToChucFilterOptions(rows, idField, labelField, tinhSentinel, tinhLabel);
}

/** Resolve row id for don_vi filter match (null → sentinel). */
export function donViFilterKey(
  donViId: string | null | undefined,
  tinhSentinel: string,
): string {
  if (donViId == null || donViId === '') return tinhSentinel;
  return String(donViId).trim();
}
