import { describe, expect, it } from 'vitest';
import { vnnOTienCanNhap } from './luat-so-tien';
import { docSchemaSql } from '@/lib/db-schema-snapshot';

describe('vnnOTienCanNhap', () => {
  it('mọi hình thức đều phải nhập số tiền', () => {
    expect(vnnOTienCanNhap({ so_tien: null })).toEqual(['so_tien']);
    expect(vnnOTienCanNhap({})).toEqual(['so_tien']);
    expect(vnnOTienCanNhap({ so_tien: Number.NaN })).toEqual(['so_tien']);
    expect(vnnOTienCanNhap({ so_tien: 500_000 })).toEqual([]);
  });
  it('nhập 0 là đã nhập', () => {
    expect(vnnOTienCanNhap({ so_tien: 0 })).toEqual([]);
  });
});

describe('khớp schema.sql', () => {
  it('so_tien NOT NULL, bỏ CHECK theo hình thức', () => {
    const sql = docSchemaSql();
    const bang = sql.slice(sql.indexOf('CREATE TABLE public.vnn_chuong_trinh ('));
    const cot = bang.split('\n').find((l) => /^\s+so_tien numeric/.test(l));
    expect(cot).toContain('NOT NULL');
    expect(sql).not.toContain('vnn_so_tien_theo_hinh_thuc_chk');
  });
});
