import { describe, expect, it } from 'vitest';
import {
  canViewTapHuanUngVienRow,
  isTapHuanUngVienScopedToXaPhuong,
  isTapHuanUngVienViewUnrestricted,
  type MttqLopTapHuanViewer,
} from '../use-mttq-tap-huan-viewer';

function ungVien(can_bo_don_vi_id: string | null = null) {
  return { can_bo_don_vi_id };
}

describe('canViewTapHuanUngVienRow', () => {
  it('bypass when canViewAll', () => {
    const viewer: MttqLopTapHuanViewer = {
      canViewAll: true,
      chucVuCapQuanLy: null,
      viewerDonViId: null,
    };
    expect(canViewTapHuanUngVienRow(viewer, ungVien('9'))).toBe(true);
    expect(canViewTapHuanUngVienRow(viewer, ungVien(null))).toBe(true);
  });

  it('Tỉnh sees all ứng viên (tab CT / thống kê)', () => {
    const tinh: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
    };
    expect(isTapHuanUngVienViewUnrestricted(tinh)).toBe(true);
    expect(isTapHuanUngVienScopedToXaPhuong(tinh)).toBe(false);
    expect(canViewTapHuanUngVienRow(tinh, ungVien('99'))).toBe(true);
    expect(canViewTapHuanUngVienRow(tinh, ungVien(null))).toBe(true);
  });

  it('cap_quan_ly null with only xem sees all ứng viên', () => {
    const none: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerDonViId: '5',
    };
    expect(canViewTapHuanUngVienRow(none, ungVien('99'))).toBe(true);
  });

  it('Xã phường: same can_bo don_vi_id only', () => {
    const viewer: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: '5',
    };
    expect(isTapHuanUngVienScopedToXaPhuong(viewer)).toBe(true);
    expect(canViewTapHuanUngVienRow(viewer, ungVien('5'))).toBe(true);
    expect(canViewTapHuanUngVienRow(viewer, ungVien('6'))).toBe(false);
  });

  it('Xã phường without viewer don_vi sees nothing', () => {
    const viewer: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: null,
    };
    expect(canViewTapHuanUngVienRow(viewer, ungVien('5'))).toBe(false);
  });
});
