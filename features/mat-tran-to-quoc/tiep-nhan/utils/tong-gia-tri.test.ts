import { describe, expect, it } from 'vitest';
import { giaTriHienVatTiepNhan, tongGiaTriTiepNhan } from './tong-gia-tri';

describe('tongGiaTriTiepNhan', () => {
  it('cộng đủ bốn thành phần, ô trống tính 0', () => {
    expect(
      tongGiaTriTiepNhan({
        so_tien: 10_000_000,
        giay_to_co_gia_gia_tri: 2_000_000,
        hien_vat_khac_gia_tri: null,
        gia_tri_phieu_kho: 3_500_000,
      }),
    ).toBe(15_500_000);
  });
  it('khoản rỗng = 0 (bị chặn khi lưu)', () => {
    expect(
      tongGiaTriTiepNhan({ so_tien: 0, giay_to_co_gia_gia_tri: undefined, hien_vat_khac_gia_tri: null, gia_tri_phieu_kho: 0 }),
    ).toBe(0);
  });
});

describe('giaTriHienVatTiepNhan', () => {
  it('hàng kho gắn + hiện vật khác, không gồm tiền', () => {
    expect(giaTriHienVatTiepNhan({ hien_vat_khac_gia_tri: 500_000, gia_tri_phieu_kho: 1_200_000 })).toBe(1_700_000);
  });
});
