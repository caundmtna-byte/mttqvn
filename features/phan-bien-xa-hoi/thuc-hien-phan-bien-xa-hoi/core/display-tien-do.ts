import { txt } from '@/lib/text';

/** Tính tiến độ từ ngày kết thúc — không lưu DB. */
export function tinhTienDo(ngayKetThuc: string | null | undefined): string | null {
  if (!ngayKetThuc?.trim()) return null;
  const end = new Date(ngayKetThuc.trim());
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const diff = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff > 0) return txt('pbxhThucHien.tienDo.conNgay', { count: diff });
  if (diff === 0) return txt('pbxhThucHien.tienDo.hetHanHomNay');
  return txt('pbxhThucHien.tienDo.quaHan', { count: Math.abs(diff) });
}
