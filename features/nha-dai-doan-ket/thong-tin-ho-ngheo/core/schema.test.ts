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

  it('đối tượng để trống được, giá trị lạ thì không', () => {
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, doi_tuong: 'Hộ nghèo' }).success).toBe(true);
    expect(hoNgheoSchema.safeParse({ ...hoHopLe, doi_tuong: 'Hộ khá' }).success).toBe(false);
  });
});

describe('hoNgheoToFormInput', () => {
  it('hộ mới có sẵn mặc định khớp DEFAULT dưới DB', () => {
    const v = hoNgheoToFormInput(null);
    expect(v.ton_giao).toBe('Không');
    expect(v.trang_thai).toBe('Đang khó khăn');
  });
});
