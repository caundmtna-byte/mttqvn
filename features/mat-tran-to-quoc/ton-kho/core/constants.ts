import { NHAP_XUAT_KHO_LOAI_PHIEU, loaiPhieuLabel, type NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';

export { NHAP_XUAT_KHO_LOAI_PHIEU, loaiPhieuLabel };
export type { NhapXuatKhoLoaiPhieu };

export const TON_KHO_TABS = ['byProduct', 'baoCaoNXT'] as const;
export type TonKhoTabId = (typeof TON_KHO_TABS)[number];
