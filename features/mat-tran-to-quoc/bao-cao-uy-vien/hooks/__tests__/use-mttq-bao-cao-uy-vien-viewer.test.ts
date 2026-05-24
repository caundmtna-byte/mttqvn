import { describe, expect, it } from 'vitest';
import { canViewUyVienUyBanRow } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban-viewer';
import { buildBaoCaoUyVienViewerFromGrants } from '../use-mttq-bao-cao-uy-vien-viewer';

const STATS_MODULE = 'mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien';
const LIST_MODULE = 'mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien';

function row(don_vi_id: string | null, id_nguoi_tao: string) {
  return { don_vi_id, id_nguoi_tao };
}

describe('buildBaoCaoUyVienViewerFromGrants', () => {
  it('canViewAll when admin grant on stats module only', () => {
    const viewer = buildBaoCaoUyVienViewerFromGrants({
      [STATS_MODULE]: ['admin'],
      [LIST_MODULE]: ['view'],
    });
    expect(viewer.canViewAll).toBe(true);
    expect(canViewUyVienUyBanRow(viewer, row('99', '999'))).toBe(true);
  });

  it('not canViewAll when admin only on list module', () => {
    const viewer = buildBaoCaoUyVienViewerFromGrants(
      {
        [STATS_MODULE]: ['view'],
        [LIST_MODULE]: ['admin'],
      },
      { chucVuCapQuanLy: null, nhanVienId: '10' },
    );
    expect(viewer.canViewAll).toBe(false);
    expect(canViewUyVienUyBanRow(viewer, row('5', '11'))).toBe(false);
    expect(canViewUyVienUyBanRow(viewer, row('5', '10'))).toBe(true);
  });

  it('Xã phường filters by don_vi_id regardless of stats grants', () => {
    const viewer = buildBaoCaoUyVienViewerFromGrants(
      { [STATS_MODULE]: ['view', 'export'] },
      { chucVuCapQuanLy: 'Xã phường', donViId: '5', nhanVienId: '10' },
    );
    expect(viewer.canViewAll).toBe(false);
    expect(canViewUyVienUyBanRow(viewer, row('5', '999'))).toBe(true);
    expect(canViewUyVienUyBanRow(viewer, row('6', '10'))).toBe(false);
    expect(canViewUyVienUyBanRow(viewer, row(null, '10'))).toBe(false);
  });

  it('Tỉnh sees all rows without stats admin grant', () => {
    const viewer = buildBaoCaoUyVienViewerFromGrants(
      { [STATS_MODULE]: ['view'] },
      { chucVuCapQuanLy: 'Tỉnh', nhanVienId: '10' },
    );
    expect(canViewUyVienUyBanRow(viewer, row(null, '999'))).toBe(true);
  });
});
