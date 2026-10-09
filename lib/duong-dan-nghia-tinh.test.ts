import { describe, expect, it } from 'vitest';
import { chuyenDuongDanCu } from './duong-dan-nghia-tinh';

describe('chuyenDuongDanCu', () => {
  it('nhóm và từng module', () => {
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi')).toBe('/cong-tac-xa-hoi');
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/kho-cuu-tro/dot-cuu-tro')).toBe('/cong-tac-xa-hoi/chuong-trinh-van-dong');
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/kho-cuu-tro/don-vi-cuu-tro')).toBe('/cong-tac-xa-hoi/nha-tai-tro');
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/thong-tin-ho-ngheo/danh-sach')).toBe('/cong-tac-xa-hoi/doi-tuong-ho-tro');
  });

  it('giữ phần đuôi (trang in) và query', () => {
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach/12/in/ban-giao')).toBe(
      '/cong-tac-xa-hoi/nha-dai-doan-ket/12/in/ban-giao',
    );
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/kho-cuu-tro/nhap-xuat-kho/86/in-phieu')).toBe(
      '/cong-tac-xa-hoi/tiep-nhan-phan-bo-hang/86/in-phieu',
    );
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/kho-cuu-tro/tiep-nhan?nha_tai_tro=12')).toBe(
      '/cong-tac-xa-hoi/tiep-nhan-tien?nha_tai_tro=12',
    );
  });

  it('link thống kê cũ chuyển thành tab, ghép đúng query', () => {
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi/nha-dai-doan-ket/thong-ke')).toBe('/cong-tac-xa-hoi/nha-dai-doan-ket?tab=thong_ke');
  });

  it('Tiếp nhận → Tiếp nhận tiền, giữ trang in và query', () => {
    expect(chuyenDuongDanCu('/cong-tac-xa-hoi/tiep-nhan')).toBe('/cong-tac-xa-hoi/tiep-nhan-tien');
    expect(chuyenDuongDanCu('/cong-tac-xa-hoi/tiep-nhan/5/in/bien-ban-xac-nhan?tab=thong_ke')).toBe(
      '/cong-tac-xa-hoi/tiep-nhan-tien/5/in/bien-ban-xac-nhan?tab=thong_ke',
    );
  });

  it('nhóm cũ /nghia-tinh-dong-lam → /cong-tac-xa-hoi, giữ đuôi và query', () => {
    expect(chuyenDuongDanCu('/nghia-tinh-dong-lam')).toBe('/cong-tac-xa-hoi');
    expect(chuyenDuongDanCu('/nghia-tinh-dong-lam/nha-dai-doan-ket/12/in/ban-giao?x=1')).toBe(
      '/cong-tac-xa-hoi/nha-dai-doan-ket/12/in/ban-giao?x=1',
    );
    expect(chuyenDuongDanCu('/nghia-tinh-dong-lam/tiep-nhan/5')).toBe('/cong-tac-xa-hoi/tiep-nhan-tien/5');
    expect(chuyenDuongDanCu('/nghia-tinh-dong-lam/tiep-nhan-tien')).toBe('/cong-tac-xa-hoi/tiep-nhan-tien');
  });

  it('đường dẫn kho cũ dưới Mặt trận tổ quốc đi thẳng tới đường dẫn mới', () => {
    expect(chuyenDuongDanCu('/mat-tran-to-quoc/kho-cuu-tro/don-vi-ho-tro')).toBe('/cong-tac-xa-hoi/nha-tai-tro');
  });

  it('chỉ khớp trọn segment; đường dẫn khác ⇒ null', () => {
    expect(chuyenDuongDanCu('/an-sinh-xa-hoi-khac')).toBeNull();
    expect(chuyenDuongDanCu('/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop')).toBeNull();
    expect(chuyenDuongDanCu('/cong-tac-xa-hoi/tiep-nhan-tien')).toBeNull();
    expect(chuyenDuongDanCu('/cong-tac-xa-hoi/tiep-nhan-phan-bo-hang')).toBeNull();
  });
});
