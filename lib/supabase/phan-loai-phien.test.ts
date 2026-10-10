import { describe, expect, it } from 'vitest';
import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js';
import { phanLoaiHoSo, phanLoaiLoiSession } from './phan-loai-phien';

describe('phanLoaiHoSo', () => {
  it('lỗi tra cứu (mất mạng, timeout) ⇒ chưa xác định, không đăng xuất', () => {
    expect(phanLoaiHoSo({ loai: 'loi' })).toBe('chua_xac_dinh');
  });

  it('không còn hồ sơ nhân viên ⇒ mất phiên', () => {
    expect(phanLoaiHoSo({ loai: 'khong_co' })).toBe('mat_phien');
  });

  it('tài khoản bị khoá ⇒ mất phiên', () => {
    expect(phanLoaiHoSo({ loai: 'tim_thay', hoSo: { trang_thai: 'Khóa' } })).toBe('mat_phien');
  });

  it('hồ sơ đang hoạt động ⇒ hợp lệ', () => {
    expect(phanLoaiHoSo({ loai: 'tim_thay', hoSo: { trang_thai: 'Hoạt động' } })).toBe('hop_le');
  });
});

describe('phanLoaiLoiSession', () => {
  it('lỗi mạng khi làm mới token ⇒ chưa xác định', () => {
    expect(phanLoaiLoiSession(new AuthRetryableFetchError('Failed to fetch', 0))).toBe('chua_xac_dinh');
  });

  it('refresh token bị thu hồi ⇒ mất phiên', () => {
    expect(phanLoaiLoiSession(new AuthApiError('Invalid Refresh Token', 400, 'refresh_token_not_found'))).toBe(
      'mat_phien',
    );
  });
});
