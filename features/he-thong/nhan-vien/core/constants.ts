import type { BadgeConfig } from '../../../../components/ui/EnumBadge';
import { txt } from '../../../../lib/text';
import type { TrangThaiNhanVien } from './types';

export type { TrangThaiNhanVien };

export const TRANG_THAI_NHAN_VIEN: readonly TrangThaiNhanVien[] = ['Hoạt động', 'Khóa'] as const;

export const STATUS_OPTIONS: { label: string; value: TrangThaiNhanVien }[] = [
  { get label() { return txt('employee.statusActive'); }, value: 'Hoạt động' },
  { get label() { return txt('employee.statusLocked'); }, value: 'Khóa' },
];

export const STATUS_BADGE_CONFIG: BadgeConfig<TrangThaiNhanVien> = {
  'Hoạt động': { get label() { return txt('employee.statusActive'); }, color: 'emerald' },
  'Khóa': { get label() { return txt('employee.statusLocked'); }, color: 'rose' },
};
