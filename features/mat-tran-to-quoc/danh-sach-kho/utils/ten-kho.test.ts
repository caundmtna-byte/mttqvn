import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tenKhoTheoXa } from './ten-kho';

describe('tenKhoTheoXa', () => {
  it('thêm tiền tố MTTQ, hạ chữ đầu của tên xã', () => {
    expect(tenKhoTheoXa('Xã Yên Hòa')).toBe('MTTQ xã Yên Hòa');
    expect(tenKhoTheoXa('phường Quỳnh Mai')).toBe('MTTQ phường Quỳnh Mai');
  });

  it('gộp khoảng trắng thừa', () => {
    expect(tenKhoTheoXa('  xã   Châu Hồng ')).toBe('MTTQ xã Châu Hồng');
  });

  it('không có tên xã → null (giữ tên nhập tay)', () => {
    expect(tenKhoTheoXa(null)).toBeNull();
    expect(tenKhoTheoXa('   ')).toBeNull();
  });

  it('khớp quy tắc của trigger dưới DB', () => {
    const schema = readFileSync(resolve(__dirname, '../../../../supabase/schema.sql'), 'utf8');
    expect(schema).toContain("'MTTQ ' || lower(left(t, 1)) || substr(t, 2)");
    expect(schema).toContain('trg_kho_gan_ten_theo_xa');
  });
});
