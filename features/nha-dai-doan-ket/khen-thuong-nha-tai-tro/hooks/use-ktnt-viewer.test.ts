import { describe, expect, it } from 'vitest';
import { canViewKtntRow, ktntViewerRpcScope, type KtntViewer } from './use-ktnt-viewer';

const xa = (over: Partial<KtntViewer> = {}): KtntViewer => ({
  canViewAll: false,
  chucVuCapQuanLy: 'Xã phường',
  viewerDonViId: '7',
  ...over,
});

describe('canViewKtntRow', () => {
  it('cấp Tỉnh xem mọi quyết định', () => {
    const v = xa({ chucVuCapQuanLy: 'Tỉnh' });
    expect(canViewKtntRow(v, { xa_phuong_id: '99' })).toBe(true);
    expect(canViewKtntRow(v, { xa_phuong_id: null })).toBe(true);
  });

  it('bypass (quản trị / chưa hydrate) xem mọi quyết định dù là Xã phường', () => {
    expect(canViewKtntRow(xa({ canViewAll: true }), { xa_phuong_id: '99' })).toBe(true);
  });

  it('Xã phường chỉ thấy quyết định của xã mình', () => {
    expect(canViewKtntRow(xa(), { xa_phuong_id: '7' })).toBe(true);
    expect(canViewKtntRow(xa(), { xa_phuong_id: '8' })).toBe(false);
    expect(canViewKtntRow(xa(), { xa_phuong_id: null })).toBe(false);
  });

  it('Xã phường chưa gán đơn vị thấy rỗng — không nới lỏng', () => {
    expect(canViewKtntRow(xa({ viewerDonViId: null }), { xa_phuong_id: '7' })).toBe(false);
  });

  it('không có cấp quản lý ⇒ xem hết', () => {
    expect(canViewKtntRow(xa({ chucVuCapQuanLy: null }), { xa_phuong_id: '8' })).toBe(true);
  });
});

describe('ktntViewerRpcScope khớp canViewKtntRow', () => {
  it('Xã phường ⇒ lọc theo đơn vị', () => {
    expect(ktntViewerRpcScope(xa())).toEqual({ viewAll: false, viewerXaPhuongId: '7' });
  });

  it('Xã phường chưa gán đơn vị ⇒ lọc với id null (RPC trả rỗng)', () => {
    expect(ktntViewerRpcScope(xa({ viewerDonViId: null }))).toEqual({
      viewAll: false,
      viewerXaPhuongId: null,
    });
  });

  it('Tỉnh / bypass ⇒ xem hết', () => {
    expect(ktntViewerRpcScope(xa({ chucVuCapQuanLy: 'Tỉnh' })).viewAll).toBe(true);
    expect(ktntViewerRpcScope(xa({ canViewAll: true })).viewAll).toBe(true);
  });
});
