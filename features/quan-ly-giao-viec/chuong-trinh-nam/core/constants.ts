import type { BadgeConfig } from '@/components/ui/EnumBadge';

export const CHUONG_TRINH_NAM_TRANG_THAI = ['Hoạt động', 'Tạm dừng', 'Kết thúc'] as const;

export type ChuongTrinhNamTrangThai = (typeof CHUONG_TRINH_NAM_TRANG_THAI)[number];

export function getChuongTrinhNamTrangThaiBadgeConfig(): BadgeConfig<ChuongTrinhNamTrangThai> {
  return CHUONG_TRINH_NAM_TRANG_THAI.reduce(
    (acc, key) => {
      acc[key] =
        key === 'Hoạt động'
          ? { label: key, color: 'emerald' as const }
          : key === 'Tạm dừng'
            ? { label: key, color: 'amber' as const }
            : { label: key, color: 'slate' as const };
      return acc;
    },
    {} as BadgeConfig<ChuongTrinhNamTrangThai>,
  );
}
