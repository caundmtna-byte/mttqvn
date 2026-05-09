import { describe, expect, it } from 'vitest';
import { canViewKhenThuongRow, type KhenThuongRowForViewGate, type MttqKhenThuongViewer } from '../use-mttq-khen-thuong-viewer';

function listRow(id_nguoi_tao: string, rewarded: string[]): KhenThuongRowForViewGate {
  return { id_nguoi_tao, rewarded_can_bo_don_vi_ids: rewarded };
}

function detailRow(id_nguoi_tao: string, chi: { can_bo_don_vi_id?: string | null }[]): KhenThuongRowForViewGate {
  return { id_nguoi_tao, chi_tiet: chi };
}

function flatRow(id_nguoi_tao: string, canBoDonVi: string | null): KhenThuongRowForViewGate {
  return { id_nguoi_tao, can_bo_don_vi_id: canBoDonVi };
}

describe('canViewKhenThuongRow', () => {
  it('bypass when canViewAll', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: true,
      chucVuCapQuanLy: null,
      viewerNhanVienId: '10',
      viewerDonViId: null,
    };
    expect(canViewKhenThuongRow(viewer, listRow('999', ['1']))).toBe(true);
  });

  it('Tỉnh sees all rows', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerNhanVienId: '10',
      viewerDonViId: null,
    };
    expect(canViewKhenThuongRow(viewer, listRow('999', []))).toBe(true);
  });

  it('Xã: sees own QD (creator)', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewKhenThuongRow(viewer, listRow('10', []))).toBe(true);
    expect(canViewKhenThuongRow(viewer, listRow('11', []))).toBe(false);
  });

  it('Xã: sees QD when any rewarded can_bo don_vi matches', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewKhenThuongRow(viewer, listRow('99', ['5', '6']))).toBe(true);
    expect(canViewKhenThuongRow(viewer, listRow('99', ['6', '7']))).toBe(false);
  });

  it('Xã without viewer don_vi: only creator', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerNhanVienId: '10',
      viewerDonViId: null,
    };
    expect(canViewKhenThuongRow(viewer, listRow('10', ['5']))).toBe(true);
    expect(canViewKhenThuongRow(viewer, listRow('11', ['5']))).toBe(false);
  });

  it('detail row uses chi_tiet can_bo_don_vi_id', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerNhanVienId: '1',
      viewerDonViId: '100',
    };
    expect(canViewKhenThuongRow(viewer, detailRow('2', [{ can_bo_don_vi_id: '100' }]))).toBe(true);
    expect(canViewKhenThuongRow(viewer, detailRow('2', [{ can_bo_don_vi_id: '200' }]))).toBe(false);
  });

  it('flat row: creator or can_bo don_vi', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewKhenThuongRow(viewer, flatRow('10', null))).toBe(true);
    expect(canViewKhenThuongRow(viewer, flatRow('11', '5'))).toBe(true);
    expect(canViewKhenThuongRow(viewer, flatRow('11', '6'))).toBe(false);
  });

  it('no cap_quan_ly and not bypass: no rows', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewKhenThuongRow(viewer, listRow('10', ['5']))).toBe(false);
  });
});
