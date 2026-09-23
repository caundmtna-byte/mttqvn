import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyZodVietnameseErrors } from '@/lib/validation/zod-vi';
import { khenThuongNhaTaiTroSchema } from './schema';
import { KTNT_CAP_KHEN_VALUES, KTNT_TRANG_THAI_VALUES } from './constants';

beforeAll(() => applyZodVietnameseErrors());

const HOP_LE = {
  noi_dung_khen: 'Đã có thành tích ủng hộ Quỹ Vì người nghèo năm 2025',
  ngay_khen: '2026-01-15',
  cap_khen: 'Cấp tỉnh',
  nha_tai_tro_id: '12',
  trang_thai: 'Chờ duyệt',
};

const parse = (over: Record<string, unknown>) =>
  khenThuongNhaTaiTroSchema.safeParse({ ...HOP_LE, ...over });

describe('khenThuongNhaTaiTroSchema', () => {
  it('cấp xã bắt buộc chọn xã — khớp CHECK ktnt_xa_phuong_theo_cap_chk', () => {
    expect(parse({ cap_khen: 'Cấp xã', xa_phuong_id: '' }).success).toBe(false);
    expect(parse({ cap_khen: 'Cấp xã', xa_phuong_id: '7' }).data?.xa_phuong_id).toBe('7');
  });

  it('cấp khác cấp xã thì gỡ xã còn sót trên form (CHECK cấm gắn xã)', () => {
    const r = parse({ cap_khen: 'Cấp tỉnh', xa_phuong_id: '7' });
    expect(r.success).toBe(true);
    expect(r.data!.xa_phuong_id).toBeUndefined();
  });

  it('kỳ thành tích: từ > đến bị chặn, trống một đầu là hợp lệ', () => {
    expect(parse({ nam_thanh_tich_tu: '2026', nam_thanh_tich_den: '2024' }).success).toBe(false);
    const r = parse({ nam_thanh_tich_tu: '2024', nam_thanh_tich_den: '' });
    expect(r.data).toMatchObject({ nam_thanh_tich_tu: 2024, nam_thanh_tich_den: undefined });
  });

  it('giá trị đóng góp đọc được số dán từ Excel, âm bị chặn', () => {
    expect(parse({ gia_tri_dong_gop_khac: '1.500.000' }).data?.gia_tri_dong_gop_khac).toBe(1_500_000);
    expect(parse({ gia_tri_dong_gop_khac: '-1' }).success).toBe(false);
  });

  it('thiếu nhà tài trợ hoặc ngày khen sai định dạng bị chặn', () => {
    expect(parse({ nha_tai_tro_id: '' }).success).toBe(false);
    expect(parse({ ngay_khen: '15/01/2026' }).success).toBe(false);
  });
});

describe('danh mục khớp CHECK trong migration', () => {
  const sql = readFileSync(
    resolve(__dirname, '../../../../supabase/migrations/20260923110000_ktnt_khen_thuong_nha_tai_tro.sql'),
    'utf8',
  );
  const check = (col: string) => {
    const m = sql.match(new RegExp(`CHECK \\(${col} IN \\(([^)]*)\\)`));
    if (!m) throw new Error(`Không thấy CHECK của ${col}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };

  it('cap_khen', () => expect(check('cap_khen')).toEqual([...KTNT_CAP_KHEN_VALUES]));
  it('trang_thai', () => expect(check('trang_thai')).toEqual([...KTNT_TRANG_THAI_VALUES]));
});
