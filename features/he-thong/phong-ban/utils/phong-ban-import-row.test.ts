import { describe, expect, it } from 'vitest';
import { parsePhongBanImportRow, taoVongCha, type PhongBanImportRowCtx } from './phong-ban-import-row';

const ctx: PhongBanImportRowCtx = {
  phongBan: [
    { id: '1', ten: 'Văn phòng' },
    { id: '5', ten: 'Ban Tổ chức' },
  ],
  duongDanTheoId: new Map([
    ['1', '/1'],
    ['5', '/1/5'],
    ['9', '/1/5/9'],
  ]),
};

describe('parsePhongBanImportRow', () => {
  it('phòng cha theo tên bỏ dấu; trống ⇒ cấp cao nhất; trạng thái trống ⇒ Đang hoạt động', () => {
    const r = parsePhongBanImportRow(2, { ten_phong_ban: 'Tổ Văn thư', cha_id: 'van phong', trang_thai: '' }, ctx);
    expect(r.ok && r.data.values).toMatchObject({ cha_id: '1', thu_tu: 0, trang_thai: 'Đang hoạt động' });
    const goc = parsePhongBanImportRow(3, { ten_phong_ban: 'Ban Mới', cha_id: '' }, ctx);
    expect(goc.ok && goc.data.values.cha_id).toBe('');
  });

  it('phòng cha không có / thứ tự âm ⇒ báo đúng dòng', () => {
    const r = parsePhongBanImportRow(4, { ten_phong_ban: 'Tổ A', cha_id: 'Ban Khác' }, ctx);
    expect(r.ok ? '' : r.message).toBe(
      'Dòng 4: không tìm thấy phòng ban cấp trên « Ban Khác ». Nhập id hoặc đúng tên một phòng ban đã có.',
    );
    expect(parsePhongBanImportRow(4, { ten_phong_ban: 'Tổ A', thu_tu: -1 }, ctx).ok).toBe(false);
  });
});

describe('taoVongCha', () => {
  it('chặn gán chính nó hoặc phòng cấp dưới làm cha', () => {
    expect(taoVongCha('5', '5', ctx.duongDanTheoId)).toBe(true);
    expect(taoVongCha('5', '9', ctx.duongDanTheoId)).toBe(true);
    expect(taoVongCha('9', '1', ctx.duongDanTheoId)).toBe(false);
    expect(taoVongCha('5', null, ctx.duongDanTheoId)).toBe(false);
  });
});
