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
  ho_ngheo_id: '9',
  ho_ten_chu_ho: 'Hồ Văn Thu',
  trang_thai: 'Đang khảo sát',
};

function soTien(v: unknown) {
  return nhaDaiDoanKetSchema.safeParse({ ...HO_SO_HOP_LE, so_tien: v });
}

describe('liên kết hộ nghèo', () => {
  it('bắt buộc chọn hộ', () => {
    expect(nhaDaiDoanKetSchema.safeParse({ ...HO_SO_HOP_LE, ho_ngheo_id: ' ' }).success).toBe(false);
    expect(nhaDaiDoanKetSchema.safeParse(HO_SO_HOP_LE).success).toBe(true);
  });
});

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

describe('dữ liệu biên bản', () => {
  const rong = { ho_ten: '', chuc_vu: '' };

  it('thành phần kiểm tra toàn rỗng ⇒ lưu NULL; dòng thôn rỗng bị bỏ', () => {
    const tatCaRong = nhaDaiDoanKetSchema.safeParse({
      ...HO_SO_HOP_LE,
      thanh_phan_kiem_tra: { bcd: rong, ubnd: rong, mttq: rong, thon: [rong] },
    });
    expect(tatCaRong.data?.thanh_phan_kiem_tra).toBeUndefined();

    const coNguoi = nhaDaiDoanKetSchema.safeParse({
      ...HO_SO_HOP_LE,
      thanh_phan_kiem_tra: {
        bcd: { ho_ten: ' Lê Văn A ', chuc_vu: '' },
        ubnd: rong,
        mttq: rong,
        thon: [rong, { ho_ten: 'Lò Văn B', chuc_vu: 'Xóm trưởng' }],
      },
    });
    expect(coNguoi.data?.thanh_phan_kiem_tra?.bcd.ho_ten).toBe('Lê Văn A');
    expect(coNguoi.data?.thanh_phan_kiem_tra?.thon).toEqual([
      { ho_ten: 'Lò Văn B', chuc_vu: 'Xóm trưởng' },
    ]);
  });

  it('nguồn khác: bỏ dòng rỗng, tiền âm bị chặn, quá 3 dòng bị chặn (CHECK ≤ 3)', () => {
    const r = nhaDaiDoanKetSchema.safeParse({
      ...HO_SO_HOP_LE,
      nguon_khac: [
        { ten: '', so_tien: '' },
        { ten: 'Gia đình', so_tien: '30.000.000' },
      ],
    });
    expect(r.data?.nguon_khac).toEqual([{ ten: 'Gia đình', so_tien: 30_000_000 }]);
    expect(
      nhaDaiDoanKetSchema.safeParse({ ...HO_SO_HOP_LE, nguon_khac: [{ ten: '', so_tien: '' }] }).data
        ?.nguon_khac,
    ).toBeUndefined();
    expect(
      nhaDaiDoanKetSchema.safeParse({ ...HO_SO_HOP_LE, nguon_khac: [{ ten: 'X', so_tien: '-5' }] })
        .success,
    ).toBe(false);
    const bon = Array.from({ length: 4 }, () => ({ ten: 'X', so_tien: '1' }));
    expect(nhaDaiDoanKetSchema.safeParse({ ...HO_SO_HOP_LE, nguon_khac: bon }).success).toBe(false);
  });

  it('diện tích nhận dấu phẩy thập phân; ngày sai định dạng bị chặn', () => {
    expect(
      nhaDaiDoanKetSchema.safeParse({ ...HO_SO_HOP_LE, dien_tich_san: '45,5' }).data?.dien_tich_san,
    ).toBe(45.5);
    expect(nhaDaiDoanKetSchema.safeParse({ ...HO_SO_HOP_LE, dien_tich_san: '-1' }).success).toBe(false);
    expect(nhaDaiDoanKetSchema.safeParse({ ...HO_SO_HOP_LE, ngay_ban_giao: '05/10/2026' }).success).toBe(
      false,
    );
  });
});
