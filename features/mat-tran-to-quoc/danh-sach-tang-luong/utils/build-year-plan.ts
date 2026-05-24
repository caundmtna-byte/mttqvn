import { txt } from '@/lib/text';
import type { MttqTangLuongKeHoachGroupMode, MttqTangLuongKeHoachRow, MttqTangLuongListRow } from '../core/types';
import {
  computeNextDueDate,
  daysUntilDue,
  dueWarningLevel,
  getLatestRecordForCanBo,
} from './tang-luong-cycle';

export interface KeHoachGroup {
  key: string;
  label: string;
  rows: MttqTangLuongKeHoachRow[];
}

function quarterOfMonth(month: number): number {
  return Math.floor((month - 1) / 3) + 1;
}

function groupKeyForDate(iso: string, mode: MttqTangLuongKeHoachGroupMode): { key: string; label: string } {
  const [y, m] = iso.slice(0, 10).split('-').map(Number);
  if (mode === 'month') {
    return {
      key: `${y}-${String(m).padStart(2, '0')}`,
      label: txt('matTranTangLuong.keHoach.monthLabel', { month: m, year: y }),
    };
  }
  const q = quarterOfMonth(m);
  return {
    key: `${y}-Q${q}`,
    label: txt('matTranTangLuong.keHoach.quarterLabel', { quarter: q, year: y }),
  };
}

export function buildKeHoachRows(
  allHistory: MttqTangLuongListRow[],
  year: number,
): MttqTangLuongKeHoachRow[] {
  const byCanBo = new Map<string, MttqTangLuongListRow[]>();
  for (const r of allHistory) {
    const list = byCanBo.get(r.can_bo_id) ?? [];
    list.push(r);
    byCanBo.set(r.can_bo_id, list);
  }

  const out: MttqTangLuongKeHoachRow[] = [];
  for (const [canBoId, rows] of byCanBo) {
    const latest = getLatestRecordForCanBo(rows, canBoId);
    if (!latest) continue;
    const nextDue = computeNextDueDate(latest.ngay_nang_luong);
    if (!nextDue) continue;
    const dueYear = Number(nextDue.slice(0, 4));
    if (dueYear !== year) continue;
    const days = daysUntilDue(nextDue);
    out.push({
      can_bo_id: canBoId,
      ho_ten: latest.ho_ten_can_bo,
      ten_phong_ban: latest.ten_phong_ban,
      ten_don_vi: latest.ten_don_vi,
      ten_to_chuc: latest.ten_to_chuc,
      ngay_nang_gan_nhat: latest.ngay_nang_luong,
      next_due: nextDue,
      ten_ngach_hien_tai: latest.ten_ngach_moi,
      ma_bac_hien_tai: latest.ma_bac_moi,
      ngach_luong_id_moi: latest.ngach_luong_id_moi,
      bac_luong_id_moi: latest.bac_luong_id_moi,
      daysUntilDue: days,
      warningLevel: dueWarningLevel(days),
    });
  }

  return out.sort((a, b) => a.next_due.localeCompare(b.next_due) || a.ho_ten.localeCompare(b.ho_ten, 'vi'));
}

export function groupKeHoachRows(
  rows: MttqTangLuongKeHoachRow[],
  mode: MttqTangLuongKeHoachGroupMode,
): KeHoachGroup[] {
  const map = new Map<string, KeHoachGroup>();
  for (const row of rows) {
    const { key, label } = groupKeyForDate(row.next_due, mode);
    const g = map.get(key) ?? { key, label, rows: [] };
    g.rows.push(row);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export function countCanBoWithoutHistory(totalCanBoWithAny: number, historyCanBoIds: Set<string>): number {
  return Math.max(0, totalCanBoWithAny - historyCanBoIds.size);
}
