import { describe, it, expect } from 'vitest';
import { buildPbxhThucHienDefaults } from './pbxh-thuc-hien-defaults-for-viewer';
import { thucHienPhanBienToFormInput } from '../core/schema';

const phongBanIds = ['pb-xa', 'pb-tinh'];

function base() {
  return thucHienPhanBienToFormInput(null);
}

describe('buildPbxhThucHienDefaults', () => {
  it('không bị giới hạn xã → giữ nguyên nền (vẫn Cấp tỉnh)', () => {
    const d = buildPbxhThucHienDefaults({
      base: base(),
      scopedToXa: false,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-xa',
      phongBanIds,
    });
    expect(d.cap_thuc_hien).toBe('Cấp tỉnh');
    expect(d.don_vi_thuc_hien_id).toBe('');
    expect(d.phong_ban_tham_muu_id).toBe('');
  });

  it('giới hạn xã → Cấp xã + đơn vị + phòng ban tham mưu', () => {
    const d = buildPbxhThucHienDefaults({
      base: base(),
      scopedToXa: true,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-xa',
      phongBanIds,
    });
    expect(d.cap_thuc_hien).toBe('Cấp xã');
    expect(d.don_vi_thuc_hien_id).toBe('xa-01');
    expect(d.phong_ban_tham_muu_id).toBe('pb-xa');
  });

  it('phòng ban của viewer không có trong combobox → bỏ trống', () => {
    const d = buildPbxhThucHienDefaults({
      base: base(),
      scopedToXa: true,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-da-ngung',
      phongBanIds,
    });
    expect(d.phong_ban_tham_muu_id).toBe('');
    expect(d.don_vi_thuc_hien_id).toBe('xa-01');
  });

  it('thiếu đơn vị / phòng ban của viewer → vẫn đặt Cấp xã', () => {
    const d = buildPbxhThucHienDefaults({
      base: base(),
      scopedToXa: true,
      viewerDonViId: null,
      viewerPhongBanId: null,
      phongBanIds,
    });
    expect(d.cap_thuc_hien).toBe('Cấp xã');
    expect(d.don_vi_thuc_hien_id).toBe('');
    expect(d.phong_ban_tham_muu_id).toBe('');
  });

  it('không sửa đổi object nền truyền vào', () => {
    const original = base();
    buildPbxhThucHienDefaults({
      base: original,
      scopedToXa: true,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-xa',
      phongBanIds,
    });
    expect(original.cap_thuc_hien).toBe('Cấp tỉnh');
    expect(original.don_vi_thuc_hien_id).toBe('');
  });
});
