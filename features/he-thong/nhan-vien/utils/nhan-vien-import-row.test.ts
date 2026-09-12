import { describe, it, expect } from 'vitest';
import {
  findRef,
  parseImportTrangThaiNhanVien,
  parseNhanVienImportRow,
  splitMultiCell,
  trimCell,
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
    existingUsernames: new Set<string>(),
    seenUsernames: new Map<string, number>(),
    ...over,
  };
}

const rowOk = {
  ten_tai_khoan: 'nguyenvana',
  ho_va_ten: 'Nguyễn Văn A',
  id_phong_ban: 'Ban Dân tộc',
  id_chuc_vu: 'Chuyên viên',
};

describe('trimCell', () => {
  it('giữ nguyên id bigint lớn Excel trả về dạng số', () => {
    expect(trimCell(1234567890123456)).toBe('1234567890123456');
  });
});

describe('splitMultiCell', () => {
  it('tách theo phẩy, chấm phẩy, gạch đứng và bỏ khoảng trắng thừa', () => {
    expect(splitMultiCell(' Hội Nông dân , Hội Phụ nữ ; ')).toEqual(['Hội Nông dân', 'Hội Phụ nữ']);
    expect(splitMultiCell('')).toEqual([]);
  });
});

describe('findRef', () => {
  it('ưu tiên khớp ID rồi mới tới tên, tên không phân biệt hoa thường', () => {
    const refs = [
      { id: '1', ten: 'Ban Dân tộc' },
      { id: '2', ten: '1' },
    ];
    expect(findRef(refs, '1')?.id).toBe('1');
    expect(findRef(refs, 'ban dân TỘC')?.id).toBe('1');
    expect(findRef(refs, 'không có')).toBeUndefined();
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
    expect(r).toEqual({
      ok: true,
      data: {
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
      },
    });
  });

  it('tổ chức nhiều giá trị, bỏ trùng, giữ thứ tự', () => {
    const r = parseNhanVienImportRow(
      2,
      { ...rowOk, to_chuc_ids: 'Hội Phụ nữ, Hội Nông dân; Hội Phụ nữ' },
      ctx(),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.to_chuc_ids).toEqual(['101', '100']);
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
      expect(r.data.cap_quan_ly).toEqual(['Tỉnh', 'Xã phường']);
      expect(r.data.don_vi_id).toBe('900');
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

  it('trùng tài khoản với hệ thống ⇒ chặn trước khi gọi mạng', () => {
    const r = parseNhanVienImportRow(4, rowOk, ctx({ existingUsernames: new Set(['nguyenvana']) }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toBe('Dòng 4: tên tài khoản « nguyenvana » đã có người dùng, hãy đặt tên khác.');
  });

  it('trùng tài khoản trong cùng file ⇒ chỉ ra dòng trước', () => {
    const r = parseNhanVienImportRow(9, rowOk, ctx({ seenUsernames: new Map([['nguyenvana', 3]]) }));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.message).toBe('Dòng 9: tên tài khoản « nguyenvana » đã xuất hiện ở dòng 3 trong cùng file.');
    }
  });

  it('bộ phận sai tên ⇒ báo riêng cho bộ phận', () => {
    const r = parseNhanVienImportRow(6, { ...rowOk, id_bo_phan: 'Tổ Văn thư' }, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('không tìm thấy bộ phận « Tổ Văn thư »');
  });
});
