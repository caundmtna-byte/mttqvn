import { QUY_LOAI_KHOAN_LABEL } from '../../core/constants';
import type { QuyDanhMucKhoanListRow } from '../core/types';

export function countQuyKhoanColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
): number {
  if (!columnSearch) return 0;
  let n = 0;
  for (const [, q] of Object.entries(columnSearch)) {
    if (q.trim()) n += 1;
  }
  return n;
}

export function quyKhoanMatchesColumnSearch(
  row: QuyDanhMucKhoanListRow,
  columnSearch: Record<string, string> | undefined,
): boolean {
  if (!columnSearch) return true;
  for (const [colId, q] of Object.entries(columnSearch)) {
    const trimmed = q.trim();
    if (!trimmed) continue;
    let haystack = '';
    switch (colId) {
      case 'thu_tu':
        haystack = String(row.thu_tu ?? '');
        break;
      // Người dùng gõ "Khoản thu" chứ không gõ "thu" — so theo NHÃN hiển thị.
      case 'loai':
        haystack = QUY_LOAI_KHOAN_LABEL[row.loai] ?? row.loai;
        break;
      case 'ten':
        haystack = row.ten ?? '';
        break;
      case 'mo_ta':
        haystack = row.mo_ta ?? '';
        break;
      case 'trang_thai':
        haystack = row.trang_thai ?? '';
        break;
      case 'tg_tao':
        haystack = row.tg_tao ?? '';
        break;
      case 'tg_cap_nhat':
        haystack = row.tg_cap_nhat ?? '';
        break;
      default:
        haystack = '';
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}
