import { describe, expect, it } from 'vitest';
import { buildMucDichOptions, laMucDichXuatHoNgheo } from './muc-dich-goi-y';

describe('buildMucDichOptions', () => {
  it('phiếu xuất: hai mục đích mặc định đứng đầu, đúng thứ tự', () => {
    expect(buildMucDichOptions('xuat_ngoai', [])).toEqual(['Để tại kho dùng khi cần', 'Xuất cho hộ nghèo']);
  });

  it('phiếu xuất: nối mục đích đã dùng sau mặc định, không lặp mặc định', () => {
    expect(
      buildMucDichOptions('xuat_ngoai', ['xuất cho hộ nghèo', 'Cứu trợ bão lũ', 'Biếu tặng']),
    ).toEqual(['Để tại kho dùng khi cần', 'Xuất cho hộ nghèo', 'Biếu tặng', 'Cứu trợ bão lũ']);
  });

  it('loại khác: chỉ có mục đích đã dùng, không kèm mặc định của phiếu xuất', () => {
    expect(buildMucDichOptions('nhap_ngoai', ['Tiếp nhận ủng hộ'])).toEqual(['Tiếp nhận ủng hộ']);
    expect(buildMucDichOptions('chuyen_kho', [])).toEqual([]);
  });

  it('khử trùng hoa thường + khoảng trắng, bỏ chuỗi rỗng', () => {
    expect(buildMucDichOptions('nhap_ngoai', ['Ủng hộ  Tết', 'ủng hộ tết', ' ', ''])).toEqual(['Ủng hộ Tết']);
  });

  it('giá trị đang chọn luôn có mặt dù chưa có trong DB', () => {
    expect(buildMucDichOptions('chuyen_kho', ['A'], 'Điều chuyển')).toEqual(['A', 'Điều chuyển']);
  });
});

describe('laMucDichXuatHoNgheo', () => {
  it('nhận đúng mục đích, không phân biệt hoa thường và khoảng trắng thừa', () => {
    expect(laMucDichXuatHoNgheo('xuat_ngoai', 'Xuất cho hộ nghèo')).toBe(true);
    expect(laMucDichXuatHoNgheo('xuat_ngoai', '  xuất CHO   hộ nghèo ')).toBe(true);
  });

  it('mục đích khác hoặc để trống thì không bắt chọn hộ', () => {
    expect(laMucDichXuatHoNgheo('xuat_ngoai', 'Để tại kho dùng khi cần')).toBe(false);
    expect(laMucDichXuatHoNgheo('xuat_ngoai', 'Xuất cho hộ nghèo khó')).toBe(false);
    expect(laMucDichXuatHoNgheo('xuat_ngoai', undefined)).toBe(false);
  });

  it('chỉ phiếu xuất ra ngoài mới tính — nhập / chuyển kho thì không', () => {
    expect(laMucDichXuatHoNgheo('nhap_ngoai', 'Xuất cho hộ nghèo')).toBe(false);
    expect(laMucDichXuatHoNgheo('chuyen_kho', 'Xuất cho hộ nghèo')).toBe(false);
  });
});
