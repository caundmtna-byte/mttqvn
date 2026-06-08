import { describe, expect, it } from 'vitest';
import {
  canViewKhenThuongRow,
  canViewKhenThuongChiTietRow,
  canViewKhenThuongDetailChiTietLine,
  type MttqKhenThuongViewer,
} from '../use-mttq-khen-thuong-viewer';

const xaViewer: MttqKhenThuongViewer = {
  canViewAll: false,
  chucVuCapQuanLy: 'Xã phường',
  viewerNhanVienId: '10',
  viewerDonViId: '5',
};

const tinhViewer: MttqKhenThuongViewer = {
  canViewAll: false,
  chucVuCapQuanLy: 'Tỉnh',
  viewerNhanVienId: '10',
  viewerDonViId: null,
};

const bypassViewer: MttqKhenThuongViewer = {
  canViewAll: true,
  chucVuCapQuanLy: null,
  viewerNhanVienId: '10',
  viewerDonViId: null,
};

// ---------------------------------------------------------------------------
// canViewKhenThuongRow — tab Danh sách QĐ
// ---------------------------------------------------------------------------

describe('canViewKhenThuongRow', () => {
  it('bypass (canViewAll) sees all QĐ', () => {
    expect(canViewKhenThuongRow(bypassViewer, {})).toBe(true);
  });

  it('Tỉnh sees all QĐ', () => {
    expect(canViewKhenThuongRow(tinhViewer, { rewarded_can_bo_don_vi_ids: [] })).toBe(true);
  });

  it('Xã: QĐ có cán bộ cùng don_vi_id → true', () => {
    expect(
      canViewKhenThuongRow(xaViewer, { rewarded_can_bo_don_vi_ids: ['5'] }),
    ).toBe(true);
  });

  it('Xã: QĐ có nhiều cán bộ, trong đó có 1 trùng → true', () => {
    expect(
      canViewKhenThuongRow(xaViewer, { rewarded_can_bo_don_vi_ids: ['3', '5', '7'] }),
    ).toBe(true);
  });

  it('Xã: QĐ không có cán bộ cùng don_vi_id → false', () => {
    expect(
      canViewKhenThuongRow(xaViewer, { rewarded_can_bo_don_vi_ids: ['6', '7'] }),
    ).toBe(false);
  });

  it('Xã: QĐ rỗng (không có CT) → false', () => {
    expect(
      canViewKhenThuongRow(xaViewer, { rewarded_can_bo_don_vi_ids: [] }),
    ).toBe(false);
  });

  it('Xã không có viewerDonViId → false', () => {
    const viewer: MttqKhenThuongViewer = { ...xaViewer, viewerDonViId: null };
    expect(
      canViewKhenThuongRow(viewer, { rewarded_can_bo_don_vi_ids: ['5'] }),
    ).toBe(false);
  });

  it('Xã: fallback qua chi_tiet khi không có rewarded_can_bo_don_vi_ids', () => {
    expect(
      canViewKhenThuongRow(xaViewer, {
        chi_tiet: [{ can_bo_don_vi_id: '5' }, { can_bo_don_vi_id: '6' }],
      }),
    ).toBe(true);
  });

  it('Xã: fallback qua chi_tiet không có don_vi_id trùng → false', () => {
    expect(
      canViewKhenThuongRow(xaViewer, {
        chi_tiet: [{ can_bo_don_vi_id: '9' }],
      }),
    ).toBe(false);
  });

  it('cap_quan_ly null và không bypass → false', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewKhenThuongRow(viewer, { rewarded_can_bo_don_vi_ids: ['5'] })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canViewKhenThuongChiTietRow — tab Chi tiết phẳng
// ---------------------------------------------------------------------------

describe('canViewKhenThuongChiTietRow', () => {
  it('bypass (canViewAll) sees all flat rows', () => {
    expect(canViewKhenThuongChiTietRow(bypassViewer, { can_bo_don_vi_id: '99' })).toBe(true);
  });

  it('Tỉnh sees all flat rows', () => {
    expect(canViewKhenThuongChiTietRow(tinhViewer, { can_bo_don_vi_id: '99' })).toBe(true);
  });

  it('Xã: dòng cùng don_vi_id → true', () => {
    expect(canViewKhenThuongChiTietRow(xaViewer, { can_bo_don_vi_id: '5' })).toBe(true);
  });

  it('Xã: dòng khác don_vi_id → false', () => {
    expect(canViewKhenThuongChiTietRow(xaViewer, { can_bo_don_vi_id: '6' })).toBe(false);
  });

  it('Xã: dòng null don_vi_id → false', () => {
    expect(canViewKhenThuongChiTietRow(xaViewer, { can_bo_don_vi_id: null })).toBe(false);
  });

  it('Xã không có viewerDonViId → false', () => {
    const viewer: MttqKhenThuongViewer = { ...xaViewer, viewerDonViId: null };
    expect(canViewKhenThuongChiTietRow(viewer, { can_bo_don_vi_id: '5' })).toBe(false);
  });

  it('cap_quan_ly null và không bypass → false', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewKhenThuongChiTietRow(viewer, { can_bo_don_vi_id: '5' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canViewKhenThuongDetailChiTietLine — bảng con trong drawer detail
// ---------------------------------------------------------------------------

describe('canViewKhenThuongDetailChiTietLine', () => {
  it('Tỉnh sees all lines in detail child table', () => {
    expect(canViewKhenThuongDetailChiTietLine(tinhViewer, { can_bo_don_vi_id: '99' })).toBe(true);
  });

  it('Xã: cán bộ do mình tạo', () => {
    expect(
      canViewKhenThuongDetailChiTietLine(xaViewer, {
        can_bo_id_nguoi_tao: '10',
        can_bo_don_vi_id: '99',
      }),
    ).toBe(true);
  });

  it('Xã: cùng don_vi_id', () => {
    expect(
      canViewKhenThuongDetailChiTietLine(xaViewer, {
        can_bo_id_nguoi_tao: '99',
        can_bo_don_vi_id: '5',
      }),
    ).toBe(true);
  });

  it('Xã: không thuộc hai nhóm trên', () => {
    expect(
      canViewKhenThuongDetailChiTietLine(xaViewer, {
        can_bo_id_nguoi_tao: '99',
        can_bo_don_vi_id: '6',
      }),
    ).toBe(false);
  });

  it('Xã without viewer don_vi: chỉ cán bộ mình tạo', () => {
    const viewer: MttqKhenThuongViewer = {
      ...xaViewer,
      viewerDonViId: null,
    };
    expect(
      canViewKhenThuongDetailChiTietLine(viewer, {
        can_bo_id_nguoi_tao: '10',
        can_bo_don_vi_id: null,
      }),
    ).toBe(true);
    expect(
      canViewKhenThuongDetailChiTietLine(viewer, {
        can_bo_id_nguoi_tao: '99',
        can_bo_don_vi_id: '5',
      }),
    ).toBe(false);
  });
});
