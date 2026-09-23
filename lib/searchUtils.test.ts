import { describe, expect, it } from 'vitest';
import { matchesSearchTerm } from './searchUtils';

describe('matchesSearchTerm', () => {
  const row = {
    ho_ten: 'Nguyễn Văn Đức',
    ten_to_chuc_arr: ['Hội Nông dân', 'Đoàn Thanh niên'],
    ngay_sinh: '1990-03-05',
    so_tien: 1500000,
    meta: { x: 'bí mật' },
  };
  const keys = Object.keys(row);

  it('term rỗng luôn khớp', () => {
    expect(matchesSearchTerm(row, '   ', keys)).toBe(true);
  });

  it('bỏ qua dấu và hoa thường ở cả hai phía', () => {
    expect(matchesSearchTerm(row, 'nguyen van duc', keys)).toBe(true);
    expect(matchesSearchTerm(row, 'VĂN ĐỨC', keys)).toBe(true);
  });

  it('tìm được phần tử trong mảng', () => {
    expect(matchesSearchTerm(row, 'thanh nien', keys)).toBe(true);
  });

  it('ngày ISO khớp cả dạng DD/MM/YYYY', () => {
    expect(matchesSearchTerm(row, '05/03/1990', keys)).toBe(true);
    expect(matchesSearchTerm(row, '1990-03-05', keys)).toBe(true);
  });

  it('số khớp cả dạng thô lẫn dạng có dấu chấm', () => {
    expect(matchesSearchTerm(row, '1500000', keys)).toBe(true);
    expect(matchesSearchTerm(row, '1.500.000', keys)).toBe(true);
  });

  it('chỉ tìm trong keys được liệt kê, bỏ qua object lồng', () => {
    expect(matchesSearchTerm(row, 'bi mat', keys)).toBe(false);
    expect(matchesSearchTerm(row, 'nguyen', ['so_tien'])).toBe(false);
  });
});
