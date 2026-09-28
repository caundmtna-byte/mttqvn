/**
 * Schema form phải chặn ĐÚNG những gì CHECK dưới DB chặn — nếu không, người
 * dùng bấm Lưu rồi mới nhận lỗi Postgres thay vì thấy câu tiếng Việt tại ô.
 * Đối chiếu: `supabase/migrations/20260921150000_hngh_thong_tin_ho_ngheo.sql`.
 */
import { describe, expect, it } from 'vitest';
import { hoNgheoSchema, hoNgheoToFormInput } from './schema';

const hoHopLe = {
  ho_ten_dai_dien: 'Nguyễn Văn A',
  so_cccd: '',
  xa_phuong_id: '',
  khoi_xom: '',
  doi_tuong: '',
  dien_thoai: '',
  dan_toc_id: '',
  ton_giao: 'Không',
  so_tai_khoan: '',
  ngan_hang: '',
  trang_thai: 'Đang khó khăn',
  ghi_chu: '',
};

describe('hoNgheoSchema', () => {
  it('hộ tối thiểu chỉ cần họ tên', () => {
    expect(hoNgheoSchema.safeParse(hoHopLe).success).toBe(true);
  });

  it('họ tên rỗng hoặc toàn khoảng trắng bị chặn', () => {
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, ho_ten_dai_dien: '' }).success).toBe(false);
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, ho_ten_dai_dien: '   ' }).success).toBe(false);
  });

  it('tôn giáo chỉ nhận Có / Không', () => {
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, ton_giao: 'Có' }).success).toBe(true);
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, ton_giao: 'Phật giáo' }).success).toBe(false);
  });

  it('trạng thái chỉ nhận hai giá trị của nghiệp vụ', () => {
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, trang_thai: 'Hết khó khăn' }).success).toBe(true);
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, trang_thai: 'Thoát nghèo' }).success).toBe(false);
  });

  it('số căn cước: trống được, đã nhập thì đủ 12 chữ số', () => {
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, so_cccd: '040 012 345 678' }).data?.so_cccd).toBe(
      '040012345678',
    );
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, so_cccd: '   ' }).data?.so_cccd).toBeUndefined();
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, so_cccd: '04001234567' }).success).toBe(false);
  });

  it('đối tượng để trống được, giá trị lạ thì không', () => {
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, doi_tuong: 'Hộ nghèo' }).success).toBe(true);
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, doi_tuong: 'Hộ khá' }).success).toBe(false);
  });

  // Khớp CHECK trong 20260928110000_nddk_bien_ban_in.sql.
  it('nhân khẩu: ô trống ⇒ undefined, số ngoài khoảng CHECK bị chặn', () => {
    const r = hoNgheoSchema.safeParse({ ...hoHopLe, nam_sinh: '', so_nhan_khau: ' ', gioi_tinh: '' });
    expect(r.data?.nam_sinh).toBeUndefined();
    expect(r.data?.so_nhan_khau).toBeUndefined();
    expect(r.data?.gioi_tinh).toBeUndefined();
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, nam_sinh: '1965' }).data?.nam_sinh).toBe(1965);
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, nam_sinh: '1850' }).success).toBe(false);
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, so_nhan_khau: '-1' }).success).toBe(false);
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, so_nhan_khau: '2.5' }).success).toBe(false);
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, tinh_trang_dat: 'Đất thuê' }).success).toBe(false);
  });
});

describe('hoNgheoToFormInput', () => {
  it('hộ mới có sẵn mặc định khớp DEFAULT dưới DB', () => {
    const v = hoNgheoToFormInput(null);
    expect(v.ton_giao).toBe('Không');
    expect(v.trang_thai).toBe('Đang khó khăn');
  });
});
