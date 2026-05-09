import { describe, expect, it } from 'vitest';
import { canViewUyVienUyBanRow, type MttqUyVienUyBanViewer } from '../use-mttq-uy-vien-uy-ban-viewer';

function row(don_vi_id: string | null, id_nguoi_tao: string) {
  return { don_vi_id, id_nguoi_tao };
}

describe('canViewUyVienUyBanRow', () => {
  it('bypass when canViewAll', () => {
    const viewer: MttqUyVienUyBanViewer = {
      canViewAll: true,
      chucVuCapQuanLy: null,
      viewerNhanVienId: '10',
      viewerDonViId: null,
    };
    expect(canViewUyVienUyBanRow(viewer, row('99', '999'))).toBe(true);
  });

  it('Tỉnh sees all rows', () => {
    const viewer: MttqUyVienUyBanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerNhanVienId: '10',
      viewerDonViId: null,
    };
    expect(canViewUyVienUyBanRow(viewer, row(null, '999'))).toBe(true);
  });

  it('Xã with don_vi sees same don_vi_id only', () => {
    const viewer: MttqUyVienUyBanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewUyVienUyBanRow(viewer, row('5', '999'))).toBe(true);
    expect(canViewUyVienUyBanRow(viewer, row('6', '10'))).toBe(false);
  });

  it('Xã without viewer don_vi sees nothing (even own row)', () => {
    const viewer: MttqUyVienUyBanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Xã phường',
      viewerNhanVienId: '10',
      viewerDonViId: null,
    };
    expect(canViewUyVienUyBanRow(viewer, row('5', '10'))).toBe(false);
  });

  it('no cap_quan_ly: only creator', () => {
    const viewer: MttqUyVienUyBanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewUyVienUyBanRow(viewer, row('5', '10'))).toBe(true);
    expect(canViewUyVienUyBanRow(viewer, row('5', '11'))).toBe(false);
  });

  it('no cap_quan_ly: no nhan_vien id means no rows', () => {
    const viewer: MttqUyVienUyBanViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerNhanVienId: null,
      viewerDonViId: '5',
    };
    expect(canViewUyVienUyBanRow(viewer, row('5', '10'))).toBe(false);
  });
});
