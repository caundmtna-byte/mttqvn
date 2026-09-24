import { describe, it, expect } from 'vitest';
import {
  kiemGhiDeNhanVien,
  parseImportTrangThaiNhanVien,
  parseNhanVienImportRow,
  splitMultiCell,
  type NhanVienImportCtx,
} from './nhan-vien-import-row';

function ctx(over: Partial<NhanVienImportCtx> = {}): NhanVienImportCtx {
  return {
    phongBan: [
      { id: '1', ten: 'Ban Dân tộc' },
      { id: '2', ten: 'Ban Tổ chức' },
    ],
    chucVu: [
      { id: '10', ten: 'Chuyên viên' },
      { id: '11', ten: 'Trưởng ban' },
    ],
    toChuc: [
      { id: '100', ten: 'Hội Nông dân' },
      { id: '101', ten: 'Hội Phụ nữ' },
    ],
    xaPhuong: [
      { id: '900', ten: 'Xã Môn Sơn' },
      { id: '901', ten: 'Phường Trường Thi' },
    ],
    taiKhoanTheoId: new Map<string, string>(),
    ...over,
  };
}

const rowOk = {
  ten_tai_khoan: 'nguyenvana',
  ho_va_ten: 'Nguyễn Văn A',
  id_phong_ban: 'Ban Dân tộc',
  id_chuc_vu: 'Chuyên viên',
};

describe('splitMultiCell', () => {
  it('tách theo phẩy, chấm phẩy, gạch đứng và bỏ khoảng trắng thừa', () => {
    expect(splitMultiCell(' Hội Nông dân , Hội Phụ nữ ; ')).toEqual(['Hội Nông dân', 'Hội Phụ nữ']);
    expect(splitMultiCell('')).toEqual([]);
  });
});

describe('parseImportTrangThaiNhanVien', () => {
  it('trống ⇒ Hoạt động; nhận cả cách viết không dấu', () => {
    expect(parseImportTrangThaiNhanVien('')).toBe('Hoạt động');
    expect(parseImportTrangThaiNhanVien('hoat dong')).toBe('Hoạt động');
    expect(parseImportTrangThaiNhanVien('Khoá')).toBe('Khóa');
    expect(parseImportTrangThaiNhanVien('khoa')).toBe('Khóa');
  });

  it('giá trị lạ ⇒ null', () => {
    expect(parseImportTrangThaiNhanVien('tạm nghỉ')).toBeNull();
  });
});

describe('parseNhanVienImportRow', () => {
  it('dòng tối thiểu hợp lệ ⇒ hạ chữ thường tên tài khoản, mặc định Hoạt động', () => {
    const r = parseNhanVienImportRow(2, { ...rowOk, ten_tai_khoan: 'NguyenVanA' }, ctx());
    expect(r.ok && r.data.idKey).toBeNull();
    expect(r.ok && r.data.values).toEqual({
        ten_tai_khoan: 'nguyenvana',
        ho_va_ten: 'Nguyễn Văn A',
        hinh_anh: null,
        id_phong_ban: '1',
        id_bo_phan: '',
        id_chuc_vu: '10',
        cap_quan_ly: [],
        to_chuc_ids: [],
        don_vi_id: '',
        trang_thai: 'Hoạt động',
    });
  });

  it('tổ chức nhiều giá trị, bỏ trùng, giữ thứ tự', () => {
    const r = parseNhanVienImportRow(
      2,
      { ...rowOk, to_chuc_ids: 'Hội Phụ nữ, Hội Nông dân; Hội Phụ nữ' },
      ctx(),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.values.to_chuc_ids).toEqual(['101', '100']);
  });

  it('Cấp quản lý « Xã phường » mà thiếu Đơn vị ⇒ chặn với câu nói rõ việc', () => {
    const r = parseNhanVienImportRow(7, { ...rowOk, cap_quan_ly: 'Xã phường' }, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toBe(
        'Dòng 7: Cấp quản lý là « Xã phường » thì bắt buộc phải điền cột Đơn vị (xã/phường).',
      );
    }
  });

  it('Cấp quản lý « Xã phường » kèm Đơn vị tra theo tên ⇒ hợp lệ', () => {
    const r = parseNhanVienImportRow(
      7,
      { ...rowOk, cap_quan_ly: 'Tỉnh, Xã phường', don_vi_id: 'xã môn sơn' },
      ctx(),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.values.cap_quan_ly).toEqual(['Tỉnh', 'Xã phường']);
      expect(r.data.values.don_vi_id).toBe('900');
    }
  });

  it('Cấp quản lý sai giá trị ⇒ nêu giá trị đã gõ', () => {
    const r = parseNhanVienImportRow(3, { ...rowOk, cap_quan_ly: 'Huyện' }, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('« Huyện »');
  });

  it('phòng ban không tồn tại ⇒ chỉ đúng tên đã gõ và nơi tra cứu', () => {
    const r = parseNhanVienImportRow(5, { ...rowOk, id_phong_ban: 'Ban Kinh tế' }, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toContain('Dòng 5:');
      expect(r.message).toContain('không tìm thấy phòng ban « Ban Kinh tế »');
    }
  });

  it('chức vụ không tồn tại báo riêng, không lẫn với phòng ban', () => {
    const r = parseNhanVienImportRow(5, { ...rowOk, id_chuc_vu: 'Giám đốc' }, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('không tìm thấy chức vụ « Giám đốc »');
  });

  it('ghi đè theo mã hệ thống không được đổi tên tài khoản (tài khoản đăng nhập giữ nguyên)', () => {
    const c = ctx({ taiKhoanTheoId: new Map([['77', 'tranthib']]) });
    const doi = parseNhanVienImportRow(4, { ...rowOk, id: '77' }, c);
    expect(doi.ok).toBe(false);
    if (!doi.ok) expect(doi.message).toContain('« tranthib »');
    const giu = parseNhanVienImportRow(4, { ...rowOk, id: '77', ten_tai_khoan: 'TranThiB' }, c);
    expect(giu.ok && giu.data.idKey).toBe('77');
  });

  it('xã phường trùng tên giữa hai tỉnh ⇒ không nhận bừa, bắt điền ID', () => {
    const c = ctx({
      xaPhuong: [
        { id: '900', ten: 'Xã Môn Sơn' },
        { id: '950', ten: 'Xã Môn Sơn' },
      ],
    });
    const r = parseNhanVienImportRow(3, { ...rowOk, don_vi_id: 'Xã Môn Sơn' }, c);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('có nhiều xã/phường');
    const byId = parseNhanVienImportRow(3, { ...rowOk, don_vi_id: '950' }, c);
    expect(byId.ok && byId.data.values.don_vi_id).toBe('950');
  });

  it('bộ phận sai tên ⇒ báo riêng cho bộ phận', () => {
    const r = parseNhanVienImportRow(6, { ...rowOk, id_bo_phan: 'Tổ Văn thư' }, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('không tìm thấy bộ phận « Tổ Văn thư »');
  });
});

describe('kiemGhiDeNhanVien', () => {
  const cu = (cap: string[]) => ({ id: '5', ten_tai_khoan: 'a', don_vi_id: '50', id_phong_ban: '1', cap_quan_ly: cap });
  const dong = (don_vi_id: string | undefined) =>
    ({ rowNum: 2, raw: {}, idKey: '5', values: { don_vi_id } }) as unknown as Parameters<typeof kiemGhiDeNhanVien>[1];

  it('xoá đơn vị của hồ sơ cấp xã khi file không có cột Cấp quản lý → lỗi', () => {
    expect(kiemGhiDeNhanVien(cu(['Xã phường']), dong(undefined), new Set(['don_vi_id']))).not.toBeNull();
  });

  it('có cột Cấp quản lý (bộ đọc dòng đã xét), hồ sơ cấp tỉnh, hoặc vẫn điền đơn vị → cho qua', () => {
    expect(kiemGhiDeNhanVien(cu(['Xã phường']), dong(undefined), new Set(['don_vi_id', 'cap_quan_ly']))).toBeNull();
    expect(kiemGhiDeNhanVien(cu(['Tỉnh']), dong(undefined), new Set(['don_vi_id']))).toBeNull();
    expect(kiemGhiDeNhanVien(cu(['Xã phường']), dong('51'), new Set(['don_vi_id']))).toBeNull();
  });
});
