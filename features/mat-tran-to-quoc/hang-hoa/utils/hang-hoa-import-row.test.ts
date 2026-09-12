import { describe, it, expect } from 'vitest';
import {
  hangHoaDedupKey,
  normalizeMatchKey,
  parseDanhMucImportRow,
  parseHangHoaImportRow,
  parseImportThuTu,
  parseImportTrangThai,
  type DanhMucImportCtx,
  type HangHoaImportCtx,
} from './hang-hoa-import-row';

function danhMucCtx(over: Partial<DanhMucImportCtx> = {}): DanhMucImportCtx {
  return {
    existingTen: new Map(),
    seenTen: new Map(),
    nextThuTu: 7,
    ...over,
  };
}

function hangHoaCtx(over: Partial<HangHoaImportCtx> = {}): HangHoaImportCtx {
  return {
    danhMuc: [
      { id: '10', ten: 'Lương thực' },
      { id: '11', ten: 'Đồ dùng gia đình' },
    ],
    existingHang: new Set(),
    seenHang: new Map(),
    nextThuTuByDanhMuc: new Map([['10', 3]]),
    ...over,
  };
}

describe('parseImportTrangThai', () => {
  it('để trống ⇒ Đang hoạt động', () => {
    expect(parseImportTrangThai('')).toBe('Đang hoạt động');
    expect(parseImportTrangThai(null)).toBe('Đang hoạt động');
  });

  it('nhận cả cách viết tắt và không dấu', () => {
    expect(parseImportTrangThai('Hoạt động')).toBe('Đang hoạt động');
    expect(parseImportTrangThai('dang hoat dong')).toBe('Đang hoạt động');
    expect(parseImportTrangThai('NGƯNG')).toBe('Ngừng hoạt động');
    expect(parseImportTrangThai('ngung hoat dong')).toBe('Ngừng hoạt động');
    expect(parseImportTrangThai(0)).toBe('Ngừng hoạt động');
    expect(parseImportTrangThai(1)).toBe('Đang hoạt động');
  });

  it('giá trị lạ ⇒ null để người gọi báo lỗi theo dòng', () => {
    expect(parseImportTrangThai('đang chờ')).toBeNull();
  });
});

describe('parseImportThuTu', () => {
  it('trống ⇒ null (để hệ thống tự đánh số)', () => {
    expect(parseImportThuTu('')).toEqual({ ok: true, value: null });
  });

  it('số nguyên ≥ 0 hợp lệ, kể cả khi Excel trả về kiểu số', () => {
    expect(parseImportThuTu(0)).toEqual({ ok: true, value: 0 });
    expect(parseImportThuTu('12')).toEqual({ ok: true, value: 12 });
  });

  it('số âm / số lẻ / chữ ⇒ lỗi', () => {
    expect(parseImportThuTu('-1').ok).toBe(false);
    expect(parseImportThuTu('1.5').ok).toBe(false);
    expect(parseImportThuTu('một').ok).toBe(false);
  });
});

describe('normalizeMatchKey', () => {
  it('bỏ dấu cách thừa và không phân biệt hoa thường', () => {
    expect(normalizeMatchKey('  Gạo   tẻ ')).toBe('gạo tẻ');
  });
});

describe('parseDanhMucImportRow', () => {
  it('dòng hợp lệ, thứ tự trống ⇒ lấy thứ tự kế tiếp', () => {
    const r = parseDanhMucImportRow(2, { ten_danh_muc: ' Lương thực ', mo_ta: 'Gạo, mì' }, danhMucCtx());
    expect(r).toEqual({
      ok: true,
      data: { ten_danh_muc: 'Lương thực', mo_ta: 'Gạo, mì', thu_tu: 7, trang_thai: 'Đang hoạt động' },
    });
  });

  it('thiếu tên ⇒ báo đúng số dòng', () => {
    const r = parseDanhMucImportRow(5, { ten_danh_muc: '' }, danhMucCtx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Dòng 5: chưa điền Tên danh mục.');
  });

  it('trùng tên đã có trong hệ thống ⇒ nêu tên trong câu lỗi', () => {
    const ctx = danhMucCtx({ existingTen: new Map([['lương thực', 'Lương thực']]) });
    const r = parseDanhMucImportRow(3, { ten_danh_muc: 'LƯƠNG THỰC' }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Dòng 3: danh mục « Lương thực » đã có trong hệ thống, không thêm lại.');
  });

  it('trùng tên trong cùng file ⇒ chỉ ra dòng trước đó', () => {
    const ctx = danhMucCtx({ seenTen: new Map([['lương thực', 4]]) });
    const r = parseDanhMucImportRow(9, { ten_danh_muc: 'Lương thực' }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Dòng 9: tên danh mục « Lương thực » đã xuất hiện ở dòng 4 trong cùng file.');
  });

  it('trạng thái lạ ⇒ lỗi có nêu giá trị đã gõ', () => {
    const r = parseDanhMucImportRow(6, { ten_danh_muc: 'A', trang_thai: 'tạm dừng abc' }, danhMucCtx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('« tạm dừng abc »');
  });
});

describe('parseHangHoaImportRow', () => {
  it('tra danh mục theo TÊN, thứ tự trống ⇒ lấy số kế tiếp của danh mục đó', () => {
    const r = parseHangHoaImportRow(
      2,
      { id_danh_muc: 'lương thực', ten_hang_hoa: 'Gạo tẻ', don_vi_tinh: 'kg', quy_cach: 'Bao 25kg' },
      hangHoaCtx(),
    );
    expect(r).toEqual({
      ok: true,
      data: {
        id_danh_muc: '10',
        ten_hang_hoa: 'Gạo tẻ',
        don_vi_tinh: 'kg',
        mo_ta: '',
        quy_cach: 'Bao 25kg',
        thu_tu: 3,
        trang_thai: 'Đang hoạt động',
      },
    });
  });

  it('tra danh mục theo ID', () => {
    const r = parseHangHoaImportRow(2, { id_danh_muc: '11', ten_hang_hoa: 'Chăn', don_vi_tinh: 'cái' }, hangHoaCtx());
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.id_danh_muc).toBe('11');
  });

  it('danh mục không tồn tại ⇒ câu lỗi chỉ rõ tên đã gõ', () => {
    const r = parseHangHoaImportRow(
      12,
      { id_danh_muc: 'Thuốc men', ten_hang_hoa: 'Băng gạc', don_vi_tinh: 'hộp' },
      hangHoaCtx(),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('Dòng 12:');
      expect(r.message).toContain('không tìm thấy danh mục « Thuốc men »');
    }
  });

  it('thiếu đơn vị tính ⇒ lỗi riêng, không lẫn với thiếu tên hàng', () => {
    const r = parseHangHoaImportRow(4, { id_danh_muc: '10', ten_hang_hoa: 'Gạo', don_vi_tinh: '' }, hangHoaCtx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Dòng 4: chưa điền Đơn vị tính (kg, thùng, bao…).');
  });

  it('trùng hàng trong cùng danh mục đã có ở hệ thống ⇒ chặn', () => {
    const ctx = hangHoaCtx({ existingHang: new Set([hangHoaDedupKey('10', 'Gạo tẻ')]) });
    const r = parseHangHoaImportRow(3, { id_danh_muc: '10', ten_hang_hoa: 'gạo TẺ', don_vi_tinh: 'kg' }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Dòng 3: hàng « gạo TẺ » đã có trong danh mục « Lương thực », không thêm lại.');
  });

  it('cùng tên hàng nhưng KHÁC danh mục thì vẫn cho nhập', () => {
    const ctx = hangHoaCtx({ existingHang: new Set([hangHoaDedupKey('10', 'Gạo tẻ')]) });
    const r = parseHangHoaImportRow(3, { id_danh_muc: '11', ten_hang_hoa: 'Gạo tẻ', don_vi_tinh: 'kg' }, ctx);
    expect(r.ok).toBe(true);
  });

  it('trùng trong cùng file ⇒ chỉ ra dòng trước', () => {
    const ctx = hangHoaCtx({ seenHang: new Map([[hangHoaDedupKey('10', 'Gạo tẻ'), 2]]) });
    const r = parseHangHoaImportRow(8, { id_danh_muc: '10', ten_hang_hoa: 'Gạo tẻ', don_vi_tinh: 'kg' }, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Dòng 8: hàng « Gạo tẻ » đã xuất hiện ở dòng 2 trong cùng file.');
  });
});
