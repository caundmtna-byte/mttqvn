import { describe, it, expect } from 'vitest';
import { getDefaultEmployeeFormValues } from './employee-to-form';

const selectable = ['pb-xa', 'pb-tinh'];

describe('getDefaultEmployeeFormValues', () => {
  it('không truyền viewer → mặc định trống như cũ', () => {
    const v = getDefaultEmployeeFormValues();
    expect(v.cap_quan_ly).toEqual([]);
    expect(v.don_vi_id).toBe('');
    expect(v.id_phong_ban).toBe('');
  });

  it('viewer không phải cấp Xã phường → không điền gì', () => {
    const v = getDefaultEmployeeFormValues({
      isXaPhuongViewer: false,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-xa',
      selectablePhongBanIds: selectable,
    });
    expect(v.cap_quan_ly).toEqual([]);
    expect(v.don_vi_id).toBe('');
    expect(v.id_phong_ban).toBe('');
  });

  it('viewer cấp Xã phường → điền cấp quản lý, đơn vị, phòng ban', () => {
    const v = getDefaultEmployeeFormValues({
      isXaPhuongViewer: true,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-xa',
      selectablePhongBanIds: selectable,
    });
    expect(v.cap_quan_ly).toEqual(['Xã phường']);
    expect(v.don_vi_id).toBe('xa-01');
    expect(v.id_phong_ban).toBe('pb-xa');
    expect(v.id_bo_phan).toBe('');
  });

  it('phòng ban của viewer không có trong combobox → bỏ trống', () => {
    const v = getDefaultEmployeeFormValues({
      isXaPhuongViewer: true,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-bo-phan-con',
      selectablePhongBanIds: selectable,
    });
    expect(v.id_phong_ban).toBe('');
    expect(v.don_vi_id).toBe('xa-01');
  });

  it('thiếu đơn vị / phòng ban của viewer → vẫn đặt cấp quản lý Xã phường', () => {
    const v = getDefaultEmployeeFormValues({
      isXaPhuongViewer: true,
      viewerDonViId: null,
      viewerPhongBanId: null,
    });
    expect(v.cap_quan_ly).toEqual(['Xã phường']);
    expect(v.don_vi_id).toBe('');
    expect(v.id_phong_ban).toBe('');
  });
});
