import type { BadgeConfig } from '@/components/ui/EnumBadge';

/** Trạng thái danh mục (tài khoản, khoản thu chi). */
export const quyTrangThaiBadge: BadgeConfig<string> = {
  'Hoạt động': { label: 'Hoạt động', color: 'emerald' },
  Ngừng: { label: 'Ngừng', color: 'slate' },
};

/** Loại phiếu trong sổ — thu xanh, chi hồng: nhìn một cái là biết tiền vào hay ra. */
export const quyLoaiPhieuBadge: BadgeConfig<string> = {
  thu: { label: 'Phiếu thu', color: 'emerald' },
  chi: { label: 'Phiếu chi', color: 'rose' },
};

/** Loại khoản mục trong danh mục. */
export const quyLoaiKhoanBadge: BadgeConfig<string> = {
  thu: { label: 'Khoản thu', color: 'emerald' },
  chi: { label: 'Khoản chi', color: 'rose' },
};
