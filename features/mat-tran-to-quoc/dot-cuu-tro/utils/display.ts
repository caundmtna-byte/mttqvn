import { txt } from '@/lib/text';
import { formatDisplayDateShort } from '@/lib/display-format';
import type { KhoDotCuuTroListRow } from '../core/types';

/** "01/10/2026 – 31/12/2026", "Từ …", "Đến …" hoặc '' khi chưa nhập. */
export function thoiGianChuongTrinh(row: Pick<KhoDotCuuTroListRow, 'tu_ngay' | 'den_ngay'>): string {
  const tu = formatDisplayDateShort(row.tu_ngay);
  const den = formatDisplayDateShort(row.den_ngay);
  if (tu && den) return txt('matTranDotCuuTro.thoiGianTuDen', { tu, den });
  if (tu) return txt('matTranDotCuuTro.thoiGianTu', { tu });
  if (den) return txt('matTranDotCuuTro.thoiGianDen', { den });
  return '';
}
