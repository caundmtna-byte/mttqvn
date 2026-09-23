/**
 * Bảng map giá trị cũ dưới đây PHẢI khớp từng dòng với khối `CASE` trong
 * `supabase/migrations/20260921100000_kho_don_vi_cuu_tro_mo_rong.sql`.
 * Sửa một bên mà quên bên kia = dữ liệu cũ hiển thị sai loại.
 */
import { describe, expect, it } from 'vitest';
import {
  KHO_DON_VI_CUU_TRO_LOAI,
  KHO_DON_VI_CUU_TRO_LOAI_DEFAULT,
  buildKhoDonViCuuTroLoaiBadgeConfig,
  khoDonViCuuTroLoaiLabel,
  parseKhoDonViCuuTroLoai,
} from './loai';

describe('parseKhoDonViCuuTroLoai', () => {
  it('map đúng bộ giá trị cũ sang loại tương đương', () => {
    expect(parseKhoDonViCuuTroLoai('chua')).toBe('co_so_ton_giao');
    expect(parseKhoDonViCuuTroLoai('giao_xu')).toBe('co_so_ton_giao');
    expect(parseKhoDonViCuuTroLoai('co_quan')).toBe('cq_cap_tinh');
    expect(parseKhoDonViCuuTroLoai('don_vi')).toBe('don_vi_su_nghiep');
    expect(parseKhoDonViCuuTroLoai('to_chuc')).toBe('don_vi_su_nghiep');
  });

  it('giữ nguyên tám giá trị mới', () => {
    for (const v of KHO_DON_VI_CUU_TRO_LOAI) {
      expect(parseKhoDonViCuuTroLoai(v)).toBe(v);
    }
  });

  it('giá trị lạ hoặc rỗng về mặc định', () => {
    expect(parseKhoDonViCuuTroLoai('')).toBe(KHO_DON_VI_CUU_TRO_LOAI_DEFAULT);
    expect(parseKhoDonViCuuTroLoai(undefined)).toBe(KHO_DON_VI_CUU_TRO_LOAI_DEFAULT);
    expect(parseKhoDonViCuuTroLoai('hop_tac_xa')).toBe(KHO_DON_VI_CUU_TRO_LOAI_DEFAULT);
  });
});

describe('nhãn và badge', () => {
  it('mặc định nằm trong danh sách', () => {
    expect(KHO_DON_VI_CUU_TRO_LOAI).toContain(KHO_DON_VI_CUU_TRO_LOAI_DEFAULT);
  });

  // Thiếu nhãn thì giao diện hiện mã máy kiểu `nhom_thien_nguyen`.
  it('mọi loại đều có nhãn tiếng Việt khác rỗng và khác chính mã', () => {
    for (const v of KHO_DON_VI_CUU_TRO_LOAI) {
      const label = khoDonViCuuTroLoaiLabel(v);
      expect(label.trim()).not.toBe('');
      expect(label).not.toBe(v);
    }
  });

  it('mọi loại đều có cấu hình badge', () => {
    const config = buildKhoDonViCuuTroLoaiBadgeConfig();
    for (const v of KHO_DON_VI_CUU_TRO_LOAI) {
      expect(config[v]).toBeDefined();
      expect(config[v].label.trim()).not.toBe('');
    }
  });
});
