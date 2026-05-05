import { describe, it, expect } from 'vitest';
import { employeeSchema } from '../schema';

/* ================================================================
 *  Helper: tạo dữ liệu hợp lệ base rồi override từng trường
 * ================================================================ */
const validData = () => ({
  ma_nhan_vien: 'NV001',
  ho_ten: 'Nguyễn Văn A',
  email: 'test@company.vn',
  so_dien_thoai: '0901234567',
  chuc_vu_id: 'pos-1',
  phong_ban_id: 'dep-1',
  gioi_tinh: 'Nam' as const,
  trang_thai: 'Đang làm việc',
  ngay_vao_lam: '2024-01-15',
});

const parse = (overrides: Record<string, unknown> = {}) =>
  employeeSchema.safeParse({ ...validData(), ...overrides });

/* ================================================================ */
describe('employeeSchema', () => {

  it('chấp nhận dữ liệu hợp lệ đầy đủ', () => {
    const result = parse();
    expect(result.success).toBe(true);
  });

  /* ────── Số điện thoại ────── */
  describe('so_dien_thoai', () => {
    it('chấp nhận SĐT 10-11 số bắt đầu bằng 0', () => {
      expect(parse({ so_dien_thoai: '0901234567' }).success).toBe(true);
      expect(parse({ so_dien_thoai: '02812345678' }).success).toBe(true);
    });

    it('từ chối SĐT không bắt đầu bằng 0', () => {
      const r = parse({ so_dien_thoai: '9012345678' });
      expect(r.success).toBe(false);
    });

    it('từ chối SĐT quá ngắn', () => {
      const r = parse({ so_dien_thoai: '090123' });
      expect(r.success).toBe(false);
    });

    it('từ chối SĐT chứa ký tự', () => {
      const r = parse({ so_dien_thoai: '090abc1234' });
      expect(r.success).toBe(false);
    });

    it('từ chối rỗng', () => {
      const r = parse({ so_dien_thoai: '' });
      expect(r.success).toBe(false);
    });
  });

  /* ────── CCCD ────── */
  describe('cmnd_cccd', () => {
    it('chấp nhận 12 chữ số', () => {
      expect(parse({ cmnd_cccd: '079095012345' }).success).toBe(true);
    });

    it('chấp nhận trường rỗng (optional)', () => {
      expect(parse({ cmnd_cccd: '' }).success).toBe(true);
      expect(parse({ cmnd_cccd: null }).success).toBe(true);
    });

    it('từ chối 9 chữ số (CMND cũ)', () => {
      const r = parse({ cmnd_cccd: '012345678' });
      expect(r.success).toBe(false);
    });

    it('từ chối chứa ký tự', () => {
      const r = parse({ cmnd_cccd: '07909501234A' });
      expect(r.success).toBe(false);
    });
  });

  /* ────── Mã số thuế ────── */
  describe('ma_so_thue_ca_nhan', () => {
    it('chấp nhận 10 chữ số', () => {
      expect(parse({ ma_so_thue_ca_nhan: '8012345678' }).success).toBe(true);
    });

    it('chấp nhận 13 chữ số', () => {
      expect(parse({ ma_so_thue_ca_nhan: '8012345678901' }).success).toBe(true);
    });

    it('chấp nhận rỗng (optional)', () => {
      expect(parse({ ma_so_thue_ca_nhan: '' }).success).toBe(true);
    });

    it('từ chối 11 chữ số (không hợp lệ)', () => {
      const r = parse({ ma_so_thue_ca_nhan: '80123456789' });
      expect(r.success).toBe(false);
    });
  });

  /* ────── Tuổi lao động ────── */
  describe('ngay_sinh (tuổi ≥ 16)', () => {
    it('chấp nhận người đủ 16 tuổi', () => {
      const y = new Date().getFullYear() - 16;
      expect(parse({ ngay_sinh: `${y}-01-01` }).success).toBe(true);
    });

    it('từ chối người dưới 16 tuổi', () => {
      const y = new Date().getFullYear() - 10;
      const r = parse({ ngay_sinh: `${y}-06-15` });
      expect(r.success).toBe(false);
    });

    it('chấp nhận rỗng (optional)', () => {
      expect(parse({ ngay_sinh: '' }).success).toBe(true);
      expect(parse({ ngay_sinh: null }).success).toBe(true);
    });
  });

  /* ────── Giới tính (tiếng Việt) ────── */
  describe('gioi_tinh', () => {
    it('chấp nhận "Nam", "Nữ", "Khác"', () => {
      expect(parse({ gioi_tinh: 'Nam' }).success).toBe(true);
      expect(parse({ gioi_tinh: 'Nữ' }).success).toBe(true);
      expect(parse({ gioi_tinh: 'Khác' }).success).toBe(true);
    });

    it('từ chối giá trị tiếng Anh cũ', () => {
      expect(parse({ gioi_tinh: 'Male' }).success).toBe(false);
      expect(parse({ gioi_tinh: 'Female' }).success).toBe(false);
    });
  });

  /* ────── Hợp đồng có thời hạn → bắt buộc ngày hết hạn ────── */
  describe('loai_hop_dong + ngay_het_han_hd', () => {
    it('"Có thời hạn" mà không có ngày hết hạn → lỗi', () => {
      const r = parse({ loai_hop_dong: 'Có thời hạn', ngay_het_han_hd: '' });
      expect(r.success).toBe(false);
    });

    it('"Có thời hạn" có ngày hết hạn → OK', () => {
      const r = parse({ loai_hop_dong: 'Có thời hạn', ngay_het_han_hd: '2025-12-31' });
      expect(r.success).toBe(true);
    });

    it('"Không thời hạn" không cần ngày → OK', () => {
      const r = parse({ loai_hop_dong: 'Không thời hạn', ngay_het_han_hd: '' });
      expect(r.success).toBe(true);
    });
  });

  /* ────── SĐT khẩn cấp ────── */
  describe('sdt_khan_cap', () => {
    it('chấp nhận SĐT hợp lệ', () => {
      expect(parse({ sdt_khan_cap: '0901112233' }).success).toBe(true);
    });

    it('chấp nhận rỗng (optional)', () => {
      expect(parse({ sdt_khan_cap: '' }).success).toBe(true);
    });

    it('từ chối SĐT không hợp lệ', () => {
      const r = parse({ sdt_khan_cap: '12345' });
      expect(r.success).toBe(false);
    });
  });

  /* ────── Email ────── */
  describe('email', () => {
    it('chấp nhận email hợp lệ', () => {
      expect(parse({ email: 'user@domain.com' }).success).toBe(true);
    });

    it('từ chối email không hợp lệ', () => {
      expect(parse({ email: 'not-email' }).success).toBe(false);
    });
  });

  /* ────── Các trường bắt buộc ────── */
  describe('trường bắt buộc', () => {
    it('ho_ten ít nhất 2 ký tự', () => {
      expect(parse({ ho_ten: 'A' }).success).toBe(false);
      expect(parse({ ho_ten: 'AB' }).success).toBe(true);
    });

    it('chuc_vu_id bắt buộc', () => {
      expect(parse({ chuc_vu_id: '' }).success).toBe(false);
    });

    it('phong_ban_id bắt buộc', () => {
      expect(parse({ phong_ban_id: '' }).success).toBe(false);
    });

    it('ngay_vao_lam hợp lệ', () => {
      expect(parse({ ngay_vao_lam: 'invalid-date' }).success).toBe(false);
      expect(parse({ ngay_vao_lam: '2024-06-15' }).success).toBe(true);
    });
  });
});
