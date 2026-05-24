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

describe('canViewKhenThuongRow', () => {
  it('bypass when canViewAll', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: true,
      chucVuCapQuanLy: null,
      viewerNhanVienId: '10',
      viewerDonViId: null,
    };
    expect(canViewKhenThuongRow(viewer, {})).toBe(true);
  });

  it('Tỉnh sees all QĐ', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerNhanVienId: '10',
      viewerDonViId: null,
    };
    expect(canViewKhenThuongRow(viewer, {})).toBe(true);
  });

  it('Xã phường sees all QĐ on tab Danh sách', () => {
    expect(canViewKhenThuongRow(xaViewer, {})).toBe(true);
  });

  it('no cap_quan_ly and not bypass: no rows', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: null,
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewKhenThuongRow(viewer, {})).toBe(false);
  });
});

describe('canViewKhenThuongChiTietRow', () => {
  it('Xã phường sees all flat rows (same as Danh sách)', () => {
    expect(canViewKhenThuongChiTietRow(xaViewer, {})).toBe(true);
  });
});

describe('canViewKhenThuongDetailChiTietLine', () => {
  it('Tỉnh sees all lines in detail child table', () => {
    const viewer: MttqKhenThuongViewer = {
      canViewAll: false,
      chucVuCapQuanLy: 'Tỉnh',
      viewerNhanVienId: '10',
      viewerDonViId: '5',
    };
    expect(canViewKhenThuongDetailChiTietLine(viewer, { can_bo_don_vi_id: '99' })).toBe(true);
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
