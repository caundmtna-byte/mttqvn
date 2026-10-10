import { describe, expect, it } from 'vitest';
import { docSchemaSql } from '@/lib/db-schema-snapshot';
import { canNhaTaiTro, nddkCanNhaTaiTro, nddkThieuTien } from './luat-so-tien';

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

describe('nddkCanNhaTaiTro', () => {
  it('chỉ khi Nguồn "Giới thiệu" VÀ Nguồn hỗ trợ "Ủng hộ trực tiếp"', () => {
    expect(nddkCanNhaTaiTro('Giới thiệu', 'Ủng hộ trực tiếp')).toBe(true);
    expect(nddkCanNhaTaiTro('Vì người nghèo', 'Ủng hộ trực tiếp')).toBe(false);
    expect(nddkCanNhaTaiTro('Giới thiệu', 'Cấp xã')).toBe(false);
    expect(nddkCanNhaTaiTro(undefined, undefined)).toBe(false);
  });
});

describe('khớp schema.sql', () => {
  it('nddk_nha_dai_doan_ket.so_tien là NOT NULL', () => {
    const sql = docSchemaSql();
    const dau = sql.indexOf('CREATE TABLE public.nddk_nha_dai_doan_ket (');
    const bang = sql.slice(dau, sql.indexOf('\n);', dau));
    expect(bang).toMatch(/\n {4}so_tien numeric\S* NOT NULL,/);
  });

  it('CHECK nhà tài trợ theo nguồn khớp luật client', () => {
    const sql = docSchemaSql();
    expect(sql).toMatch(
      /nddk_nha_tai_tro_theo_nguon_chk CHECK \(\(\(nha_tai_tro_id IS NULL\) OR \(\(nguon = 'Giới thiệu'::text\) AND \(nguon_ho_tro = 'Ủng hộ trực tiếp'::text\)\)\)\)/,
    );
    expect(sql).toMatch(
      /vnn_don_vi_ho_tro_theo_nguon_chk CHECK \(\(\(don_vi_ho_tro_id IS NULL\) OR \(nguon_ho_tro = 'Ủng hộ trực tiếp'::text\)\)\)/,
    );
  });
});
