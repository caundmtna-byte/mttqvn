import type { KhoDonViCuuTroListRow } from './core/types';
import { khoDonViCuuTroLoaiLabel } from './core/loai';

const now = new Date().toISOString();

export const KHO_DON_VI_CUU_TRO_MOCK: KhoDonViCuuTroListRow[] = [
  {
    id: '1',
    tt: 1,
    loai: 'chua',
    loai_label: khoDonViCuuTroLoaiLabel('chua'),
    ten: 'Chùa Phước Lâm (mock)',
    dia_chi: '12 Nguyễn Huệ',
    dien_thoai: '02903851111',
    email: 'lienhe@example.org',
    ghi_chu: 'Ví dụ chùa.',
    tg_tao: now,
    tg_cap_nhat: now,
  },
  {
    id: '2',
    tt: 2,
    loai: 'ca_nhan',
    loai_label: khoDonViCuuTroLoaiLabel('ca_nhan'),
    ten: 'Nguyễn Văn A',
    dia_chi: null,
    dien_thoai: '0909123456',
    email: null,
    ghi_chu: null,
    tg_tao: now,
    tg_cap_nhat: now,
  },
];
