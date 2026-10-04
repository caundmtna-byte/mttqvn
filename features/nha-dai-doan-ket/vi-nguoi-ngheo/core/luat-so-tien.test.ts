import { describe, expect, it } from 'vitest';
import { vnnOTienCanNhap } from './luat-so-tien';

const base = { trang_thai: 'Đã nhận', so_tien: null, tong_tien_quy_doi: null } as const;

describe('vnnOTienCanNhap', () => {
  it('đang khảo sát không bắt buộc gì', () => {
    expect(vnnOTienCanNhap({ ...base, trang_thai: 'Đang khảo sát', hinh_thuc_ho_tro: 'Tiền mặt' })).toEqual([]);
  });
  it('đã nhận + tiền mặt ⇒ cần số tiền', () => {
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Tiền mặt' })).toEqual(['so_tien']);
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Tiền mặt', so_tien: 500_000 })).toEqual([]);
  });
  it('đã nhận + hiện vật ⇒ cần tiền quy đổi, không cần tiền mặt', () => {
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Hiện vật' })).toEqual(['tong_tien_quy_doi']);
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Hiện vật', tong_tien_quy_doi: 300_000 })).toEqual([]);
  });
  it('đã nhận + hiện vật và tiền ⇒ cần cả hai', () => {
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Hiện vật và Tiền', so_tien: 0 })).toEqual([
      'so_tien',
      'tong_tien_quy_doi',
    ]);
  });
});
