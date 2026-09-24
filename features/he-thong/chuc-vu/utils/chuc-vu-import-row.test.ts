import { describe, expect, it } from 'vitest';
import { parseChucVuImportRow, type ChucVuImportRowCtx } from './chuc-vu-import-row';

const ctx: ChucVuImportRowCtx = {
  capBac: [
    { id: '1', ma: 'CB1' },
    { id: '2', ma: 'CB2' },
  ],
  phongBan: [{ id: '10', ten: 'Ban Tổ chức' }],
};

const base = { ten_chuc_vu: 'Trưởng ban', cap_bac: '2', ten_phong_ban: 'ban to chuc' };

describe('parseChucVuImportRow', () => {
  it('cấp bậc theo id, phòng ban theo tên bỏ dấu, trạng thái trống ⇒ Đang hoạt động', () => {
    const r = parseChucVuImportRow(2, { ...base, id: '55', trang_thai: '' }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.idKey).toBe('55');
    expect(r.data.values).toMatchObject({
      cap_bac: '2',
      phong_ban_id: '10',
      thu_tu: 0,
      trang_thai: 'Đang hoạt động',
    });
  });

  it('cột id trống thì lấy mã ở cột "Cấp bậc (mã)", không phân biệt hoa thường', () => {
    const r = parseChucVuImportRow(2, { ...base, cap_bac: '', ma_cap_bac: 'cb1' }, ctx);
    expect(r.ok && r.data.values.cap_bac).toBe('1');
  });

  it('cấp bậc / phòng ban / thứ tự sai ⇒ báo đúng dòng, đúng giá trị', () => {
    const cap = parseChucVuImportRow(4, { ...base, cap_bac: 'X' }, ctx);
    expect(cap.ok ? '' : cap.message).toContain('Dòng 4:');
    expect(cap.ok ? '' : cap.message).toContain('« X »');
    const pb = parseChucVuImportRow(4, { ...base, ten_phong_ban: 'Ban Khác' }, ctx);
    expect(pb.ok ? '' : pb.message).toContain('« Ban Khác »');
    const tt = parseChucVuImportRow(4, { ...base, thu_tu: '1.5' }, ctx);
    expect(tt.ok).toBe(false);
  });
});
