import type { KhoDonViCuuTroListRow } from './core/types';

const now = new Date().toISOString();

export const KHO_DON_VI_CUU_TRO_MOCK: KhoDonViCuuTroListRow[] = [
  {
    id: '1',
    tt: 1,
    loai: 'to_chuc',
    loai_label: 'Tổ chức',
    ten: 'Hội Chữ thập đỏ phường (mock)',
    dia_chi: '12 Nguyễn Huệ',
    dien_thoai: '02903851111',
    email: 'lienhe@example.org',
    ghi_chu: 'Ví dụ tổ chức.',
    tg_tao: now,
    tg_cap_nhat: now,
  },
  {
    id: '2',
    tt: 2,
    loai: 'ca_nhan',
    loai_label: 'Cá nhân',
    ten: 'Nguyễn Văn A',
    dia_chi: null,
    dien_thoai: '0909123456',
    email: null,
    ghi_chu: null,
    tg_tao: now,
    tg_cap_nhat: now,
  },
];
