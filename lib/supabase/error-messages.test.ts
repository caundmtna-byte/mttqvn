import { describe, it, expect } from 'vitest';
import {
  mapSupabaseErrorToVietnamese,
  extractConstraintName,
  __ERROR_MESSAGE_TABLES,
} from './error-messages';

const { BY_CONSTRAINT, BY_CODE, FALLBACK } = __ERROR_MESSAGE_TABLES;

/** Không được để lọt chữ tiếng Anh kỹ thuật ra người dùng cuối. */
function coTiengAnhKyThuat(s: string): boolean {
  return /duplicate key|constraint|violates|foreign key|null value|invalid input|syntax/i.test(s);
}

describe('extractConstraintName', () => {
  it('lấy được tên ràng buộc từ message của PostgREST', () => {
    expect(
      extractConstraintName(
        'duplicate key value violates unique constraint "uq_var_phong_ban_ten_lower"',
      ),
    ).toBe('uq_var_phong_ban_ten_lower');
  });

  it('không có ràng buộc → undefined', () => {
    expect(extractConstraintName('Failed to fetch')).toBeUndefined();
  });
});

describe('map theo tên ràng buộc — câu cụ thể nhất', () => {
  it('trùng uỷ viên trong nhiệm kỳ', () => {
    expect(
      mapSupabaseErrorToVietnamese({
        code: '23505',
        message:
          'duplicate key value violates unique constraint "uq_mttq_uy_vien_uy_ban_nhiem_ky_can_bo"',
      }),
    ).toBe('Cán bộ này đã là uỷ viên của nhiệm kỳ đã chọn.');
  });

  it('trùng số phiếu kho', () => {
    expect(
      mapSupabaseErrorToVietnamese({ code: '23505', constraint: 'uq_kho_nhap_xuat_kho_so_phieu' }),
    ).toContain('Số phiếu');
  });

  it('CHECK ngày kết thúc trước ngày bắt đầu', () => {
    expect(
      mapSupabaseErrorToVietnamese({ code: '23514', constraint: 'chk_chuong_trinh_nam_dates' }),
    ).toBe('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
  });

  it('bẫy đặt tên: UNIQUE mang tiền tố idx_ vẫn khớp', () => {
    expect(
      mapSupabaseErrorToVietnamese({ constraint: 'idx_dttg_dip_tham_hoi_ten_lower' }),
    ).toBe('Dịp thăm hỏi này đã tồn tại.');
  });

  it('bẫy đặt tên: UNIQUE mang hậu tố _uq vẫn khớp', () => {
    expect(
      mapSupabaseErrorToVietnamese({ constraint: 'luong_thiet_lap_bac_luong_ngach_ma_uq' }),
    ).toBe('Bậc lương này đã có trong ngạch đã chọn.');
  });
});

describe('luật chung cho khoá ngoại — không phải viết tay 63 dòng', () => {
  it('FK tới người tạo → gợi ý khoá tài khoản thay vì xoá', () => {
    const msg = mapSupabaseErrorToVietnamese({
      code: '23503',
      constraint: 'mttq_khen_thuong_id_nguoi_tao_fkey',
    });
    expect(msg).toContain('đã tạo dữ liệu');
    expect(msg).toContain('Khoá');
  });

  it('FK danh mục khác → đang được dùng ở nơi khác', () => {
    expect(
      mapSupabaseErrorToVietnamese({ code: '23503', constraint: 'mttq_can_bo_chuc_vu_id_fkey' }),
    ).toContain('đang được sử dụng ở nơi khác');
  });
});

describe('map theo mã lỗi khi không nhận ra ràng buộc', () => {
  it.each([
    ['23505', 'đã tồn tại'],
    ['23503', 'đang được sử dụng'],
    ['23514', 'không hợp lệ'],
    ['23502', 'bắt buộc'],
    ['22P02', 'định dạng'],
    ['42501', 'không có quyền'],
    ['PGRST116', 'Không tìm thấy'],
    ['PGRST301', 'hết hạn'],
  ])('mã %s → câu tiếng Việt chứa "%s"', (code, phrase) => {
    expect(mapSupabaseErrorToVietnamese({ code })).toContain(phrase);
  });
});

describe('map theo dấu hiệu trong chuỗi khi không có mã', () => {
  it.each([
    ['Failed to fetch', 'kết nối'],
    ['request timed out', 'quá lâu'],
    ['JWT expired', 'hết hạn'],
    ['new row violates row-level security policy', 'không có quyền'],
    ['Internal Server Error 500', 'máy chủ'],
  ])('«%s» → chứa "%s"', (raw, phrase) => {
    expect(mapSupabaseErrorToVietnamese({ message: raw })).toContain(phrase);
  });
});

describe('bất biến: không bao giờ lọt tiếng Anh kỹ thuật', () => {
  it('mọi câu trong bảng đều là tiếng Việt sạch', () => {
    for (const [name, msg] of Object.entries(BY_CONSTRAINT)) {
      expect(coTiengAnhKyThuat(msg), `${name}: ${msg}`).toBe(false);
    }
    for (const [code, msg] of Object.entries(BY_CODE)) {
      expect(coTiengAnhKyThuat(msg), `${code}: ${msg}`).toBe(false);
    }
  });

  it('đầu vào lạ → câu mặc định tiếng Việt, không trả chuỗi gốc', () => {
    const raw = 'ERROR: relation "xyz" does not exist';
    const out = mapSupabaseErrorToVietnamese({ message: raw });
    expect(out).toBe(FALLBACK);
    expect(out).not.toContain('relation');
  });

  it('rỗng hoàn toàn → vẫn có câu', () => {
    expect(mapSupabaseErrorToVietnamese({})).toBe(FALLBACK);
  });
});
