import type { BadgeColor, BadgeConfig } from '@/components/ui/EnumBadge';
import { txt } from '@/lib/text';
import type { MttqTapHuanCap, MttqTapHuanThuocDien } from '../core/constants';
import { MTTQ_TAP_HUAN_CAP, MTTQ_TAP_HUAN_THUOC_DIEN } from '../core/constants';

/** Hiển thị đơn vị lớp tập huấn — trống ⇒ CQMTTQ tỉnh. */
export function formatLopTenDonViDisplay(tenDonVi?: string | null): string {
  const t = tenDonVi?.trim();
  return t ? t : txt('matTranTapHuan.tinhCapDefault');
}

/** Badge cấp tập huấn — dùng thống nhất list + form + detail. */
export function getTapHuanCapBadgeConfig(): BadgeConfig<MttqTapHuanCap> {
  const map: Record<MttqTapHuanCap, { label: string; color: BadgeColor }> = {
    TW: { label: 'TW', color: 'amber' },
    'Cấp tỉnh': { label: 'Cấp tỉnh', color: 'sky' },
    'Cấp xã': { label: 'Cấp xã', color: 'emerald' },
  };
  return MTTQ_TAP_HUAN_CAP.reduce(
    (acc, key) => {
      acc[key] = { label: map[key].label, color: map[key].color };
      return acc;
    },
    {} as BadgeConfig<MttqTapHuanCap>,
  );
}

/** Thuộc diện — bảng con list/detail. */
export function getTapHuanThuocDienBadgeConfig(): BadgeConfig<MttqTapHuanThuocDien> {
  return MTTQ_TAP_HUAN_THUOC_DIEN.reduce(
    (acc, key) => {
      acc[key] =
        key === 'Biên chế'
          ? { label: key, color: 'blue' as const }
          : { label: key, color: 'amber' as const };
      return acc;
    },
    {} as BadgeConfig<MttqTapHuanThuocDien>,
  );
}
