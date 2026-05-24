import { txt } from '@/lib/text';
import type { MttqTangLuongLoaiKy } from './types';

export const MTTQ_TANG_LUONG_LOAI_KY_OPTIONS: { value: MttqTangLuongLoaiKy; label: string }[] = [
  { value: 'dung_han', label: txt('matTranTangLuong.loaiKy.dungHan') },
  { value: 'truoc_han_6', label: txt('matTranTangLuong.loaiKy.truocHan6') },
  { value: 'truoc_han_9', label: txt('matTranTangLuong.loaiKy.truocHan9') },
  { value: 'truoc_han_12', label: txt('matTranTangLuong.loaiKy.truocHan12') },
];

export const TANG_LUONG_CYCLE_YEARS = 3;

export const TANG_LUONG_LIST_PATH = '/mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong';

export type TangLuongMainTab = 'lich_su' | 'ke_hoach' | 'thong_ke';

export const TANG_LUONG_MAIN_TABS = ['lich_su', 'ke_hoach', 'thong_ke'] as const satisfies readonly TangLuongMainTab[];
