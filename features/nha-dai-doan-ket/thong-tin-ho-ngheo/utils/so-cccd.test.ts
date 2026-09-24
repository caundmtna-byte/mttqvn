/**
 * Chuẩn hoá số căn cước phải khớp ĐÚNG cách trigger `fn_hngh_chuan_hoa()` làm
 * dưới DB (migration 20260921150600). Lệch nhau thì giao diện bảo hai số khác
 * nhau còn DB báo trùng khoá — lỗi gần như không chẩn đoán được từ màn hình.
 */
import { describe, expect, it } from 'vitest';
import { chuanHoaSoCccd, soCccdCoGiaTri } from './so-cccd';

describe('chuanHoaSoCccd', () => {
  it('bóc mọi khoảng trắng, kể cả ở giữa — như trigger DB', () => {
    expect(chuanHoaSoCccd('  040012345678  ')).toBe('040012345678');
    expect(chuanHoaSoCccd('040 012\t345 678')).toBe('040012345678');
  });

  it('null / undefined / rỗng đều về chuỗi rỗng', () => {
    expect(chuanHoaSoCccd(null)).toBe('');
    expect(chuanHoaSoCccd(undefined)).toBe('');
    expect(chuanHoaSoCccd('   ')).toBe('');
  });
});

describe('soCccdCoGiaTri', () => {
  it('chỉ số đã nhập mới tham gia kiểm trùng', () => {
    expect(soCccdCoGiaTri('040012345678')).toBe(true);
    expect(soCccdCoGiaTri('')).toBe(false);
    expect(soCccdCoGiaTri('   ')).toBe(false);
    expect(soCccdCoGiaTri(null)).toBe(false);
  });
});
