import { describe, expect, it } from 'vitest';
import { canViewVnnRow, vnnViewerRpcScope, type VnnViewer } from './use-vnn-viewer';

const xa = (over: Partial<VnnViewer> = {}): VnnViewer => ({
  canViewAll: false,
  chucVuCapQuanLy: 'Xã phường',
  viewerDonViId: '7',
  ...over,
});

describe('canViewVnnRow', () => {
  it('cấp Tỉnh xem mọi khoản', () => {
    const v = xa({ chucVuCapQuanLy: 'Tỉnh' });
    expect(canViewVnnRow(v, { xa_phuong_id: '99' })).toBe(true);
    expect(canViewVnnRow(v, { xa_phuong_id: null })).toBe(true);
  });

  it('bypass (quản trị / chưa hydrate) xem mọi khoản dù là Xã phường', () => {
    expect(canViewVnnRow(xa({ canViewAll: true }), { xa_phuong_id: '99' })).toBe(true);
  });

  it('Xã phường chỉ thấy khoản của xã mình', () => {
    expect(canViewVnnRow(xa(), { xa_phuong_id: '7' })).toBe(true);
    expect(canViewVnnRow(xa(), { xa_phuong_id: '8' })).toBe(false);
    expect(canViewVnnRow(xa(), { xa_phuong_id: null })).toBe(false);
  });

  it('Xã phường chưa gán đơn vị thấy rỗng — không nới lỏng', () => {
    expect(canViewVnnRow(xa({ viewerDonViId: null }), { xa_phuong_id: '7' })).toBe(false);
  });

  it('không có cấp quản lý ⇒ xem hết', () => {
    expect(canViewVnnRow(xa({ chucVuCapQuanLy: null }), { xa_phuong_id: '8' })).toBe(true);
  });
});

describe('vnnViewerRpcScope khớp canViewVnnRow', () => {
  it('Xã phường ⇒ lọc theo đơn vị', () => {
    expect(vnnViewerRpcScope(xa())).toEqual({ viewAll: false, viewerXaPhuongId: '7' });
  });

  it('Xã phường chưa gán đơn vị ⇒ lọc với id null (RPC trả rỗng)', () => {
    expect(vnnViewerRpcScope(xa({ viewerDonViId: null }))).toEqual({
      viewAll: false,
      viewerXaPhuongId: null,
    });
  });

  it('Tỉnh / bypass ⇒ xem hết', () => {
    expect(vnnViewerRpcScope(xa({ chucVuCapQuanLy: 'Tỉnh' })).viewAll).toBe(true);
    expect(vnnViewerRpcScope(xa({ canViewAll: true })).viewAll).toBe(true);
  });
});
