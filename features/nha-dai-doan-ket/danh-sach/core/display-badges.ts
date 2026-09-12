import type { BadgeConfig } from '@/components/ui/EnumBadge';

export const nddkTrangThaiBadge: BadgeConfig = {
  'Đang khảo sát': { label: 'Đang khảo sát', color: 'slate' },
  'Đã phê duyệt': { label: 'Đã phê duyệt', color: 'amber' },
  'Đang thực hiện': { label: 'Đang thực hiện', color: 'sky' },
  'Đã bàn giao': { label: 'Đã bàn giao', color: 'emerald' },
  'Tạm dừng': { label: 'Tạm dừng', color: 'rose' },
};

export const nddkLoaiHinhBadge: BadgeConfig = {
  'Xây mới': { label: 'Xây mới', color: 'primary' },
  'Sửa chữa': { label: 'Sửa chữa', color: 'sky' },
};

export const nddkNguonBadge: BadgeConfig = {
  'Vì người nghèo': { label: 'Vì người nghèo', color: 'primary' },
  'Cứu trợ': { label: 'Cứu trợ', color: 'rose' },
  'Ngân sách': { label: 'Ngân sách', color: 'amber' },
  'Giới thiệu': { label: 'Giới thiệu', color: 'emerald' },
};

export const nddkDoiTuongBadge: BadgeConfig = {
  'Hộ nghèo': { label: 'Hộ nghèo', color: 'rose' },
  'Cận nghèo': { label: 'Cận nghèo', color: 'amber' },
  'Khó khăn': { label: 'Khó khăn', color: 'slate' },
};
