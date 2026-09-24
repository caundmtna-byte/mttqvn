import { describe, expect, it } from 'vitest';
import { parseThamHoiToChucImportRow, type ThamHoiToChucImportRowCtx } from './tham-hoi-to-chuc-import-row';

const ctx: ThamHoiToChucImportRowCtx = {
  toChuc: [
    { id: '1', ten: 'Chùa Linh Ứng' },
    { id: '2', ten: 'Giáo xứ An Hoà' },
    { id: '3', ten: 'Giáo xứ An Hoà' },
  ],
  dip: [{ id: '9', ten: 'Lễ Phật đản 2027' }],
  xaPhuong: [
    { id: '10', ten: 'Xã Hoà Bình' },
    { id: '11', ten: 'Phường Trung Tâm' },
  ],
  donViPhamVi: null,
};

const parse = (raw: Record<string, unknown>, c: ThamHoiToChucImportRowCtx = ctx) =>
  parseThamHoiToChucImportRow(5, { ten_co_so: 'chua linh ung', dip_tham_hoi: '9', ...raw }, c);

describe('parseThamHoiToChucImportRow', () => {
  it('tra danh mục theo tên không dấu hoặc mã; mang tên dịp để sao vào bản ghi', () => {
    const r = parse({ don_vi_tham_hoi: 'xa hoa binh', tien_do: 'DA HOAN THANH' });
    expect(r.ok && r.data.values).toMatchObject({
      to_chuc_id: '1',
      dip_tham_hoi_id: '9',
      don_vi_tham_hoi_id: '10',
      tien_do: 'Đã hoàn thành',
    });
    expect(r.ok && r.data.tenDip).toBe('Lễ Phật đản 2027');
  });

  it('cơ sở trùng tên → lỗi; tiến độ lạ → lỗi (bản cũ lặng lẽ thành mặc định)', () => {
    expect(parse({ ten_co_so: 'Giáo xứ An Hoà' }).ok).toBe(false);
    const r = parse({ tien_do: 'Hoãn' });
    expect(!r.ok && r.message).toContain('Dòng 5');
  });

  it('"MTTQ Tỉnh" / "CQMTTQ Tỉnh" ⇒ không có đơn vị thăm hỏi', () => {
    for (const nhan of ['MTTQ Tỉnh', 'cqmttq tinh']) {
      const r = parse({ don_vi_tham_hoi: nhan });
      expect(r.ok && r.data.values.don_vi_tham_hoi_id).toBeUndefined();
    }
  });

  it('cán bộ cấp xã: ô trống gán xã mình; xã khác hoặc cấp tỉnh → chặn', () => {
    const scoped = { ...ctx, donViPhamVi: '10' };
    const r = parse({}, scoped);
    expect(r.ok && r.data.values.don_vi_tham_hoi_id).toBe('10');
    expect(parse({ don_vi_tham_hoi: '11' }, scoped).ok).toBe(false);
    expect(parse({ don_vi_tham_hoi: 'MTTQ Tỉnh' }, scoped).ok).toBe(false);
  });
});
