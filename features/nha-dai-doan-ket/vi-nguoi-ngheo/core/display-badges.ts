import type { BadgeConfig } from '@/components/ui/EnumBadge';

export { nddkDoiTuongBadge as vnnDoiTuongBadge } from '../../danh-sach/core/display-badges';

export const vnnTrangThaiBadge: BadgeConfig = {
  'Đang khảo sát': { label: 'Đang khảo sát', color: 'slate' },
  'Đã nhận': { label: 'Đã nhận', color: 'emerald' },
};

export const vnnLinhVucBadge: BadgeConfig = {
  'Tết vì người nghèo': { label: 'Tết vì người nghèo', color: 'amber' },
  'Cứu trợ': { label: 'Cứu trợ', color: 'rose' },
  'Mô hình sinh kế': { label: 'Mô hình sinh kế', color: 'emerald' },
  'Học sinh nghèo': { label: 'Học sinh nghèo', color: 'sky' },
  'Chữa bệnh': { label: 'Chữa bệnh', color: 'primary' },
  'Nhà bị sập': { label: 'Nhà bị sập', color: 'violet' },
  'Người chết': { label: 'Người chết', color: 'slate' },
  'Hoả hoạn': { label: 'Hoả hoạn', color: 'pink' },
};

export const vnnNguonBadge: BadgeConfig = {
  'Vì người nghèo': { label: 'Vì người nghèo', color: 'primary' },
  'Cứu trợ': { label: 'Cứu trợ', color: 'rose' },
  'Ngân sách': { label: 'Ngân sách', color: 'amber' },
};

export const vnnHinhThucBadge: BadgeConfig = {
  'Tiền mặt': { label: 'Tiền mặt', color: 'emerald' },
  'Quà và Tiền': { label: 'Quà và Tiền', color: 'sky' },
  'Quà': { label: 'Quà', color: 'amber' },
};
