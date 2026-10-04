import { describe, expect, it } from 'vitest';
import type { KhoPhamViViewer } from '../../danh-sach-kho/utils/pham-vi-kho';
import { chuongTrinhChonDuocChoTiepNhan, chuongTrinhTrongPhamVi } from './pham-vi-chuong-trinh';

const xa = (dv: string | null): KhoPhamViViewer => ({ canViewAll: false, chucVuCapQuanLy: 'Xã phường', viewerDonViId: dv });
const tinh: KhoPhamViViewer = { canViewAll: false, chucVuCapQuanLy: 'Tỉnh', viewerDonViId: null };
const quanTri: KhoPhamViViewer = { canViewAll: true, chucVuCapQuanLy: 'Xã phường', viewerDonViId: '5' };

const ctTinh = { id: '1', don_vi_chu_tri_loai: 'tinh' as const, don_vi_chu_tri_id: null, trang_thai: 'Đang triển khai' };
const ctXa5 = { id: '2', don_vi_chu_tri_loai: 'xa_phuong' as const, don_vi_chu_tri_id: '5', trang_thai: 'Đang triển khai' };
const ctXa7 = { id: '3', don_vi_chu_tri_loai: 'xa_phuong' as const, don_vi_chu_tri_id: '7', trang_thai: 'Đang triển khai' };
const ctXa5KetThuc = { ...ctXa5, id: '4', trang_thai: 'Kết thúc' };

describe('chuongTrinhTrongPhamVi', () => {
  it('cán bộ xã chỉ thấy chương trình do xã mình chủ trì — không thấy của tỉnh', () => {
    expect(chuongTrinhTrongPhamVi(xa('5'), ctXa5)).toBe(true);
    expect(chuongTrinhTrongPhamVi(xa('5'), ctXa7)).toBe(false);
    expect(chuongTrinhTrongPhamVi(xa('5'), ctTinh)).toBe(false);
  });
  it('cán bộ xã chưa gán đơn vị thấy rỗng', () => {
    expect(chuongTrinhTrongPhamVi(xa(null), ctXa5)).toBe(false);
  });
  it('tỉnh và quản trị thấy mọi chương trình', () => {
    for (const ct of [ctTinh, ctXa5, ctXa7]) {
      expect(chuongTrinhTrongPhamVi(tinh, ct)).toBe(true);
      expect(chuongTrinhTrongPhamVi(quanTri, ct)).toBe(true);
    }
  });
});

describe('chuongTrinhChonDuocChoTiepNhan', () => {
  const rows = [ctTinh, ctXa5, ctXa7, ctXa5KetThuc];
  it('chỉ chương trình đang triển khai trong phạm vi', () => {
    expect(chuongTrinhChonDuocChoTiepNhan(rows, xa('5')).map((r) => r.id)).toEqual(['2']);
    expect(chuongTrinhChonDuocChoTiepNhan(rows, tinh).map((r) => r.id)).toEqual(['1', '2', '3']);
  });
  it('giữ chương trình đang gắn khi sửa, kể cả đã kết thúc', () => {
    expect(chuongTrinhChonDuocChoTiepNhan(rows, xa('5'), '4').map((r) => r.id)).toEqual(['2', '4']);
  });
});
