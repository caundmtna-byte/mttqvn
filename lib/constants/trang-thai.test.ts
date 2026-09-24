import { describe, expect, it } from 'vitest';
import { parseTrangThaiHoatDongImport } from './trang-thai';

describe('parseTrangThaiHoatDongImport', () => {
  it('ô trống là "Đang hoạt động", không bị đọc thành Ngừng (Number(\'\') === 0)', () => {
    expect(parseTrangThaiHoatDongImport('')).toBe('Đang hoạt động');
    expect(parseTrangThaiHoatDongImport(null)).toBe('Đang hoạt động');
  });

  it('nhận chuỗi DB không phân biệt hoa/thường, dấu; nhận 1/0 kiểu cũ', () => {
    expect(parseTrangThaiHoatDongImport('ngung hoat dong')).toBe('Ngừng hoạt động');
    expect(parseTrangThaiHoatDongImport(0)).toBe('Ngừng hoạt động');
    expect(parseTrangThaiHoatDongImport('1')).toBe('Đang hoạt động');
  });

  it('giá trị lạ trả null để báo lỗi dòng, không lặng lẽ thành "Đang hoạt động"', () => {
    expect(parseTrangThaiHoatDongImport('Tạm dừng')).toBeNull();
    expect(parseTrangThaiHoatDongImport('2')).toBeNull();
  });
});
