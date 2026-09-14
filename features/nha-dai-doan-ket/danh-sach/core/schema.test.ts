import { describe, it, expect, beforeAll } from 'vitest';
import { applyZodVietnameseErrors } from '@/lib/validation/zod-vi';
import { nhaDaiDoanKetSchema } from './schema';

beforeAll(() => applyZodVietnameseErrors());

const HO_SO_HOP_LE = {
  noi_dung_ho_tro: 'Khảo sát hỗ trợ xây nhà cho hộ nghèo',
  nam: '2026',
  loai_hinh_ho_tro: 'Xây mới',
  nguon: 'Vì người nghèo',
  nguon_ho_tro: 'Cấp xã',
  ho_ten_chu_ho: 'Hồ Văn Thu',
  trang_thai: 'Đang khảo sát',
};

function soTien(v: unknown) {
  return nhaDaiDoanKetSchema.safeParse({ ...HO_SO_HOP_LE, so_tien: v });
}

describe('số tiền hồ sơ Nhà đại đoàn kết', () => {
  it('đọc được số dán từ Excel có dấu phân tách', () => {
    // `Number('500.000.000')` là NaN — cán bộ dán số từ Excel sẽ bị từ chối.
    expect(soTien('500.000.000').data?.so_tien).toBe(500_000_000);
    expect(soTien('500,000,000').data?.so_tien).toBe(500_000_000);
  });

  it('số gõ liền vẫn đọc đúng', () => {
    expect(soTien('500000000').data?.so_tien).toBe(500_000_000);
  });

  it('để trống là hợp lệ — hồ sơ đang khảo sát chưa chốt mức hỗ trợ', () => {
    const r = soTien('');
    expect(r.success).toBe(true);
    expect(r.data!.so_tien).toBeUndefined();
  });

  it('số âm bị từ chối — khớp CHECK (so_tien >= 0) ở DB', () => {
    expect(soTien('-1').success).toBe(false);
  });

  it('chuỗi không đọc được thì báo lỗi', () => {
    expect(soTien('năm trăm triệu').success).toBe(false);
  });
});
