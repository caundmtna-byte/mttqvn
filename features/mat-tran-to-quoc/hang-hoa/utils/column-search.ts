import type { KhoDanhMucHangHoaFilters, KhoDanhMucHangHoaListRow } from '../core/types';
import type { KhoDanhSachHangHoaFilters, KhoDanhSachHangHoaListRow } from '../core/types';

export function countDanhMucColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
  moTaBucket: KhoDanhMucHangHoaFilters['mo_ta_bucket'] | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  const skipMoTa = moTaBucket === 'has' || moTaBucket === 'empty';
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skipMoTa && colId === 'mo_ta') continue;
    n += 1;
  }
  return n;
}

export function danhMucMatchesColumnSearch(
  row: KhoDanhMucHangHoaListRow,
  columnSearch: Record<string, string> | undefined,
  moTaBucket?: KhoDanhMucHangHoaFilters['mo_ta_bucket'],
): boolean {
  if (!columnSearch) return true;
  const skipMoTa = moTaBucket === 'has' || moTaBucket === 'empty';
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    if (skipMoTa && colId === 'mo_ta') continue;
    const key = colId as keyof KhoDanhMucHangHoaListRow;
    const v = row[key];
    const raw = v == null ? '' : String(v);
    if (!raw.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

export function countHangHoaColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
  moTaBucket: KhoDanhSachHangHoaFilters['mo_ta_bucket'] | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  const skipMoTa = moTaBucket === 'has' || moTaBucket === 'empty';
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skipMoTa && colId === 'mo_ta') continue;
    n += 1;
  }
  return n;
}

export function hangHoaMatchesColumnSearch(
  row: KhoDanhSachHangHoaListRow,
  columnSearch: Record<string, string> | undefined,
  moTaBucket?: KhoDanhSachHangHoaFilters['mo_ta_bucket'],
): boolean {
  if (!columnSearch) return true;
  const skipMoTa = moTaBucket === 'has' || moTaBucket === 'empty';
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    if (skipMoTa && colId === 'mo_ta') continue;
    const key = colId as keyof KhoDanhSachHangHoaListRow;
    const v = row[key];
    const raw = v == null ? '' : String(v);
    if (!raw.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}
