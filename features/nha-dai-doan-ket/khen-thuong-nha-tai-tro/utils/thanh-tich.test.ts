import { describe, expect, it } from 'vitest';
import { docKyNamKtnt, tongGiaTriKtnt } from './thanh-tich';

describe('tongGiaTriKtnt', () => {
  it('cộng đủ tiền mặt, hiện vật quy đổi, hàng nhập kho và đóng góp khác', () => {
    expect(
      tongGiaTriKtnt({ tien_mat: 1_000_000, hien_vat_quy_doi: 500_000, gia_tri_nhap_kho: 2_000_000 }, 300_000),
    ).toBe(3_800_000);
  });

  it('chỉ có hàng nhập kho vẫn ra số (trước đây ra 0 đ)', () => {
    expect(tongGiaTriKtnt({ tien_mat: 0, hien_vat_quy_doi: 0, gia_tri_nhap_kho: 7_500_000 }, null)).toBe(7_500_000);
  });
});

describe('docKyNamKtnt', () => {
  it('để trống cả hai = mọi năm', () => {
    expect(docKyNamKtnt('', undefined)).toEqual({ ok: true, tuNam: null, denNam: null });
  });

  it('đọc kỳ hợp lệ, cho phép chỉ một đầu', () => {
    expect(docKyNamKtnt('2024', '2026')).toEqual({ ok: true, tuNam: 2024, denNam: 2026 });
    expect(docKyNamKtnt(' 2025 ', '')).toEqual({ ok: true, tuNam: 2025, denNam: null });
  });

  it('từ > đến, năm ngoài khoảng hoặc đang gõ dở ⇒ không hợp lệ', () => {
    expect(docKyNamKtnt('2026', '2024').ok).toBe(false);
    expect(docKyNamKtnt('202', '').ok).toBe(false);
    expect(docKyNamKtnt('2024.5', '').ok).toBe(false);
  });
});
