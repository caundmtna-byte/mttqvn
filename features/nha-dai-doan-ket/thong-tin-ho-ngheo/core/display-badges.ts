import type { BadgeConfig } from '@/components/ui/EnumBadge';

export const hnghTrangThaiBadge: BadgeConfig = {
  'Đang khó khăn': { label: 'Đang khó khăn', color: 'rose' },
  'Hết khó khăn': { label: 'Hết khó khăn', color: 'emerald' },
};

export const hnghDoiTuongBadge: BadgeConfig = {
  'Hộ nghèo': { label: 'Hộ nghèo', color: 'rose' },
  'Cận nghèo': { label: 'Cận nghèo', color: 'amber' },
  'Khó khăn': { label: 'Khó khăn', color: 'slate' },
  'Trẻ mồ côi': { label: 'Trẻ mồ côi', color: 'sky' },
  'Khuyết tật': { label: 'Khuyết tật', color: 'violet' },
  'Nạn nhân CĐDC': { label: 'Nạn nhân CĐDC', color: 'indigo' },
};

export const hnghTonGiaoBadge: BadgeConfig = {
  'Có': { label: 'Có', color: 'violet' },
  'Không': { label: 'Không', color: 'slate' },
};
