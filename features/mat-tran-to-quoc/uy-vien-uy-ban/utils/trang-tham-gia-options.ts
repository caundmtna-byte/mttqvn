import type { MttqUyVienUyBan } from '../core/types';
import {
  MTTQ_UY_VIEN_TRANG_THAM_GIA,
  MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG,
  MTTQ_UY_VIEN_TRANG_THAM_GIA_THOI,
  isUyVienTrangThamGia,
} from '../core/constants';
import { CHIP_TRANG_THAI_NULL } from '../../danh-sach-can-bo/core/constants';
import { txt } from '@/lib/text';

export interface TrangThamGiaChipOption {
  value: string;
  label: string;
  count: number;
}

/** Bộ lọc trạng thái tham gia — luôn hiển thị 2 lựa chọn nghiệp vụ (+ dòng chưa gán nếu có). */
export function buildUyVienTrangThamGiaChipOptions(
  rows: Pick<MttqUyVienUyBan, 'trang_thai_tham_gia'>[],
): TrangThamGiaChipOption[] {
  const counts = new Map<string, number>([
    [MTTQ_UY_VIEN_TRANG_THAM_GIA_DANG, 0],
    [MTTQ_UY_VIEN_TRANG_THAM_GIA_THOI, 0],
  ]);
  let unassigned = 0;

  for (const r of rows) {
    const v = r.trang_thai_tham_gia?.trim();
    if (isUyVienTrangThamGia(v)) {
      counts.set(v, (counts.get(v) ?? 0) + 1);
    } else {
      unassigned += 1;
    }
  }

  const options: TrangThamGiaChipOption[] = MTTQ_UY_VIEN_TRANG_THAM_GIA.map((value) => ({
    value,
    label: value,
    count: counts.get(value) ?? 0,
  }));

  if (unassigned > 0) {
    options.push({
      value: CHIP_TRANG_THAI_NULL,
      label: txt('matTranUyVienUyBan.trangThamGiaChuaGan'),
      count: unassigned,
    });
  }

  return options;
}
