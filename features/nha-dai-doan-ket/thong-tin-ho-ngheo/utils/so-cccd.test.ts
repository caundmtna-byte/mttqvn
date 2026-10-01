/**
 * Chuẩn hoá số căn cước phải khớp ĐÚNG cách trigger `fn_hngh_chuan_hoa()` làm
 * dưới DB. Lệch nhau thì giao diện bảo hai số khác
 * nhau còn DB báo trùng khoá — lỗi gần như không chẩn đoán được từ màn hình.
 */
import { describe, expect, it } from 'vitest';
import { chuanHoaSoCccd, soCccdCoGiaTri, soCccdHopLe } from './so-cccd';

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

describe('soCccdHopLe', () => {
  it('đúng 12 chữ số thì hợp lệ, kể cả gõ cách quãng', () => {
    expect(soCccdHopLe('040012345678')).toBe(true);
    expect(soCccdHopLe('040 012 345 678')).toBe(true);
  });

  it('CMND cũ 9 chữ số vẫn hợp lệ', () => {
    expect(soCccdHopLe('186123456')).toBe(true);
    expect(soCccdHopLe('186 123 456')).toBe(true);
  });

  it('độ dài khác 9 và 12, hoặc lẫn ký tự khác, đều bị chặn', () => {
    expect(soCccdHopLe('18612345')).toBe(false);
    expect(soCccdHopLe('1861234567')).toBe(false);
    expect(soCccdHopLe('04001234567')).toBe(false);
    expect(soCccdHopLe('0400123456789')).toBe(false);
    expect(soCccdHopLe('04001234567a')).toBe(false);
    expect(soCccdHopLe('040-012-345-678')).toBe(false);
  });

  it('để trống vẫn hợp lệ — hộ chưa có giấy tờ', () => {
    expect(soCccdHopLe('')).toBe(true);
    expect(soCccdHopLe(null)).toBe(true);
  });
});
