import type { BadgeConfig } from '@/components/ui/EnumBadge';
import type { MttqKhenThuongCap, MttqKhenThuongDanhHieu, MttqKhenThuongHinhThuc, MttqKhenThuongTrangThai } from '../core/constants';
import {
  MTTQ_KHEN_THUONG_CAP,
  MTTQ_KHEN_THUONG_DANH_HIEU,
  MTTQ_KHEN_THUONG_HINH_THUC,
  MTTQ_KHEN_THUONG_TRANG_THAI,
} from '../core/constants';

/** Badge trạng thái quyết định — dùng thống nhất list + detail. */
export function getKhenThuongTrangThaiBadgeConfig(): BadgeConfig<MttqKhenThuongTrangThai> {
  const map: Record<MttqKhenThuongTrangThai, { label: string; color: 'sky' | 'amber' | 'emerald' | 'rose' }> = {
    Mới: { label: 'Mới', color: 'sky' },
    'Đang xử lý': { label: 'Đang xử lý', color: 'amber' },
    'Đã ban hành': { label: 'Đã ban hành', color: 'emerald' },
    Hủy: { label: 'Hủy', color: 'rose' },
  };
  return MTTQ_KHEN_THUONG_TRANG_THAI.reduce(
    (acc, key) => {
      acc[key] = { label: map[key].label, color: map[key].color };
      return acc;
    },
    {} as BadgeConfig<MttqKhenThuongTrangThai>,
  );
}

/** Hình thức khen — bảng con list/detail. */
export function getKhenThuongHinhThucBadgeConfig(): BadgeConfig<MttqKhenThuongHinhThuc> {
  return MTTQ_KHEN_THUONG_HINH_THUC.reduce(
    (acc, key) => {
      acc[key] =
        key === 'Thường xuyên'
          ? { label: key, color: 'blue' as const }
          : { label: key, color: 'violet' as const };
      return acc;
    },
    {} as BadgeConfig<MttqKhenThuongHinhThuc>,
  );
}

/** Danh hiệu — bảng con list/detail. */
export function getKhenThuongDanhHieuBadgeConfig(): BadgeConfig<MttqKhenThuongDanhHieu> {
  return MTTQ_KHEN_THUONG_DANH_HIEU.reduce(
    (acc, key) => {
      acc[key] =
        key === 'Giấy khen'
          ? { label: key, color: 'cyan' as const }
          : { label: key, color: 'indigo' as const };
      return acc;
    },
    {} as BadgeConfig<MttqKhenThuongDanhHieu>,
  );
}

/** Cấp khen thưởng — bảng con list/detail. */
export function getKhenThuongCapBadgeConfig(): BadgeConfig<MttqKhenThuongCap> {
  const map: Record<MttqKhenThuongCap, { label: string; color: 'violet' | 'amber' | 'cyan' }> = {
    Tỉnh: { label: 'Tỉnh', color: 'violet' },
    'Trung ương': { label: 'Trung ương', color: 'amber' },
    Xã: { label: 'Xã', color: 'cyan' },
  };
  return MTTQ_KHEN_THUONG_CAP.reduce(
    (acc, key) => {
      acc[key] = map[key];
      return acc;
    },
    {} as BadgeConfig<MttqKhenThuongCap>,
  );
}
