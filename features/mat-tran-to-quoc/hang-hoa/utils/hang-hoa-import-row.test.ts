import { describe, it, expect } from 'vitest';
import {
  danhMucImportPayload,
  hangHoaImportPayload,
  parseDanhMucImportRow,
  parseHangHoaImportRow,
  parseImportThuTu,
  parseImportTrangThai,
  type HangHoaImportRowCtx,
} from './hang-hoa-import-row';

const hangHoaCtx: HangHoaImportRowCtx = {
  danhMuc: [
    { id: '10', ten: 'Lương thực' },
    { id: '11', ten: 'Đồ dùng gia đình' },
  ],
};

describe('parseImportTrangThai', () => {
  it('để trống ⇒ chuỗi rỗng (người gọi tự quyết mặc định)', () => {
    expect(parseImportTrangThai('')).toBe('');
    expect(parseImportTrangThai(null)).toBe('');
  });

  it('nhận cả cách viết tắt và không dấu', () => {
    expect(parseImportTrangThai('Hoạt động')).toBe('Đang hoạt động');
    expect(parseImportTrangThai('dang hoat dong')).toBe('Đang hoạt động');
    expect(parseImportTrangThai('NGƯNG')).toBe('Ngừng hoạt động');
    expect(parseImportTrangThai(0)).toBe('Ngừng hoạt động');
    expect(parseImportTrangThai(1)).toBe('Đang hoạt động');
  });

  it('giá trị lạ ⇒ null để người gọi báo lỗi theo dòng', () => {
    expect(parseImportTrangThai('đang chờ')).toBeNull();
  });
});

describe('parseImportThuTu', () => {
  it('trống ⇒ null; số nguyên ≥ 0 hợp lệ', () => {
    expect(parseImportThuTu('')).toEqual({ ok: true, value: null });
    expect(parseImportThuTu(0)).toEqual({ ok: true, value: 0 });
    expect(parseImportThuTu('12')).toEqual({ ok: true, value: 12 });
  });

  it('số âm / số lẻ / chữ ⇒ lỗi', () => {
    expect(parseImportThuTu('-1').ok).toBe(false);
    expect(parseImportThuTu('1.5').ok).toBe(false);
    expect(parseImportThuTu('một').ok).toBe(false);
  });
});

describe('danh mục: đọc dòng + payload', () => {
  it('thiếu tên ⇒ báo đúng số dòng', () => {
    const r = parseDanhMucImportRow(5, { ten_danh_muc: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Dòng 5: chưa điền Tên danh mục.');
  });

  it('thêm mới: thứ tự/trạng thái trống ⇒ số kế tiếp + Đang hoạt động', () => {
    const r = parseDanhMucImportRow(2, { ten_danh_muc: ' Lương thực ', mo_ta: '', id: ' 7 ' });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.idKey).toBe('7');
    expect(danhMucImportPayload(r.data, { thuTuTiepTheo: 4 })).toEqual({
      ten_danh_muc: 'Lương thực',
      mo_ta: null,
      thu_tu: 4,
      trang_thai: 'Đang hoạt động',
    });
  });

  it('ghi đè: thứ tự/trạng thái trống KHÔNG có trong payload (giữ giá trị cũ)', () => {
    const r = parseDanhMucImportRow(2, { ten_danh_muc: 'A', mo_ta: 'x' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(danhMucImportPayload(r.data)).toEqual({ ten_danh_muc: 'A', mo_ta: 'x' });
  });
});

describe('hàng hóa: đọc dòng + payload', () => {
  it('tra danh mục theo TÊN (bỏ dấu) hoặc ID', () => {
    const byName = parseHangHoaImportRow(2, { id_danh_muc: 'luong thuc', ten_hang_hoa: 'Gạo', don_vi_tinh: 'kg' }, hangHoaCtx);
    const byId = parseHangHoaImportRow(2, { id_danh_muc: '11', ten_hang_hoa: 'Chăn', don_vi_tinh: 'cái' }, hangHoaCtx);
    expect(byName.ok && byName.data.id_danh_muc).toBe('10');
    expect(byId.ok && byId.data.id_danh_muc).toBe('11');
  });

  it('danh mục không tồn tại / trùng tên ⇒ lỗi, không đoán', () => {
    const missing = parseHangHoaImportRow(12, { id_danh_muc: 'Thuốc', ten_hang_hoa: 'B', don_vi_tinh: 'hộp' }, hangHoaCtx);
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.message).toContain('không tìm thấy danh mục « Thuốc »');

    const ctx: HangHoaImportRowCtx = { danhMuc: [{ id: '1', ten: 'Gạo' }, { id: '2', ten: 'Gáo' }] };
    const amb = parseHangHoaImportRow(3, { id_danh_muc: 'gao', ten_hang_hoa: 'B', don_vi_tinh: 'hộp' }, ctx);
    expect(amb.ok).toBe(false);
    if (!amb.ok) expect(amb.message).toContain('có nhiều danh mục cùng tên');
  });

  it('thiếu đơn vị tính ⇒ lỗi riêng', () => {
    const r = parseHangHoaImportRow(4, { id_danh_muc: '10', ten_hang_hoa: 'Gạo', don_vi_tinh: '' }, hangHoaCtx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Dòng 4: chưa điền Đơn vị tính (kg, thùng, bao…).');
  });

  it('payload: id danh mục là số, ô trống ⇒ null; ghi đè bỏ thứ tự trống', () => {
    const r = parseHangHoaImportRow(
      2,
      { id_danh_muc: '10', ten_hang_hoa: 'Gạo tẻ', don_vi_tinh: 'kg', quy_cach: 'Bao 25kg', trang_thai: 'ngưng' },
      hangHoaCtx,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(hangHoaImportPayload(r.data)).toEqual({
      id_danh_muc: 10,
      ten_hang_hoa: 'Gạo tẻ',
      don_vi_tinh: 'kg',
      mo_ta: null,
      quy_cach: 'Bao 25kg',
      trang_thai: 'Ngừng hoạt động',
    });
    expect(hangHoaImportPayload(r.data, { thuTuTiepTheo: 3 }).thu_tu).toBe(3);
  });
});
