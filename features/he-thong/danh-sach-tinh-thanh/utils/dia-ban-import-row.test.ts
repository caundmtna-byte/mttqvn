import { describe, expect, it } from 'vitest';
import { docThuTu, parseTinhThanhImportRow, parseXaPhuongImportRow } from './dia-ban-import-row';

const ctx = {
  tinh: [
    { id: '1', ten: 'Nghệ An' },
    { id: '2', ten: 'Hà Tĩnh' },
  ],
};

describe('docThuTu', () => {
  it('trống ⇒ 0; số nguyên không âm giữ nguyên; còn lại ⇒ null', () => {
    expect(docThuTu('')).toBe(0);
    expect(docThuTu(3)).toBe(3);
    expect(docThuTu('abc')).toBeNull();
    expect(docThuTu(-1)).toBeNull();
  });
});

describe('parseXaPhuongImportRow', () => {
  it('tỉnh theo id, theo tên bỏ dấu ở cột id, hoặc lấy cột ten_tinh khi cột id trống/sai', () => {
    const byId = parseXaPhuongImportRow(2, { ten: 'Xã A', id_tinh_thanh: '2' }, ctx);
    expect(byId.ok && byId.data.values.id_tinh_thanh).toBe('2');
    const byTen = parseXaPhuongImportRow(2, { ten: 'Xã A', id_tinh_thanh: 'nghe an' }, ctx);
    expect(byTen.ok && byTen.data.values.id_tinh_thanh).toBe('1');
    const fallback = parseXaPhuongImportRow(2, { ten: 'Xã A', id_tinh_thanh: '99', ten_tinh: 'Hà Tĩnh' }, ctx);
    expect(fallback.ok && fallback.data.values.id_tinh_thanh).toBe('2');
  });

  it('không tìm thấy tỉnh ⇒ báo giá trị đã gõ', () => {
    const r = parseXaPhuongImportRow(5, { ten: 'Xã A', ten_tinh: 'Huế' }, ctx);
    expect(r.ok ? '' : r.message).toContain('Dòng 5:');
    expect(r.ok ? '' : r.message).toContain('« Huế »');
  });
});

describe('parseTinhThanhImportRow', () => {
  it('giữ id để đối chiếu, báo lỗi thứ tự sai', () => {
    const r = parseTinhThanhImportRow(2, { ten: 'Nghệ An', id: '1' });
    expect(r.ok && r.data.idKey).toBe('1');
    expect(parseTinhThanhImportRow(2, { ten: 'Nghệ An', thu_tu: 'x' }).ok).toBe(false);
  });
});
