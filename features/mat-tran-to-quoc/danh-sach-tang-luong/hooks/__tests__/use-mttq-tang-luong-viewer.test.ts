import { describe, expect, it } from 'vitest';
import {
  canViewTangLuongRow,
  isTangLuongScopedToXaPhuong,
  isTangLuongViewUnrestricted,
  type MttqTangLuongViewer,
} from '../use-mttq-tang-luong-viewer';

function row(don_vi_id: string | null = null) {
  return { don_vi_id };
}

describe('canViewTangLuongRow', () => {
  it('bypass when canViewAll', () => {
    const viewer: MttqTangLuongViewer = {
      canViewAll: true,
      chucVuCapQuanLy: null,
      viewerDonViId: null,
    };
    expect(canViewTangLuongRow(viewer, row('9'))).toBe(true);
    expect(canViewTangLuongRow(viewer, row(null))).toBe(true);
  });

  it('Tỉnh sees all rows', () => {
    const tinh: MttqTangLuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
    };
    expect(isTangLuongViewUnrestricted(tinh)).toBe(true);
    expect(isTangLuongScopedToXaPhuong(tinh)).toBe(false);
    expect(canViewTangLuongRow(tinh, row('99'))).toBe(true);
    expect(canViewTangLuongRow(tinh, row(null))).toBe(true);
  });

  it('cap_quan_ly null with only xem sees all rows', () => {
    const none: MttqTangLuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerDonViId: '5',
    };
    expect(canViewTangLuongRow(none, row('99'))).toBe(true);
  });

  it('Xã phường: same don_vi_id only', () => {
    const viewer: MttqTangLuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: '5',
    };
    expect(isTangLuongScopedToXaPhuong(viewer)).toBe(true);
    expect(canViewTangLuongRow(viewer, row('5'))).toBe(true);
    expect(canViewTangLuongRow(viewer, row('6'))).toBe(false);
  });

  it('Xã phường without viewer don_vi sees nothing', () => {
    const viewer: MttqTangLuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: null,
    };
    expect(canViewTangLuongRow(viewer, row('5'))).toBe(false);
  });
});
