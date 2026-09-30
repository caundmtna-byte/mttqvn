import { describe, expect, it } from 'vitest';
import { buildMucDichOptions } from './muc-dich-goi-y';

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
