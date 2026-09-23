import type { BadgeConfig } from '@/components/ui/EnumBadge';

export const ktntTrangThaiBadge: BadgeConfig = {
  'Chờ duyệt': { label: 'Chờ duyệt', color: 'amber' },
  'Đã duyệt': { label: 'Đã duyệt', color: 'emerald' },
  'Không duyệt': { label: 'Không duyệt', color: 'rose' },
  'Hủy': { label: 'Hủy', color: 'slate' },
};

export const ktntCapKhenBadge: BadgeConfig = {
  'Trung ương': { label: 'Trung ương', color: 'violet' },
  'Cấp tỉnh': { label: 'Cấp tỉnh', color: 'primary' },
  'Cấp xã': { label: 'Cấp xã', color: 'sky' },
};
