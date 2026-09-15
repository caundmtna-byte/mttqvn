import { describe, it, expect } from 'vitest';
import { coQuyenDatLaiMatKhau, kiemTraMatKhauQuanTri } from './mat-khau-quan-tri';

describe('kiemTraMatKhauQuanTri', () => {
  it('mật khẩu hợp lệ', () => {
    expect(kiemTraMatKhauQuanTri({ matKhau: 'MatKhau@2026', xacNhan: 'MatKhau@2026' })).toBeNull();
  });

  it('bỏ trống', () => {
    expect(kiemTraMatKhauQuanTri({ matKhau: '', xacNhan: '' })).toBe('trong');
  });

  it('dưới 6 ký tự — khớp ngưỡng Edge Function từ chối; 123456 (mặc định) phải hợp lệ', () => {
    expect(kiemTraMatKhauQuanTri({ matKhau: '12345', xacNhan: '12345' })).toBe('quaNgan');
    expect(kiemTraMatKhauQuanTri({ matKhau: '123456', xacNhan: '123456' })).toBeNull();
  });

  it('có khoảng trắng đầu/cuối — không cắt ngầm', () => {
    expect(kiemTraMatKhauQuanTri({ matKhau: ' MatKhau@2026', xacNhan: ' MatKhau@2026' })).toBe('coKhoangTrang');
    expect(kiemTraMatKhauQuanTri({ matKhau: 'MatKhau@2026 ', xacNhan: 'MatKhau@2026 ' })).toBe('coKhoangTrang');
  });

  it('xác nhận không khớp', () => {
    expect(kiemTraMatKhauQuanTri({ matKhau: 'MatKhau@2026', xacNhan: 'MatKhau@2025' })).toBe('khongKhop');
  });
});

describe('coQuyenDatLaiMatKhau', () => {
  it('cap_bac = 1 ⇒ được, kể cả không có grant', () => {
    expect(coQuyenDatLaiMatKhau(1, [])).toBe(true);
    expect(coQuyenDatLaiMatKhau('1' as unknown as number, undefined)).toBe(true);
  });

  it('token quan_tri (admin/all) trên module nhân viên ⇒ được', () => {
    expect(coQuyenDatLaiMatKhau(3, ['admin'])).toBe(true);
    expect(coQuyenDatLaiMatKhau(3, ['all'])).toBe(true);
  });

  it('chỉ có sửa/xóa ⇒ KHÔNG được — sửa hồ sơ không đồng nghĩa chiếm tài khoản', () => {
    expect(coQuyenDatLaiMatKhau(2, ['view', 'create', 'update', 'delete'])).toBe(false);
  });

  it('chưa hydrate ma trận (null / rỗng) ⇒ deny-by-default', () => {
    expect(coQuyenDatLaiMatKhau(null, undefined)).toBe(false);
    expect(coQuyenDatLaiMatKhau(undefined, [])).toBe(false);
  });
});
