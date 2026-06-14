import type { BadgeConfig } from '@/components/ui/EnumBadge';

export const capThucHienBadge: BadgeConfig = {
  'Cấp tỉnh': { label: 'Cấp tỉnh', color: 'primary' },
  'Cấp xã': { label: 'Cấp xã', color: 'sky' },
};

export const tinhTrangBadge: BadgeConfig = {
  'Đang thực hiện': { label: 'Đang thực hiện', color: 'sky' },
  'Đã lập kế hoạch': { label: 'Đã lập kế hoạch', color: 'slate' },
  'Đã hoàn thành': { label: 'Đã hoàn thành', color: 'emerald' },
  'Dự kiến': { label: 'Dự kiến', color: 'amber' },
  'Tạm dừng': { label: 'Tạm dừng', color: 'rose' },
};

export const loaiHinhBadge: BadgeConfig = {
  'Giám sát': { label: 'Giám sát', color: 'sky' },
  'Phản biện': { label: 'Phản biện', color: 'primary' },
  'Kiểm tra': { label: 'Kiểm tra', color: 'amber' },
  'Giám sát cộng đồng': { label: 'Giám sát cộng đồng', color: 'emerald' },
};
