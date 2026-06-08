import type { BadgeConfig } from '@/components/ui/EnumBadge';

export const tienDoThamHoiBadge: BadgeConfig<string> = {
  'Chưa thực hiện': { label: 'Chưa thực hiện', color: 'slate' },
  'Đang thực hiện': { label: 'Đang thực hiện', color: 'blue' },
  'Đã hoàn thành': { label: 'Đã hoàn thành', color: 'emerald' },
};
