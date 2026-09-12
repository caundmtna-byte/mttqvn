import { describe, expect, it } from 'vitest';
import {
  canViewNddkRow,
  isNddkScopedToXaPhuong,
  isNddkViewUnrestricted,
  type NddkViewer,
} from './use-nddk-viewer';

function viewerOf(partial: Partial<NddkViewer>): NddkViewer {
  return {
    canViewAll: false,
    chucVuCapQuanLy: null,
    viewerDonViId: null,
    ...partial,
  };
}

function nha(xa_phuong_id: string | null = null) {
  return { xa_phuong_id };
}

describe('canViewNddkRow', () => {
  it('bypass khi canViewAll (cap_bac=1 / quan_tri / admin / chưa hydrate)', () => {
    const viewer = viewerOf({ canViewAll: true });
    expect(isNddkViewUnrestricted(viewer)).toBe(true);
    expect(isNddkScopedToXaPhuong(viewer)).toBe(false);
    expect(canViewNddkRow(viewer, nha('9'))).toBe(true);
    expect(canViewNddkRow(viewer, nha(null))).toBe(true);
  });

  it('chức vụ Tỉnh xem toàn bộ, kể cả hồ sơ chưa gán xã', () => {
    const viewer = viewerOf({ chucVuCapQuanLy: 'Tỉnh', viewerDonViId: '5' });
    expect(isNddkViewUnrestricted(viewer)).toBe(true);
    expect(canViewNddkRow(viewer, nha('9'))).toBe(true);
    expect(canViewNddkRow(viewer, nha(null))).toBe(true);
  });

  it('cap_quan_ly null không bị bó phạm vi', () => {
    const viewer = viewerOf({ chucVuCapQuanLy: null, viewerDonViId: '5' });
    expect(isNddkScopedToXaPhuong(viewer)).toBe(false);
    expect(canViewNddkRow(viewer, nha('9'))).toBe(true);
  });

  it('Xã phường chỉ thấy hồ sơ thuộc xã mình', () => {
    const viewer = viewerOf({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: '5' });
    expect(isNddkScopedToXaPhuong(viewer)).toBe(true);
    expect(canViewNddkRow(viewer, nha('5'))).toBe(true);
    expect(canViewNddkRow(viewer, nha(' 5 '))).toBe(true);
    expect(canViewNddkRow(viewer, nha('6'))).toBe(false);
    expect(canViewNddkRow(viewer, nha(null))).toBe(false);
  });

  it('Xã phường chưa được gán đơn vị thì thấy RỖNG, không phải thấy hết', () => {
    const viewer = viewerOf({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: null });
    expect(canViewNddkRow(viewer, nha('5'))).toBe(false);
    expect(canViewNddkRow(viewer, nha(null))).toBe(false);
  });
});
