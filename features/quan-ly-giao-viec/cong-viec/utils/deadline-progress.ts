import { txt } from '@/lib/text';
import type { CongViecDanhSach } from '../core/types';

function parseLocalYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map((x) => Number(x));
  return new Date(y, m - 1, d);
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Số ngày đến hạn: âm = đã quá hạn, 0 = hôm nay, dương = còn lại. Không có thời hạn → null. */
export function daysFromDeadline(thoiHan: string | null, now: Date = new Date()): number | null {
  if (!thoiHan) return null;
  const deadline = startOfLocalDay(parseLocalYmd(thoiHan));
  const today = startOfLocalDay(now);
  return Math.round((deadline.getTime() - today.getTime()) / 86400000);
}

/** Nhãn tiến độ theo thời hạn + trạng thái (thay cho %). */
export function formatCongViecTienDoTheoHan(
  thoiHan: string | null,
  trangThai: CongViecDanhSach['trang_thai'],
): string {
  if (trangThai === 'Hủy') return txt('taskList.deadline.cancelled');
  if (trangThai === 'Hoàn thành') return txt('taskList.deadline.completed');
  if (!thoiHan) return txt('taskList.deadline.noDeadline');
  const diff = daysFromDeadline(thoiHan);
  if (diff == null) return txt('taskList.deadline.noDeadline');
  if (diff < 0) return txt('taskList.deadline.overdueDays', { count: Math.abs(diff) });
  if (diff === 0) return txt('taskList.deadline.dueToday');
  if (diff === 1) return txt('taskList.deadline.remainingOneDay');
  return txt('taskList.deadline.remainingDays', { count: diff });
}

/** Khóa sắp xếp cột “tiến độ”: nhỏ hơn = gấp hơn (quá hạn trước). */
export function deadlineProgressSortKey(item: CongViecDanhSach): number {
  if (item.trang_thai === 'Hủy') return 400_000;
  if (item.trang_thai === 'Hoàn thành') return 300_000;
  const d = daysFromDeadline(item.thoi_han);
  if (d == null) return 200_000;
  return d;
}
