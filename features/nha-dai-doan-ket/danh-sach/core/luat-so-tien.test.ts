import { describe, expect, it } from 'vitest';
import { docSchemaSql } from '@/lib/db-schema-snapshot';
import { canNhaTaiTro, nddkThieuTien } from './luat-so-tien';

describe('nddkThieuTien', () => {
  it('mọi trạng thái đều phải nhập tiền; 0 là hợp lệ', () => {
    expect(nddkThieuTien(null)).toBe(true);
    expect(nddkThieuTien(undefined)).toBe(true);
    expect(nddkThieuTien(Number.NaN)).toBe(true);
    expect(nddkThieuTien(0)).toBe(false);
    expect(nddkThieuTien(50_000_000)).toBe(false);
  });
});

describe('canNhaTaiTro', () => {
  it('chỉ nguồn "Ủng hộ trực tiếp" mới bắt buộc chọn nhà tài trợ', () => {
    expect(canNhaTaiTro('Ủng hộ trực tiếp')).toBe(true);
    expect(canNhaTaiTro('Cấp tỉnh')).toBe(false);
    expect(canNhaTaiTro('Cấp xã')).toBe(false);
  });
});

describe('khớp schema.sql', () => {
  it('nddk_nha_dai_doan_ket.so_tien là NOT NULL', () => {
    const sql = docSchemaSql();
    const dau = sql.indexOf('CREATE TABLE public.nddk_nha_dai_doan_ket (');
    const bang = sql.slice(dau, sql.indexOf('\n);', dau));
    expect(bang).toMatch(/\n    so_tien numeric\S* NOT NULL,/);
  });
});
