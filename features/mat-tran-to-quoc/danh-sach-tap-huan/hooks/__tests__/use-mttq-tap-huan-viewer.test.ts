import { describe, expect, it } from 'vitest';
import { canViewLopTapHuanRow, type MttqLopTapHuanViewer } from '../use-mttq-tap-huan-viewer';

function row(cap: 'Cấp tỉnh' | 'Cấp xã', don_vi_id: string | null = null) {
  return { cap_tap_huan: cap, don_vi_id };
}

describe('canViewLopTapHuanRow', () => {
  it('bypass when canViewAll', () => {
    const viewer: MttqLopTapHuanViewer = {
      canViewAll: true,
      chucVuCapQuanLy: null,
      viewerDonViId: null,
    };
    expect(canViewLopTapHuanRow(viewer, row('Cấp tỉnh'))).toBe(true);
    expect(canViewLopTapHuanRow(viewer, row('Cấp xã', '9'))).toBe(true);
  });

  it('Cấp tỉnh only for viewer Tỉnh', () => {
    const tinh: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
    };
    const xa: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: '5',
    };
    const none: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerDonViId: '5',
    };
    expect(canViewLopTapHuanRow(tinh, row('Cấp tỉnh'))).toBe(true);
    expect(canViewLopTapHuanRow(xa, row('Cấp tỉnh'))).toBe(false);
    expect(canViewLopTapHuanRow(none, row('Cấp tỉnh'))).toBe(false);
  });

  it('Cấp xã: Tỉnh sees all', () => {
    const viewer: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
    };
    expect(canViewLopTapHuanRow(viewer, row('Cấp xã', '99'))).toBe(true);
  });

  it('Cấp xã: Xã phường same don_vi_id only', () => {
    const viewer: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: '5',
    };
    expect(canViewLopTapHuanRow(viewer, row('Cấp xã', '5'))).toBe(true);
    expect(canViewLopTapHuanRow(viewer, row('Cấp xã', '6'))).toBe(false);
  });

  it('Cấp xã: Xã phường without viewer don_vi sees nothing', () => {
    const viewer: MttqLopTapHuanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: null,
    };
    expect(canViewLopTapHuanRow(viewer, row('Cấp xã', '5'))).toBe(false);
  });
});
