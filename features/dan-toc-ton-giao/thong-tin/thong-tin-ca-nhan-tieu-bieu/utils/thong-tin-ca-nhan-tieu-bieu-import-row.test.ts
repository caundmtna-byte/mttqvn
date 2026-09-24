import { describe, expect, it } from 'vitest';
import {
  parseCaNhanTieuBieuImportRow,
  type CaNhanTieuBieuImportRowCtx,
} from './thong-tin-ca-nhan-tieu-bieu-import-row';

const ctx: CaNhanTieuBieuImportRowCtx = {
  xaPhuong: [
    { id: '10', ten: 'Xã Hoà Bình' },
    { id: '11', ten: 'Phường Trung Tâm' },
    { id: '12', ten: 'Phường Trung Tâm' },
  ],
  donViPhamVi: null,
};

const parse = (raw: Record<string, unknown>, c: CaNhanTieuBieuImportRowCtx = ctx) =>
  parseCaNhanTieuBieuImportRow(3, { ho_va_ten: 'Nguyễn Văn A', ...raw }, c);

describe('parseCaNhanTieuBieuImportRow', () => {
  it('ô trống lấy mặc định; enum và xã không phân biệt hoa thường, dấu', () => {
    const r = parse({ ten_don_vi: 'xa hoa binh', trang_thai: 'NGUNG HOAT DONG' });
    expect(r.ok && r.data.values).toMatchObject({
      don_vi_id: '10',
      doi_tuong: 'Người uy tín',
      trang_thai: 'Ngừng hoạt động',
    });
  });

  it('trạng thái lạ → lỗi (trước đây lặng lẽ thành mặc định)', () => {
    const r = parse({ trang_thai: 'Tạm nghỉ' });
    expect(!r.ok && r.message).toContain('Dòng 3');
  });

  it('ngày sinh dd/mm/yyyy được chuẩn hoá; ngày không có thật → lỗi', () => {
    const r = parse({ ngay_sinh: '05/02/1970' });
    expect(r.ok && r.data.values.ngay_sinh).toBe('1970-02-05');
    expect(parse({ ngay_sinh: '31/02/1970' }).ok).toBe(false);
  });

  it('hai xã trùng tên → lỗi, nhập mã thì được; khớp chuỗi con không còn nhận', () => {
    expect(parse({ ten_don_vi: 'Phường Trung Tâm' }).ok).toBe(false);
    expect(parse({ ten_don_vi: '12' }).ok).toBe(true);
    expect(parse({ ten_don_vi: 'Hoà Bình' }).ok).toBe(false);
  });

  it('cán bộ cấp xã: xã khác bị chặn, xã trống tự gán xã mình', () => {
    const scoped = { ...ctx, donViPhamVi: '10' };
    expect(parse({ ten_don_vi: '11' }, scoped).ok).toBe(false);
    const r = parse({}, scoped);
    expect(r.ok && r.data.values.don_vi_id).toBe('10');
  });

  it('mang mã hệ thống để đối chiếu', () => {
    const r = parse({ id: ' 42 ' });
    expect(r.ok && r.data.idKey).toBe('42');
  });
});
