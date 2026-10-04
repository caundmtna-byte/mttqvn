/**
 * Đường dẫn nhóm "Nghĩa tình dòng Lam" (đổi từ `/an-sinh-xa-hoi` ngày 2026-10-04).
 *
 * KHOÁ QUYỀN KHÔNG ĐỔI: `module_key` dưới DB vẫn là khoá cũ (`dot-cuu-tro`, `hang-hoa`,
 * `nhap-xuat-kho`, `don-vi-cuu-tro`, `bao-cao-ho-tro`, `vi-nguoi-ngheo`, `thong-tin-ho-ngheo`…)
 * — module nào có segment cuối khác khoá thì khai `storageKey` trong
 * `features/he-thong/phan-quyen/core/permission-modules-config.ts`. RLS gọi
 * `fn_co_quyen('<khoá cũ>', …)` nên không phải sửa DB.
 *
 * Bảng dưới đây là nguồn DUY NHẤT để chuyển link cũ (bookmark, link đã gửi, mục ghim).
 */
export const NTDL_ROOT = '/nghia-tinh-dong-lam';

/** [tiền tố cũ, tiền tố mới] — xếp tiền tố DÀI trước để khớp đúng nhất. */
const BANG_DUONG_DAN_CU: readonly (readonly [string, string])[] = [
  // Đợt 2026-10: /an-sinh-xa-hoi → /nghia-tinh-dong-lam, bỏ tầng /kho-cuu-tro và /danh-sach.
  ['/an-sinh-xa-hoi/kho-cuu-tro/dot-cuu-tro', `${NTDL_ROOT}/chuong-trinh-van-dong`],
  ['/an-sinh-xa-hoi/kho-cuu-tro/tiep-nhan', `${NTDL_ROOT}/tiep-nhan`],
  ['/an-sinh-xa-hoi/kho-cuu-tro/hang-hoa', `${NTDL_ROOT}/danh-muc-hang-hoa`],
  ['/an-sinh-xa-hoi/kho-cuu-tro/nhap-xuat-kho', `${NTDL_ROOT}/tiep-nhan-phan-bo-hang`],
  ['/an-sinh-xa-hoi/kho-cuu-tro/ton-kho', `${NTDL_ROOT}/ton-kho`],
  ['/an-sinh-xa-hoi/kho-cuu-tro/danh-sach-kho', `${NTDL_ROOT}/danh-sach-kho`],
  ['/an-sinh-xa-hoi/kho-cuu-tro/don-vi-cuu-tro', `${NTDL_ROOT}/nha-tai-tro`],
  ['/an-sinh-xa-hoi/kho-cuu-tro/don-vi-ho-tro', `${NTDL_ROOT}/nha-tai-tro`],
  ['/an-sinh-xa-hoi/kho-cuu-tro/bao-cao-ho-tro', `${NTDL_ROOT}/bao-cao-tiep-nhan-phan-bo`],
  ['/an-sinh-xa-hoi/khen-thuong-nha-tai-tro/danh-sach', `${NTDL_ROOT}/khen-thuong-nha-tai-tro`],
  ['/an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach', `${NTDL_ROOT}/nha-dai-doan-ket`],
  ['/an-sinh-xa-hoi/nha-dai-doan-ket/thong-ke', `${NTDL_ROOT}/nha-dai-doan-ket?tab=thong_ke`],
  ['/an-sinh-xa-hoi/nha-dai-doan-ket/sua-chua-nang-cap', `${NTDL_ROOT}/nha-dai-doan-ket`],
  ['/an-sinh-xa-hoi/vi-nguoi-ngheo/danh-sach', `${NTDL_ROOT}/chuong-trinh-ho-tro`],
  ['/an-sinh-xa-hoi/thong-tin-ho-ngheo/danh-sach', `${NTDL_ROOT}/doi-tuong-ho-tro`],
  ['/an-sinh-xa-hoi', NTDL_ROOT],
  // Trước nữa: kho cứu trợ nằm dưới Mặt trận tổ quốc.
  ['/mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro', `${NTDL_ROOT}/chuong-trinh-van-dong`],
  ['/mat-tran-to-quoc/kho-cuu-tro/hang-hoa', `${NTDL_ROOT}/danh-muc-hang-hoa`],
  ['/mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho', `${NTDL_ROOT}/tiep-nhan-phan-bo-hang`],
  ['/mat-tran-to-quoc/kho-cuu-tro/ton-kho', `${NTDL_ROOT}/ton-kho`],
  ['/mat-tran-to-quoc/kho-cuu-tro/danh-sach-kho', `${NTDL_ROOT}/danh-sach-kho`],
  ['/mat-tran-to-quoc/kho-cuu-tro/don-vi-cuu-tro', `${NTDL_ROOT}/nha-tai-tro`],
  ['/mat-tran-to-quoc/kho-cuu-tro/don-vi-ho-tro', `${NTDL_ROOT}/nha-tai-tro`],
  ['/mat-tran-to-quoc/kho-cuu-tro/bao-cao-ho-tro', `${NTDL_ROOT}/bao-cao-tiep-nhan-phan-bo`],
];

/**
 * Đường dẫn cũ → mới, giữ phần đuôi (`/:id/in/…`) và query. Không phải đường dẫn cũ ⇒ `null`.
 * Chỉ khớp trọn segment: `/an-sinh-xa-hoi-x` không bị coi là `/an-sinh-xa-hoi`.
 */
export function chuyenDuongDanCu(duongDan: string): string | null {
  const [path, query = ''] = duongDan.split('?', 2);
  for (const [cu, moi] of BANG_DUONG_DAN_CU) {
    if (path !== cu && !path.startsWith(`${cu}/`)) continue;
    const duoi = path.slice(cu.length);
    const [moiPath, moiQuery = ''] = moi.split('?', 2);
    const q = [moiQuery, query].filter(Boolean).join('&');
    return `${moiPath}${duoi}${q ? `?${q}` : ''}`;
  }
  return null;
}
