import { describe, expect, it } from 'vitest';
import { nhanVienRowVisible, type NhanVienViewer } from './use-nhan-vien-viewer';

const viewer = (over: Partial<NhanVienViewer>): NhanVienViewer => ({
  viewAll: false,
  chucVuCapQuanLy: null,
  viewerDonViId: null,
  viewerPhongBanId: null,
  viewerNhanVienId: null,
  ...over,
});

const nv = (id: string, donVi: string | null, phongBan: string | null) => ({
  id,
  don_vi_id: donVi,
  id_phong_ban: phongBan,
});

describe('nhanVienRowVisible', () => {
  it('viewAll thấy mọi hồ sơ', () => {
    const v = viewer({ viewAll: true });
    expect(nhanVienRowVisible(v, nv('1', '9', '9'))).toBe(true);
    expect(nhanVienRowVisible(v, nv('2', null, null))).toBe(true);
  });

  it('Xã phường chỉ thấy nhân viên cùng đơn vị', () => {
    const v = viewer({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: '5', viewerPhongBanId: '3' });
    expect(nhanVienRowVisible(v, nv('1', '5', '99'))).toBe(true);
    expect(nhanVienRowVisible(v, nv('2', '6', '3'))).toBe(false);
    // Cùng phòng ban nhưng khác đơn vị vẫn không thấy — cấp xã xét theo đơn vị.
    expect(nhanVienRowVisible(v, nv('3', null, '3'))).toBe(false);
  });

  it('Xã phường mà viewer chưa gắn đơn vị thì không thấy ai (ngoài chính mình)', () => {
    const v = viewer({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: null, viewerNhanVienId: '7' });
    expect(nhanVienRowVisible(v, nv('1', '5', '3'))).toBe(false);
    expect(nhanVienRowVisible(v, nv('7', '5', '3'))).toBe(true);
  });

  it('không có cấp quản lý → chỉ thấy nhân viên cùng phòng ban', () => {
    const v = viewer({ chucVuCapQuanLy: null, viewerPhongBanId: '3', viewerDonViId: '5' });
    expect(nhanVienRowVisible(v, nv('1', '99', '3'))).toBe(true);
    expect(nhanVienRowVisible(v, nv('2', '5', '4'))).toBe(false);
    expect(nhanVienRowVisible(v, nv('3', '5', null))).toBe(false);
  });

  it('luôn thấy hồ sơ của chính mình', () => {
    const v = viewer({ viewerNhanVienId: '42', viewerPhongBanId: '3' });
    expect(nhanVienRowVisible(v, nv('42', null, null))).toBe(true);
  });

  it('so khớp id dạng số/chuỗi có khoảng trắng', () => {
    const v = viewer({ chucVuCapQuanLy: 'Xã phường', viewerDonViId: '5' });
    expect(nhanVienRowVisible(v, nv('1', ' 5 ', null))).toBe(true);
  });
});
