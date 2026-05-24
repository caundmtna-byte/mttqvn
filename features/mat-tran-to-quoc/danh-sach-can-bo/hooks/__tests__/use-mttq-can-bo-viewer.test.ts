import { describe, expect, it } from 'vitest';
import {
  canViewCanBoRow,
  isCanBoScopedToXaPhuong,
  isCanBoViewUnrestricted,
  type MttqCanBoViewer,
} from '../use-mttq-can-bo-viewer';

function canBo(don_vi_id: string | null = null) {
  return { don_vi_id };
}

describe('canViewCanBoRow', () => {
  it('bypass when canViewAll', () => {
    const viewer: MttqCanBoViewer = {
      canViewAll: true,
      chucVuCapQuanLy: null,
      viewerDonViId: null,
    };
    expect(canViewCanBoRow(viewer, canBo('9'))).toBe(true);
    expect(canViewCanBoRow(viewer, canBo(null))).toBe(true);
  });

  it('Tỉnh sees all rows', () => {
    const tinh: MttqCanBoViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
    };
    expect(isCanBoViewUnrestricted(tinh)).toBe(true);
    expect(isCanBoScopedToXaPhuong(tinh)).toBe(false);
    expect(canViewCanBoRow(tinh, canBo('99'))).toBe(true);
    expect(canViewCanBoRow(tinh, canBo(null))).toBe(true);
  });

  it('cap_quan_ly null with only xem sees all rows', () => {
    const none: MttqCanBoViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerDonViId: '5',
    };
    expect(canViewCanBoRow(none, canBo('99'))).toBe(true);
  });

  it('Xã phường: same don_vi_id only', () => {
    const viewer: MttqCanBoViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: '5',
    };
    expect(isCanBoScopedToXaPhuong(viewer)).toBe(true);
    expect(canViewCanBoRow(viewer, canBo('5'))).toBe(true);
    expect(canViewCanBoRow(viewer, canBo('6'))).toBe(false);
  });

  it('Xã phường without viewer don_vi sees nothing', () => {
    const viewer: MttqCanBoViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerDonViId: null,
    };
    expect(canViewCanBoRow(viewer, canBo('5'))).toBe(false);
  });
});
