import { describe, expect, it } from 'vitest';
import { vnnOTienCanNhap } from './luat-so-tien';
import { docSchemaSql } from '@/lib/db-schema-snapshot';

const base = { so_tien: null, tong_tien_quy_doi: null } as const;

describe('vnnOTienCanNhap', () => {
  it('tiền mặt ⇒ cần số tiền', () => {
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Tiền mặt' })).toEqual(['so_tien']);
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Tiền mặt', so_tien: 500_000 })).toEqual([]);
  });
  it('hiện vật ⇒ cần tiền quy đổi, không cần tiền mặt', () => {
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Hiện vật' })).toEqual(['tong_tien_quy_doi']);
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Hiện vật', tong_tien_quy_doi: 300_000 })).toEqual([]);
  });
  it('hiện vật và tiền ⇒ cần cả hai', () => {
    expect(vnnOTienCanNhap({ ...base, hinh_thuc_ho_tro: 'Hiện vật và Tiền' })).toEqual(['so_tien', 'tong_tien_quy_doi']);
  });
  it('nhập 0 là đã nhập', () => {
    expect(vnnOTienCanNhap({ hinh_thuc_ho_tro: 'Hiện vật và Tiền', so_tien: 0, tong_tien_quy_doi: 0 })).toEqual([]);
  });
});

describe('khớp CHECK vnn_so_tien_theo_hinh_thuc_chk trong schema.sql', () => {
  it('không còn phụ thuộc trạng thái', () => {
    const line = docSchemaSql().split('\n').find((l) => l.includes('CONSTRAINT vnn_so_tien_theo_hinh_thuc_chk'));
    expect(line).toBeDefined();
    expect(line).not.toContain('trang_thai');
    expect(line).toContain('so_tien IS NOT NULL');
    expect(line).toContain('tong_tien_quy_doi IS NOT NULL');
    expect(line).not.toContain('NOT VALID');
  });
});
