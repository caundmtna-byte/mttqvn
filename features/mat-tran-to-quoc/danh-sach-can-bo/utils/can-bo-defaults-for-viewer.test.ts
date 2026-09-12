import { describe, it, expect } from 'vitest';
import { buildCanBoDefaultsForViewer } from './can-bo-defaults-for-viewer';
import { MTTQ_CAN_BO_FORM_DEFAULT_VALUES } from '../core/default-form-values';

const departments = [
  { id: 'pb-xa', cha_id: null },
  { id: 'pb-bo-phan', cha_id: 'pb-xa' },
  { id: 'pb-tinh', cha_id: null },
  { id: 'pb-ngung', cha_id: null },
];
const selectable = ['pb-xa', 'pb-tinh'];

describe('buildCanBoDefaultsForViewer', () => {
  it('không phải cấp Xã phường → giữ nguyên mặc định gốc', () => {
    const d = buildCanBoDefaultsForViewer({
      isXaPhuongViewer: false,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-xa',
      departments,
      selectablePhongBanIds: selectable,
    });
    expect(d.cap_quan_ly).toEqual([]);
    expect(d.don_vi_id).toBe('');
    expect(d.id_phong_ban).toBe('');
  });

  it('cấp Xã phường → điền sẵn phòng ban, cấp quản lý, đơn vị', () => {
    const d = buildCanBoDefaultsForViewer({
      isXaPhuongViewer: true,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-xa',
      departments,
      selectablePhongBanIds: selectable,
    });
    expect(d.cap_quan_ly).toEqual(['Xã phường']);
    expect(d.don_vi_id).toBe('xa-01');
    expect(d.id_phong_ban).toBe('pb-xa');
  });

  it('viewer gắn bộ phận con → quy về phòng ban gốc', () => {
    const d = buildCanBoDefaultsForViewer({
      isXaPhuongViewer: true,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-bo-phan',
      departments,
      selectablePhongBanIds: selectable,
    });
    expect(d.id_phong_ban).toBe('pb-xa');
  });

  it('phòng ban không có trong combobox (ngừng hoạt động) → bỏ trống', () => {
    const d = buildCanBoDefaultsForViewer({
      isXaPhuongViewer: true,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-ngung',
      departments,
      selectablePhongBanIds: selectable,
    });
    expect(d.id_phong_ban).toBe('');
    expect(d.don_vi_id).toBe('xa-01');
  });

  it('thiếu don_vi_id / phong_ban của viewer → vẫn đặt cấp quản lý Xã phường', () => {
    const d = buildCanBoDefaultsForViewer({
      isXaPhuongViewer: true,
      viewerDonViId: null,
      viewerPhongBanId: null,
      departments,
      selectablePhongBanIds: selectable,
    });
    expect(d.cap_quan_ly).toEqual(['Xã phường']);
    expect(d.don_vi_id).toBe('');
    expect(d.id_phong_ban).toBe('');
  });

  it('không làm bẩn hằng số mặc định dùng chung', () => {
    buildCanBoDefaultsForViewer({
      isXaPhuongViewer: true,
      viewerDonViId: 'xa-01',
      viewerPhongBanId: 'pb-xa',
      departments,
      selectablePhongBanIds: selectable,
    });
    expect(MTTQ_CAN_BO_FORM_DEFAULT_VALUES.cap_quan_ly).toEqual([]);
    expect(MTTQ_CAN_BO_FORM_DEFAULT_VALUES.don_vi_id).toBe('');
    expect(MTTQ_CAN_BO_FORM_DEFAULT_VALUES.id_phong_ban).toBe('');
  });
});
