import { describe, it, expect } from 'vitest';
import { countQuySoThuChiColumnSearchActive, resolveLoaiParam } from './column-search';

describe('resolveLoaiParam', () => {
  it('không chọn gì ⇒ không lọc', () => {
    expect(resolveLoaiParam([])).toBeNull();
  });

  it('chọn đúng một loại ⇒ lọc theo loại đó', () => {
    expect(resolveLoaiParam(['thu'])).toBe('thu');
    expect(resolveLoaiParam(['chi'])).toBe('chi');
  });

  it('chọn CẢ HAI ⇒ không lọc, không được lấy phần tử đầu', () => {
    expect(resolveLoaiParam(['thu', 'chi'])).toBeNull();
    expect(resolveLoaiParam(['chi', 'thu'])).toBeNull();
  });

  it('bỏ qua giá trị lạ', () => {
    expect(resolveLoaiParam(['khac'])).toBeNull();
    expect(resolveLoaiParam(['khac', 'thu'])).toBe('thu');
  });

  it('trùng lặp cùng một loại vẫn tính là một', () => {
    expect(resolveLoaiParam(['thu', 'thu'])).toBe('thu');
  });
});

describe('countQuySoThuChiColumnSearchActive', () => {
  it('chỉ đếm ô có nội dung thật', () => {
    expect(
      countQuySoThuChiColumnSearchActive({ so_chung_tu: 'PT', noi_dung: '   ', ghi_chu: '' }),
    ).toBe(1);
  });

  it('không có ô nào ⇒ 0', () => {
    expect(countQuySoThuChiColumnSearchActive(undefined)).toBe(0);
    expect(countQuySoThuChiColumnSearchActive({})).toBe(0);
  });
});
