import { describe, it, expect } from 'vitest';
import { parseTienInput, isSoTienHopLe, formatTienInput, SO_TIEN_TOI_DA } from './quy-tien';

describe('parseTienInput', () => {
  it('đọc được số gõ liền', () => {
    expect(parseTienInput('1500000')).toBe(1_500_000);
  });

  it('đọc được số có dấu chấm nhóm hàng nghìn kiểu Việt Nam', () => {
    expect(parseTienInput('1.500.000')).toBe(1_500_000);
  });

  it('đọc được số dán từ Excel (dấu phẩy nhóm hàng nghìn)', () => {
    expect(parseTienInput('1,500,000')).toBe(1_500_000);
  });

  it('đọc được số có khoảng trắng', () => {
    expect(parseTienInput(' 1 500 000 ')).toBe(1_500_000);
  });

  it('trả null khi để trống', () => {
    expect(parseTienInput('')).toBeNull();
    expect(parseTienInput('   ')).toBeNull();
    expect(parseTienInput(null)).toBeNull();
    expect(parseTienInput(undefined)).toBeNull();
  });

  it('trả null khi có chữ hoặc ký hiệu tiền tệ', () => {
    expect(parseTienInput('1.500.000đ')).toBeNull();
    expect(parseTienInput('một triệu')).toBeNull();
    expect(parseTienInput('1.500.000 VND')).toBeNull();
  });

  it('đọc được số dán từ Word/Excel có dấu cách không ngắt', () => {
    // U+00A0 và U+202F — người dán không nhìn thấy, nhưng vẫn nằm trong chuỗi.
    expect(parseTienInput('1\u00A0500\u00A0000')).toBe(1_500_000);
    expect(parseTienInput('1\u202F500\u202F000')).toBe(1_500_000);
  });

  it('trả null khi chỉ có dấu phân cách', () => {
    expect(parseTienInput('...')).toBeNull();
  });

  it('giữ nguyên số đưa vào dạng number', () => {
    expect(parseTienInput(250_000)).toBe(250_000);
    expect(parseTienInput(Number.NaN)).toBeNull();
  });
});

describe('isSoTienHopLe', () => {
  it('chấp nhận số dương', () => {
    expect(isSoTienHopLe(1)).toBe(true);
    expect(isSoTienHopLe(1_500_000)).toBe(true);
  });

  it('từ chối 0 và số âm — đúng ràng buộc quy_so_thu_chi_so_tien_check', () => {
    expect(isSoTienHopLe(0)).toBe(false);
    expect(isSoTienHopLe(-1)).toBe(false);
  });

  it('từ chối null và số không đọc được', () => {
    expect(isSoTienHopLe(null)).toBe(false);
    expect(isSoTienHopLe(Number.NaN)).toBe(false);
    expect(isSoTienHopLe(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('trần là MAX_SAFE_INTEGER — vượt mốc đó thì cộng dồn số dư không còn đáng tin', () => {
    expect(SO_TIEN_TOI_DA).toBe(Number.MAX_SAFE_INTEGER);
    expect(isSoTienHopLe(SO_TIEN_TOI_DA)).toBe(true);
    expect(isSoTienHopLe(SO_TIEN_TOI_DA + 2)).toBe(false);
  });
});

describe('formatTienInput', () => {
  it('nhóm hàng nghìn bằng dấu chấm, không kèm ký hiệu tiền tệ', () => {
    expect(formatTienInput(1_500_000)).toBe('1.500.000');
  });

  it('trả chuỗi rỗng khi không có số', () => {
    expect(formatTienInput(null)).toBe('');
    expect(formatTienInput(undefined)).toBe('');
  });
});
