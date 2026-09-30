export const NHAP_XUAT_KHO_LOAI_PHIEU = ['nhap_ngoai', 'xuat_ngoai', 'chuyen_kho'] as const;
export type NhapXuatKhoLoaiPhieu = (typeof NHAP_XUAT_KHO_LOAI_PHIEU)[number];

/** Prefix số phiếu auto-generate ở DB trigger (đồng bộ với migration). */
export const NHAP_XUAT_KHO_PREFIX_BY_LOAI: Record<NhapXuatKhoLoaiPhieu, string> = {
  nhap_ngoai: 'PN',
  xuat_ngoai: 'PX',
  chuyen_kho: 'PC',
};

export function loaiPhieuLabel(loai: NhapXuatKhoLoaiPhieu): string {
  switch (loai) {
    case 'nhap_ngoai':
      return 'Nhập từ ngoài';
    case 'xuat_ngoai':
      return 'Xuất ra ngoài';
    case 'chuyen_kho':
      return 'Chuyển kho';
  }
}

/** Mục đích gợi ý sẵn cho phiếu xuất — vẫn cho gõ mục đích khác. */
export const NXK_MUC_DICH_XUAT_MAC_DINH = ['Để tại kho dùng khi cần', 'Xuất cho hộ nghèo'] as const;
