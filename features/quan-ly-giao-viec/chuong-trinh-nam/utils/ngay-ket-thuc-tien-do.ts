import { txt } from '@/lib/text';
import type { ChuongTrinhNamListRow } from '../core/types';
import { daysFromDeadline } from '@/features/quan-ly-giao-viec/cong-viec/utils/deadline-progress';
import type { CongViecDeadlineChipTone } from '@/features/quan-ly-giao-viec/cong-viec/core/display-badges';

/** Số ngày tính từ hôm nay đến ngày kết thúc: coi là “sắp đến hạn” khi 0…7. */
export const CHUONG_TRINH_NAM_SAP_DEN_HAN_MAX_DAYS = 7;

export const CHUONG_TRINH_NAM_TIEN_DO_FILTER_IDS = ['qua_han', 'sap_den_han', 'con_han', 'ket_thuc'] as const;

export type ChuongTrinhNamTienDoFilterId = (typeof CHUONG_TRINH_NAM_TIEN_DO_FILTER_IDS)[number];

export function getChuongTrinhNamTienDoFilterId(row: ChuongTrinhNamListRow): ChuongTrinhNamTienDoFilterId {
  if (row.trang_thai === 'Kết thúc') return 'ket_thuc';
  const d = daysFromDeadline(row.ngay_ket_thuc);
  if (d == null) return 'con_han';
  if (d < 0) return 'qua_han';
  if (d <= CHUONG_TRINH_NAM_SAP_DEN_HAN_MAX_DAYS) return 'sap_den_han';
  return 'con_han';
}

/** Nhãn tiến độ theo ngày kết thúc + trạng thái (tương tự công việc). */
export function formatChuongTrinhNamTienDo(row: ChuongTrinhNamListRow): string {
  if (row.trang_thai === 'Kết thúc') return txt('chuongTrinhNam.tienDo.ended');
  if (!row.ngay_ket_thuc?.trim()) return txt('chuongTrinhNam.tienDo.noEndDate');
  const diff = daysFromDeadline(row.ngay_ket_thuc);
  if (diff == null) return txt('chuongTrinhNam.tienDo.noEndDate');
  if (diff < 0) return txt('chuongTrinhNam.tienDo.overdueDays', { count: Math.abs(diff) });
  if (diff === 0) return txt('chuongTrinhNam.tienDo.dueToday');
  if (diff === 1) return txt('chuongTrinhNam.tienDo.remainingOneDay');
  return txt('chuongTrinhNam.tienDo.remainingDays', { count: diff });
}

/** Sắp xếp cột “Tiến độ”: nhỏ hơn = gấp hơn (quá hạn trước). */
export function chuongTrinhNamTienDoSortKey(row: ChuongTrinhNamListRow): number {
  if (row.trang_thai === 'Kết thúc') return 300_000;
  const d = daysFromDeadline(row.ngay_ket_thuc);
  if (d == null) return 200_000;
  return d;
}

export function chuongTrinhNamTienDoChipTone(row: ChuongTrinhNamListRow): CongViecDeadlineChipTone {
  const cat = getChuongTrinhNamTienDoFilterId(row);
  if (cat === 'ket_thuc') return 'slate';
  if (cat === 'qua_han') return 'rose';
  if (cat === 'sap_den_han') return 'amber';
  return 'emerald';
}
