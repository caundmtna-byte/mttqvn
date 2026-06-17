import { describe, expect, it } from 'vitest';
import {
  canViewPbxhThucHienRow,
  isPbxhScopedToXaPhuong,
  isPbxhViewUnrestricted,
  type PbxhThucHienViewer,
} from '../use-pbxh-thuc-hien-viewer';

function row(don_vi_thuc_hien_id: string | null = null) {
  return { don_vi_thuc_hien_id };
}

describe('canViewPbxhThucHienRow', () => {
  it('bypass when canViewAll', () => {
    const viewer: PbxhThucHienViewer = {
      canViewAll: true,
      chucVuCapQuanLy: null,
      viewerDonViId: null,
    };
    expect(canViewPbxhThucHienRow(viewer, row('9'))).toBe(true);
    expect(canViewPbxhThucHienRow(viewer, row(null))).toBe(true);
  });

  it('Tỉnh sees all rows including MTTQ Tỉnh', () => {
    const tinh: PbxhThucHienViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
    };
    expect(isPbxhViewUnrestricted(tinh)).toBe(true);
    expect(isPbxhScopedToXaPhuong(tinh)).toBe(false);
    expect(canViewPbxhThucHienRow(tinh, row('99'))).toBe(true);
    expect(canViewPbxhThucHienRow(tinh, row(null))).toBe(true);
  });

  it('cap_quan_ly null with only xem sees all rows', () => {
    const none: PbxhThucHienViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerDonViId: '5',
    };
    expect(canViewPbxhThucHienRow(none, row('99'))).toBe(true);
    expect(canViewPbxhThucHienRow(none, row(null))).toBe(true);
  });

  it('Xã phường: same don_vi_thuc_hien_id only, hides MTTQ Tỉnh', () => {
    const viewer: PbxhThucHienViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: '5',
    };
    expect(isPbxhScopedToXaPhuong(viewer)).toBe(true);
    expect(canViewPbxhThucHienRow(viewer, row('5'))).toBe(true);
    expect(canViewPbxhThucHienRow(viewer, row('6'))).toBe(false);
    expect(canViewPbxhThucHienRow(viewer, row(null))).toBe(false);
    expect(canViewPbxhThucHienRow(viewer, row(''))).toBe(false);
  });

  it('Xã phường without viewer don_vi sees nothing', () => {
    const viewer: PbxhThucHienViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: null,
    };
    expect(canViewPbxhThucHienRow(viewer, row('5'))).toBe(false);
    expect(canViewPbxhThucHienRow(viewer, row(null))).toBe(false);
  });
});
