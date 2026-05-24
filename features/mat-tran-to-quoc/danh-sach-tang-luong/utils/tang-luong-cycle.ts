import { TANG_LUONG_CYCLE_YEARS } from '../core/constants';
import type { MttqTangLuongListRow, MttqTangLuongLoaiKy } from '../core/types';
import { isTruocHanLoaiKy } from '../core/schema';

function parseIsoDate(dateIso: string): Date {
  const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Cộng N năm lịch cho ngày ISO YYYY-MM-DD. */
export function addCycleYears(dateIso: string, years = TANG_LUONG_CYCLE_YEARS): string {
  const d = parseIsoDate(dateIso);
  d.setFullYear(d.getFullYear() + years);
  return formatIsoDate(d);
}

/** Ngày đến hạn gốc khi tạo bản ghi mới: ngày nâng lương lần trước + 3 năm. */
export function computeNgayDenHanGoc(previousNgayNang: string | null | undefined): string | null {
  if (!previousNgayNang?.trim()) return null;
  return addCycleYears(previousNgayNang.trim());
}

/** Kỳ đến hạn tiếp theo sau lần nâng gần nhất. */
export function computeNextDueDate(latestNgayNang: string | null | undefined): string | null {
  return computeNgayDenHanGoc(latestNgayNang);
}

export function getLatestRecordForCanBo(
  rows: MttqTangLuongListRow[],
  canBoId: string,
  excludeId?: string,
): MttqTangLuongListRow | null {
  const id = canBoId.trim();
  if (!id) return null;
  const filtered = rows
    .filter((r) => r.can_bo_id === id && r.id !== excludeId)
    .sort((a, b) => b.ngay_nang_luong.localeCompare(a.ngay_nang_luong));
  return filtered[0] ?? null;
}

export function daysUntilDue(nextDueIso: string, today = new Date()): number {
  const due = parseIsoDate(nextDueIso);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export type DueWarningLevel = 'none' | 'd30' | 'd60' | 'd90';

export function dueWarningLevel(days: number): DueWarningLevel {
  if (days < 0) return 'none';
  if (days <= 30) return 'd30';
  if (days <= 60) return 'd60';
  if (days <= 90) return 'd90';
  return 'none';
}

export function isTruocHanRecord(loaiKy: MttqTangLuongLoaiKy): boolean {
  return isTruocHanLoaiKy(loaiKy);
}

/** Lấy bản ghi liền trước (theo ngày) của cùng cán bộ. */
export function getPreviousRecordForCanBo(
  rows: MttqTangLuongListRow[],
  canBoId: string,
  ngayNangLuong: string,
  excludeId?: string,
): MttqTangLuongListRow | null {
  const id = canBoId.trim();
  const ngay = ngayNangLuong.slice(0, 10);
  const prior = rows
    .filter(
      (r) =>
        r.can_bo_id === id &&
        r.id !== excludeId &&
        r.ngay_nang_luong.slice(0, 10) < ngay,
    )
    .sort((a, b) => b.ngay_nang_luong.localeCompare(a.ngay_nang_luong));
  return prior[0] ?? null;
}
