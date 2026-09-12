// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { resolveTangLuongHomeScope } from './tang-luong-home-scope';
import { canViewTangLuongRow } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/hooks/use-mttq-tang-luong-viewer';
import type { MttqTangLuongViewer } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/hooks/use-mttq-tang-luong-viewer';

function viewer(p: Partial<MttqTangLuongViewer>): MttqTangLuongViewer {
  return { canViewAll: false, chucVuCapQuanLy: null, viewerDonViId: null, ...p };
}

describe('resolveTangLuongHomeScope', () => {
  it('quản trị / bypass ⇒ đếm toàn bộ', () => {
    expect(resolveTangLuongHomeScope(viewer({ canViewAll: true }))).toEqual({
      kieu: 'all',
      viewerDonViId: null,
    });
  });

  // Khác các module còn lại: cấp Tỉnh KHÔNG phải "xem hết", mà lọc theo
  // cap_quan_ly của cán bộ. Nhầm chỗ này là đếm ra số của cả tỉnh.
  it('cấp Tỉnh ⇒ lọc theo cap_quan_ly của cán bộ, không phải xem hết', () => {
    expect(resolveTangLuongHomeScope(viewer({ chucVuCapQuanLy: 'Tỉnh' }))).toEqual({
      kieu: 'tinh',
      viewerDonViId: null,
    });
  });

  it('cấp Xã phường ⇒ chỉ đơn vị mình', () => {
    expect(
      resolveTangLuongHomeScope(viewer({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: '7' })),
    ).toEqual({ kieu: 'xa_phuong', viewerDonViId: '7' });
  });

  it('cấp Xã phường CHƯA gán đơn vị ⇒ không đếm gì cả', () => {
    expect(resolveTangLuongHomeScope(viewer({ chucVuCapQuanLy: 'Xã phường' }))).toBeNull();
  });

  it('không lệch so với hàm lọc dòng ở client', () => {
    const dongCungDonVi = { don_vi_id: '7', can_bo_cap_quan_ly: ['Xã phường'] };
    const dongKhacDonVi = { don_vi_id: '99', can_bo_cap_quan_ly: ['Xã phường'] };
    const dongCapTinh = { don_vi_id: '99', can_bo_cap_quan_ly: ['Tỉnh'] };

    const bypass = viewer({ canViewAll: true });
    expect(resolveTangLuongHomeScope(bypass)?.kieu).toBe('all');
    expect(canViewTangLuongRow(bypass, dongKhacDonVi)).toBe(true);

    const tinh = viewer({ chucVuCapQuanLy: 'Tỉnh' });
    expect(resolveTangLuongHomeScope(tinh)?.kieu).toBe('tinh');
    expect(canViewTangLuongRow(tinh, dongCapTinh)).toBe(true);
    expect(canViewTangLuongRow(tinh, dongCungDonVi)).toBe(false);

    const xa = viewer({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: '7' });
    expect(resolveTangLuongHomeScope(xa)?.kieu).toBe('xa_phuong');
    expect(canViewTangLuongRow(xa, dongCungDonVi)).toBe(true);
    expect(canViewTangLuongRow(xa, dongKhacDonVi)).toBe(false);

    const xaThieuDonVi = viewer({ chucVuCapQuanLy: 'Xã phường' });
    expect(resolveTangLuongHomeScope(xaThieuDonVi)).toBeNull();
    expect(canViewTangLuongRow(xaThieuDonVi, dongCungDonVi)).toBe(false);
  });
});
