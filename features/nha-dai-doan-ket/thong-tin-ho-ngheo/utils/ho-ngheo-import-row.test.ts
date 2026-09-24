import { describe, expect, it } from 'vitest';
import { parseHoNgheoImportRow, type HoNgheoImportRowCtx } from './ho-ngheo-import-row';
import { khoaSoCccd } from './ho-ngheo-import-keys';

const ctx: HoNgheoImportRowCtx = {
  xaPhuong: [
    { id: '10', ten: 'Xã Hoà Bình' },
    { id: '11', ten: 'Phường Trung Tâm' },
    { id: '12', ten: 'Phường Trung Tâm' },
  ],
  danToc: [{ id: '5', ten: 'Kinh' }],
  xaPhamVi: null,
};

const parse = (raw: Record<string, unknown>, c: HoNgheoImportRowCtx = ctx) =>
  parseHoNgheoImportRow(2, { ho_ten_dai_dien: 'Nguyễn Văn A', ...raw }, c);

describe('parseHoNgheoImportRow', () => {
  it('xã / dân tộc theo tên không dấu; enum không phân biệt hoa thường; ô trống lấy mặc định', () => {
    const r = parse({ xa_phuong_id: 'xa hoa binh', dan_toc_id: 'KINH', doi_tuong: 'cận NGHÈO' });
    expect(r.ok && r.data.values).toMatchObject({
      xa_phuong_id: '10',
      dan_toc_id: '5',
      doi_tuong: 'Cận nghèo',
      ton_giao: 'Không',
      trang_thai: 'Đang khó khăn',
    });
  });

  it('hai xã trùng tên → lỗi, phải dùng mã', () => {
    const r = parse({ xa_phuong_id: 'Phường Trung Tâm' });
    expect(r.ok).toBe(false);
    expect(parse({ xa_phuong_id: '12' }).ok).toBe(true);
  });

  it('giá trị enum lạ → lỗi có số dòng', () => {
    const r = parse({ ton_giao: 'Phật giáo' });
    expect(!r.ok && r.message).toContain('Dòng 2');
  });

  it('cán bộ cấp xã: xã khác bị chặn, xã trống tự gán xã mình', () => {
    const scoped = { ...ctx, xaPhamVi: '10' };
    expect(parse({ xa_phuong_id: '11' }, scoped).ok).toBe(false);
    const r = parse({}, scoped);
    expect(r.ok && r.data.values.xa_phuong_id).toBe('10');
  });

  it('thiếu họ tên → lỗi', () => {
    expect(parse({ ho_ten_dai_dien: '  ' }).ok).toBe(false);
  });

  it('khoá CCCD bóc mọi khoảng trắng như trigger DB', () => {
    expect(khoaSoCccd(' 001 203 ')).toBe('001203');
    expect(khoaSoCccd('   ')).toBeNull();
  });
});
