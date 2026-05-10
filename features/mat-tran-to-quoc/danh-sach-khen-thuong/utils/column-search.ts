import { formatDateShort, formatDateTimeShort } from '@/lib/utils';
import type { MttqKhenThuongChiTietFlatRow, MttqKhenThuongFilters, MttqKhenThuongListRow } from '../core/types';

/**
 * Cột dùng MultiSelect trong header (`ColumnHeaderFilter`) —
 * không áp thêm `columnSearch` text cho cùng key (trùng với toolbar `trang_thai`).
 */
export const MTTQ_KHEN_THUONG_COLUMN_IDS_WITH_MULTISELECT = ['trang_thai'] as const;

/** Số ô columnSearch đang có nội dung (bỏ cột đã có MultiSelect trong header). */
type KhenThuongChipOverlap = Pick<
  MttqKhenThuongFilters,
  'don_vi_de_xuat' | 'nam_khen_thuong' | 'hinh_thuc_khen' | 'danh_hieu'
>;

export function countKhenThuongColumnSearchActive(
  columnSearch: Record<string, string> | undefined,
  chip?: KhenThuongChipOverlap,
): number {
  if (!columnSearch) return 0;
  const skip = MTTQ_KHEN_THUONG_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  const skipDonVi = (chip?.don_vi_de_xuat?.length ?? 0) > 0;
  const skipNam = (chip?.nam_khen_thuong?.length ?? 0) > 0;
  const skipHinh = (chip?.hinh_thuc_khen?.length ?? 0) > 0;
  const skipDanh = (chip?.danh_hieu?.length ?? 0) > 0;
  let n = 0;
  for (const [colId, q] of Object.entries(columnSearch)) {
    if (!q.trim()) continue;
    if (skip.includes(colId)) continue;
    if (skipDonVi && colId === 'don_vi_de_xuat') continue;
    if (skipNam && colId === 'ngay_khen_thuong') continue;
    if (skipHinh && colId === 'hinh_thuc_khen') continue;
    if (skipDanh && colId === 'danh_hieu') continue;
    n += 1;
  }
  return n;
}

/**
 * AND theo từng key `columnSearch` (substring, không phân biệt hoa thường).
 * Bỏ qua `trang_thai` (đã lọc qua `filters.trang_thai`).
 */
export function mttqKhenThuongMatchesColumnSearch(
  row: MttqKhenThuongListRow,
  columnSearch: Record<string, string> | undefined,
  chip?: KhenThuongChipOverlap,
): boolean {
  if (!columnSearch) return true;
  const skip = MTTQ_KHEN_THUONG_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  const skipDonVi = (chip?.don_vi_de_xuat?.length ?? 0) > 0;
  const skipNam = (chip?.nam_khen_thuong?.length ?? 0) > 0;
  const skipHinh = (chip?.hinh_thuc_khen?.length ?? 0) > 0;
  const skipDanh = (chip?.danh_hieu?.length ?? 0) > 0;

  for (const [colId, q] of Object.entries(columnSearch)) {
    if (skip.includes(colId)) continue;
    if (skipDonVi && colId === 'don_vi_de_xuat') continue;
    if (skipNam && colId === 'ngay_khen_thuong') continue;
    if (skipHinh && colId === 'hinh_thuc_khen') continue;
    if (skipDanh && colId === 'danh_hieu') continue;
    const trimmed = q.trim();
    if (!trimmed) continue;

    let haystack = '';
    switch (colId) {
      case 'ngay_khen_thuong':
        haystack = `${row.ngay_khen_thuong ?? ''} ${
          row.ngay_khen_thuong ? formatDateShort(row.ngay_khen_thuong) : ''
        }`.trim();
        break;
      case 'tg_cap_nhat':
        haystack = `${row.tg_cap_nhat ?? ''} ${
          row.tg_cap_nhat ? formatDateTimeShort(row.tg_cap_nhat) : ''
        }`.trim();
        break;
      case 'ho_va_ten_nguoi_tao':
        haystack = [row.ho_va_ten_nguoi_tao, row.ten_tai_khoan_nguoi_tao].filter(Boolean).join(' ');
        break;
      default: {
        const raw = row[colId as keyof MttqKhenThuongListRow];
        haystack = raw == null ? '' : String(raw);
      }
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}

/**
 * Lọc cột tab Danh sách chi tiết (dòng phẳng `mttq_khen_thuong_ct`).
 * Bỏ qua `trang_thai` (toolbar) và cột trùng chip năm / đơn vị khi chip đang bật.
 */
export function mttqKhenThuongChiTietFlatMatchesColumnSearch(
  row: MttqKhenThuongChiTietFlatRow,
  columnSearch: Record<string, string> | undefined,
  chip?: KhenThuongChipOverlap,
): boolean {
  if (!columnSearch) return true;
  const skip = MTTQ_KHEN_THUONG_COLUMN_IDS_WITH_MULTISELECT as readonly string[];
  const skipDonVi = (chip?.don_vi_de_xuat?.length ?? 0) > 0;
  const skipNam = (chip?.nam_khen_thuong?.length ?? 0) > 0;
  const skipHinh = (chip?.hinh_thuc_khen?.length ?? 0) > 0;
  const skipDanh = (chip?.danh_hieu?.length ?? 0) > 0;

  for (const [colId, q] of Object.entries(columnSearch)) {
    if (skip.includes(colId)) continue;
    if (skipDonVi && colId === 'don_vi_de_xuat') continue;
    if (skipNam && colId === 'ngay_khen_thuong') continue;
    if (skipHinh && colId === 'hinh_thuc_khen') continue;
    if (skipDanh && colId === 'danh_hieu') continue;
    const trimmed = q.trim();
    if (!trimmed) continue;

    let haystack = '';
    switch (colId) {
      case 'ngay_khen_thuong':
        haystack = `${row.ngay_khen_thuong ?? ''} ${
          row.ngay_khen_thuong ? formatDateShort(row.ngay_khen_thuong) : ''
        }`.trim();
        break;
      case 'tg_cap_nhat_qd':
        haystack = `${row.tg_cap_nhat_qd ?? ''} ${
          row.tg_cap_nhat_qd ? formatDateTimeShort(row.tg_cap_nhat_qd) : ''
        }`.trim();
        break;
      default: {
        const raw = row[colId as keyof MttqKhenThuongChiTietFlatRow];
        haystack = raw == null ? '' : String(raw);
      }
    }
    if (!haystack.toLowerCase().includes(trimmed.toLowerCase())) return false;
  }
  return true;
}
