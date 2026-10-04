import { describe, expect, it } from 'vitest';
import { chuyenDuongDanCu } from './duong-dan-nghia-tinh';

describe('chuyenDuongDanCu', () => {
  it('nhóm và từng module', () => {
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi')).toBe('/nghia-tinh-dong-lam');
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/kho-cuu-tro/dot-cuu-tro')).toBe('/nghia-tinh-dong-lam/chuong-trinh-van-dong');
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/kho-cuu-tro/don-vi-cuu-tro')).toBe('/nghia-tinh-dong-lam/nha-tai-tro');
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/thong-tin-ho-ngheo/danh-sach')).toBe('/nghia-tinh-dong-lam/doi-tuong-ho-tro');
  });

  it('giữ phần đuôi (trang in) và query', () => {
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach/12/in/ban-giao')).toBe(
      '/nghia-tinh-dong-lam/nha-dai-doan-ket/12/in/ban-giao',
    );
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/kho-cuu-tro/nhap-xuat-kho/86/in-phieu')).toBe(
      '/nghia-tinh-dong-lam/tiep-nhan-phan-bo-hang/86/in-phieu',
    );
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/kho-cuu-tro/tiep-nhan?nha_tai_tro=12')).toBe(
      '/nghia-tinh-dong-lam/tiep-nhan?nha_tai_tro=12',
    );
  });

  it('link thống kê cũ chuyển thành tab, ghép đúng query', () => {
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/nha-dai-doan-ket/thong-ke')).toBe('/nghia-tinh-dong-lam/nha-dai-doan-ket?tab=thong_ke');
  });

  it('đường dẫn kho cũ dưới Mặt trận tổ quốc đi thẳng tới đường dẫn mới', () => {
    expect(chuyenDuongDanCu('/mat-tran-to-quoc/kho-cuu-tro/don-vi-ho-tro')).toBe('/nghia-tinh-dong-lam/nha-tai-tro');
  });

  it('chỉ khớp trọn segment; đường dẫn khác ⇒ null', () => {
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi-khac')).toBeNull();
    expect(chuyenDuongDanCu('/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop')).toBeNull();
    expect(chuyenDuongDanCu('/nghia-tinh-dong-lam/tiep-nhan')).toBeNull();
  });
});
