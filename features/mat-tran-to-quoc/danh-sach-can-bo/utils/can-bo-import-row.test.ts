import { describe, it, expect } from 'vitest';
import { buildMttqCanBoSchema } from '../core/schema';
import { parseCanBoImportRow, parseImportCapQuanLy, type CanBoImportRowCtx } from './can-bo-import-row';

const departments: CanBoImportRowCtx['departments'] = [
  { id: 'pb1', ten_phong_ban: 'Văn phòng', cha_id: null, trang_thai: 'Đang hoạt động' },
  { id: 'pb2', ten_phong_ban: 'Ban Tuyên giáo', cha_id: null, trang_thai: 'Đang hoạt động' },
];
const positions: CanBoImportRowCtx['positions'] = [
  { id: 'cv1', ten_chuc_vu: 'Chuyên viên', phong_ban_id: 'pb1', trang_thai: 'Đang hoạt động' },
  { id: 'cv2', ten_chuc_vu: 'Chuyên viên', phong_ban_id: 'pb2', trang_thai: 'Đang hoạt động' },
  { id: 'cv3', ten_chuc_vu: 'Trưởng ban', phong_ban_id: 'pb2', trang_thai: 'Đang hoạt động' },
];
const ref = (id: string, ten: string) => ({ id, ten });

const ctx: CanBoImportRowCtx = {
  positions,
  departments,
  toChuc: [ref('tc1', 'Hội Phụ nữ'), ref('tc2', 'Hội Nông dân')],
  danToc: [ref('dt1', 'Kinh')],
  trinhDo: [ref('td1', 'Đại học')],
  lyLuan: [ref('ll1', 'Trung cấp')],
  trangThai: [ref('tt1', 'Đang công tác')],
  xa: [ref('x1', 'Phường Bến Thủy'), ref('x2', 'Xã Hưng Lộc'), ref('x3', 'Xã Hưng Lộc')],
  schema: buildMttqCanBoSchema(
    positions.map((p) => ({ id: p.id, phong_ban_id: p.phong_ban_id ?? null })),
    undefined,
    [...departments],
  ),
};

const base = {
  id_phong_ban: 'Ban Tuyên giáo',
  to_chuc_ids: 'hoi phu nu; Hội Nông dân',
  ho_ten: 'Nguyễn Văn A',
  ngay_sinh: '02/01/1980',
  gioi_tinh: 'nu',
  dan_toc_id: 'kinh',
  ton_giao: '',
  dia_chi: 'Vinh',
  dang_vien: 'x',
  trinh_do_id: 'Đại học',
  ly_luan_chinh_tri_id: 'Trung cấp',
  dien_thoai: '0900',
  chuc_vu_id: 'Chuyên viên',
  ngay_tham_gia_to_chuc: '2020-01-01',
  trang_thai_id: 'Đang công tác',
  ngay_nhap_trang_thai: '2020-01-01',
};

describe('parseCanBoImportRow', () => {
  it('chức vụ trùng tên ở nhiều phòng ban ⇒ lấy đúng chức vụ của phòng ban đã điền', () => {
    const r = parseCanBoImportRow(2, base, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.values).toMatchObject({
      id_phong_ban: 'pb2',
      chuc_vu_id: 'cv2',
      to_chuc_ids: ['tc1', 'tc2'],
      ngay_sinh: '1980-01-02',
      gioi_tinh: 'Nữ',
      dang_vien: true,
    });
  });

  it('chức vụ có thật nhưng thuộc phòng ban khác ⇒ báo lệch phòng ban', () => {
    const r = parseCanBoImportRow(3, { ...base, id_phong_ban: 'pb1', chuc_vu_id: 'Trưởng ban' }, ctx);
    expect(!r.ok && r.message).toContain('không thuộc phòng ban');
  });

  it('xã trùng tên ⇒ lỗi, không lấy bừa xã đầu tiên', () => {
    const r = parseCanBoImportRow(4, { ...base, don_vi_id: 'xa hung loc' }, ctx);
    expect(!r.ok && r.message).toContain('Có nhiều mục cùng tên');
  });

  it('ngày vào Đảng sai định dạng ⇒ lỗi (trước đây bị bỏ trống ngầm)', () => {
    const r = parseCanBoImportRow(5, { ...base, ngay_vao_dang: '31/02/2010' }, ctx);
    expect(!r.ok && r.message).toContain('Ngày vào Đảng');
  });
});

describe('parseImportCapQuanLy', () => {
  it('nhiều giá trị, bỏ trùng; giá trị lạ ⇒ null', () => {
    expect(parseImportCapQuanLy('Tỉnh; Xã phường, Tỉnh')).toEqual(['Tỉnh', 'Xã phường']);
    expect(parseImportCapQuanLy('')).toEqual([]);
    expect(parseImportCapQuanLy('Huyện')).toBeNull();
  });
});
