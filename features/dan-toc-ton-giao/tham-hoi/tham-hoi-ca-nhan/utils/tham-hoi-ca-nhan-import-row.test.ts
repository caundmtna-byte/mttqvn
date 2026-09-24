import { describe, expect, it } from 'vitest';
import {
  parseThamHoiCaNhanImportRow,
  parseTrangThaiThamHoiCell,
  type ThamHoiCaNhanImportRowCtx,
} from './tham-hoi-ca-nhan-import-row';

const ctx: ThamHoiCaNhanImportRowCtx = {
  caNhan: [
    { id: '1', ten: 'Nguyễn Văn A', doi_tuong: 'Chức sắc', chuc_vu_vi_tri: 'Trụ trì' },
    { id: '2', ten: 'Trần Thị B', doi_tuong: null, chuc_vu_vi_tri: null },
    { id: '3', ten: 'Trần Thị B', doi_tuong: null, chuc_vu_vi_tri: null },
  ],
  phongBan: [{ id: '7', ten: 'Ban Dân tộc' }],
  dip: [{ id: '9', ten: 'Tết Nguyên đán 2027' }],
  xaPhuong: [
    { id: '10', ten: 'Xã Hoà Bình' },
    { id: '11', ten: 'Phường Trung Tâm' },
  ],
  donViPhamVi: null,
};

const parse = (raw: Record<string, unknown>, c: ThamHoiCaNhanImportRowCtx = ctx) =>
  parseThamHoiCaNhanImportRow(4, { ho_va_ten: 'nguyen van a', dip_tham_hoi: 'TET NGUYEN DAN 2027', ...raw }, c);

describe('parseTrangThaiThamHoiCell', () => {
  it('giữ cách đọc ô checkbox của bản cũ; giá trị lạ → null', () => {
    expect(parseTrangThaiThamHoiCell(true)).toBe('Đã hoàn thành');
    expect(parseTrangThaiThamHoiCell('0')).toBe('Chưa thực hiện');
    expect(parseTrangThaiThamHoiCell('')).toBe('Chưa thực hiện');
    expect(parseTrangThaiThamHoiCell('dang thuc hien')).toBe('Đang thực hiện');
    expect(parseTrangThaiThamHoiCell('Hoãn')).toBeNull();
  });
});

describe('parseThamHoiCaNhanImportRow', () => {
  it('tra danh mục theo tên không dấu; sao đối tượng/chức vụ + tên dịp', () => {
    const r = parse({ ten_phong_ban: 'ban dan toc', thoi_gian_du_kien: '02/2027' });
    expect(r.ok && r.data.values).toMatchObject({
      ca_nhan_id: '1',
      dip_tham_hoi_id: '9',
      phong_ban_tham_muu_id: '7',
      thoi_gian_du_kien: '2027-02',
    });
    expect(r.ok && r.data.denorm).toEqual({ doi_tuong: 'Chức sắc', chuc_vu_vi_tri: 'Trụ trì' });
    expect(r.ok && r.data.tenDip).toBe('Tết Nguyên đán 2027');
  });

  it('cá nhân trùng tên → lỗi; khớp chuỗi con không còn nhận', () => {
    expect(parse({ ho_va_ten: 'Trần Thị B' }).ok).toBe(false);
    expect(parse({ ho_va_ten: '3' }).ok).toBe(true);
    expect(parse({ ho_va_ten: 'Nguyễn Văn' }).ok).toBe(false);
  });

  it('thời gian dự kiến không đọc được → lỗi (bản cũ lặng lẽ bỏ)', () => {
    const r = parse({ thoi_gian_du_kien: 'quý 1' });
    expect(!r.ok && r.message).toContain('Dòng 4');
  });

  it('"CQMTTQ Tỉnh" ⇒ không có đơn vị thăm hỏi', () => {
    const r = parse({ ten_don_vi_tham_hoi: 'cqmttq tinh' });
    expect(r.ok && r.data.values.don_vi_tham_hoi_id).toBeUndefined();
  });

  it('cán bộ cấp xã: ô trống gán xã mình; cả hai cột là xã khác → chặn', () => {
    const scoped = { ...ctx, donViPhamVi: '10' };
    const r = parse({}, scoped);
    expect(r.ok && r.data.values).toMatchObject({ don_vi_tham_hoi_id: '10', xa_phuong_id: '10' });
    // Một trong hai là xã mình là đủ — đúng luật sửa/xoá của module.
    expect(parse({ ten_don_vi_tham_hoi: 'CQMTTQ Tỉnh' }, scoped).ok).toBe(true);
    expect(parse({ ten_don_vi_tham_hoi: '11', ten_xa_phuong: '11' }, scoped).ok).toBe(false);
  });
});
