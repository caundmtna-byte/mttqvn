import { describe, it, expect } from 'vitest';
import { parseDonViCuuTroImportRow, parseImportLoai } from './don-vi-cuu-tro-import-row';

describe('parseImportLoai', () => {
  it('nhận mã, nhãn (bỏ dấu) và mã cũ; giá trị lạ ⇒ null thay vì Doanh nghiệp', () => {
    expect(parseImportLoai('ca_nhan')).toBe('ca_nhan');
    expect(parseImportLoai('Doanh_Nghiep')).toBe('doanh_nghiep');
    expect(parseImportLoai('chua')).toBe('co_so_ton_giao');
    expect(parseImportLoai('ca nhan')).toBe('ca_nhan');
    expect(parseImportLoai('Tập đoàn đa quốc gia')).toBeNull();
    expect(parseImportLoai('')).toBeNull();
  });
});

describe('parseDonViCuuTroImportRow', () => {
  const ctx = { xaPhuong: [{ id: '245', ten: 'Xã Tam Quang' }] };

  it('dòng hợp lệ + mã hệ thống', () => {
    const r = parseDonViCuuTroImportRow(2, { id: '9', loai: 'ca_nhan', ten: ' Nguyễn A ', don_vi_gioi_thieu: 'xa tam quang' }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.idKey).toBe('9');
    expect(r.data.values).toMatchObject({ loai: 'ca_nhan', ten: 'Nguyễn A', don_vi_gioi_thieu: '245' });
  });

  it('loại lạ / đơn vị giới thiệu không có ⇒ lỗi theo dòng', () => {
    const a = parseDonViCuuTroImportRow(3, { loai: 'xyz', ten: 'A' }, ctx);
    expect(!a.ok && a.message).toContain('Dòng 3: Loại đối tượng « xyz »');
    const b = parseDonViCuuTroImportRow(4, { loai: 'ca_nhan', ten: 'A', don_vi_gioi_thieu: 'Xã Lạ' }, ctx);
    expect(!b.ok && b.message).toContain('« Xã Lạ »');
  });
});
