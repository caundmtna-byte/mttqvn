import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyZodVietnameseErrors } from '@/lib/validation/zod-vi';
import { viNguoiNgheoSchema } from './schema';
import {
  VNN_DOI_TUONG_VALUES,
  VNN_HINH_THUC_VALUES,
  VNN_LINH_VUC_VALUES,
  VNN_NGUON_HO_TRO_VALUES,
  VNN_NGUON_VALUES,
  VNN_TRANG_THAI_VALUES,
} from './constants';

beforeAll(() => applyZodVietnameseErrors());

const KHOAN_HOP_LE = {
  noi_dung_ho_tro: 'Tết vì người nghèo 2026',
  nam: '2026',
  linh_vuc_ho_tro: 'Tết vì người nghèo',
  nguon: 'Vì người nghèo',
  nguon_ho_tro: 'Cấp tỉnh',
  ho_ten_nguoi_nhan: 'Hồ Văn Thu',
  hinh_thuc_ho_tro: 'Tiền mặt',
  trang_thai: 'Đang khảo sát',
};

function parse(over: Record<string, unknown>) {
  return viNguoiNgheoSchema.safeParse({ ...KHOAN_HOP_LE, ...over });
}

describe('viNguoiNgheoSchema', () => {
  it('đọc được số tiền dán từ Excel có dấu phân tách', () => {
    expect(parse({ so_tien: '500.000' }).data?.so_tien).toBe(500_000);
    expect(parse({ so_tien: '500,000' }).data?.so_tien).toBe(500_000);
  });

  it('để trống số tiền là hợp lệ — khoản chỉ có quà', () => {
    const r = parse({ so_tien: '', hinh_thuc_ho_tro: 'Quà' });
    expect(r.success).toBe(true);
    expect(r.data!.so_tien).toBeUndefined();
  });

  it('số âm và chữ bị từ chối', () => {
    expect(parse({ so_tien: '-1' }).success).toBe(false);
    expect(parse({ so_tien: 'một triệu' }).success).toBe(false);
  });

  it('ô liên kết trống quy về undefined (gửi NULL), không phải chuỗi rỗng', () => {
    const r = parse({ ho_ngheo_id: '', don_vi_ho_tro_id: ' ', xa_phuong_id: '' });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      ho_ngheo_id: undefined,
      don_vi_ho_tro_id: undefined,
      xa_phuong_id: undefined,
    });
  });

  it('"Quà tết" cũ không còn là lĩnh vực hợp lệ — đã gộp vào "Tết vì người nghèo"', () => {
    expect(parse({ linh_vuc_ho_tro: 'Quà tết' }).success).toBe(false);
  });

  it('năm ngoài khoảng CHECK bị từ chối', () => {
    expect(parse({ nam: 1999 }).success).toBe(false);
    expect(parse({ nam: 2101 }).success).toBe(false);
  });
});

/**
 * Danh mục ở client là BẢN SAO của CHECK dưới DB. Lệch nhau thì giao diện cho
 * chọn một giá trị mà DB từ chối — test này giữ hai bên khớp.
 */
describe('danh mục khớp CHECK trong migration', () => {
  const sql = readFileSync(
    resolve(__dirname, '../../../../supabase/migrations/20260923100000_vnn_chuong_trinh_vi_nguoi_ngheo.sql'),
    'utf8',
  );

  function checkValues(col: string): string[] {
    const m = sql.match(new RegExp(`CHECK \\((?:${col} IS NULL OR )?${col} IN \\(([^)]*)\\)`));
    if (!m) throw new Error(`Không thấy CHECK của cột ${col}`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  }

  it.each([
    ['linh_vuc_ho_tro', VNN_LINH_VUC_VALUES],
    ['nguon', VNN_NGUON_VALUES],
    ['nguon_ho_tro', VNN_NGUON_HO_TRO_VALUES],
    ['doi_tuong', VNN_DOI_TUONG_VALUES],
    ['hinh_thuc_ho_tro', VNN_HINH_THUC_VALUES],
    ['trang_thai', VNN_TRANG_THAI_VALUES],
  ] as const)('%s', (col, values) => {
    expect(checkValues(col)).toEqual([...values]);
  });
});
