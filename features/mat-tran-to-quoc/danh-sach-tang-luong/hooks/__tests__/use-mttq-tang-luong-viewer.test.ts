import { describe, expect, it } from 'vitest';
import {
  canViewTangLuongRow,
  isTangLuongScopedToTinh,
  isTangLuongScopedToXaPhuong,
  isTangLuongViewUnrestricted,
  type MttqTangLuongViewer,
} from '../use-mttq-tang-luong-viewer';

function row(don_vi_id: string | null = null, can_bo_cap_quan_ly: string[] = []) {
  return { don_vi_id, can_bo_cap_quan_ly };
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

  it('Tỉnh sees only rows with can_bo cấp Tỉnh', () => {
    const tinh: MttqTangLuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
    };
    expect(isTangLuongViewUnrestricted(tinh)).toBe(false);
    expect(isTangLuongScopedToTinh(tinh)).toBe(true);
    expect(isTangLuongScopedToXaPhuong(tinh)).toBe(false);
    expect(canViewTangLuongRow(tinh, row(null, ['Tỉnh']))).toBe(true);
    expect(canViewTangLuongRow(tinh, row('5', ['Tỉnh']))).toBe(true);
  });

  it('Tỉnh does not see rows with can_bo cấp Xã phường', () => {
    const tinh: MttqTangLuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
    };
    expect(canViewTangLuongRow(tinh, row('5', ['Xã phường']))).toBe(false);
    expect(canViewTangLuongRow(tinh, row('5', []))).toBe(false);
    expect(canViewTangLuongRow(tinh, row(null, []))).toBe(false);
  });

  it('cap_bac=1 / quan_tri bypasses Tỉnh restriction via canViewAll', () => {
    const admin: MttqTangLuongViewer = {
      canViewAll: true,
      chucVuCapQuanLy: 'Tỉnh',
      viewerDonViId: null,
    };
    expect(isTangLuongViewUnrestricted(admin)).toBe(true);
    expect(isTangLuongScopedToTinh(admin)).toBe(false);
    expect(canViewTangLuongRow(admin, row('5', ['Xã phường']))).toBe(true);
    expect(canViewTangLuongRow(admin, row(null, []))).toBe(true);
  });

  it('cap_quan_ly null with only xem sees all rows', () => {
    const none: MttqTangLuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerDonViId: '5',
    };
    expect(canViewTangLuongRow(none, row('99', ['Xã phường']))).toBe(true);
    expect(canViewTangLuongRow(none, row(null, ['Tỉnh']))).toBe(true);
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
