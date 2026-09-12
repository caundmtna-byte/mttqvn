import { describe, expect, it } from 'vitest';
import {
  BaiVietTenBaiConflictError,
  mapBaiVietTenBaiConstraintError,
  normalizeBaiVietTenBaiForCompare,
} from './bai-viet-ten-bai-conflict';

describe('normalizeBaiVietTenBaiForCompare', () => {
  it('bỏ khoảng trắng hai đầu, gộp khoảng trắng giữa, bỏ phân biệt hoa/thường', () => {
    expect(normalizeBaiVietTenBaiForCompare('  Đại hội   MTTQ  ')).toBe('đại hội mttq');
    expect(normalizeBaiVietTenBaiForCompare('ĐẠI HỘI MTTQ')).toBe('đại hội mttq');
  });

  it('xuống dòng và tab cũng coi là khoảng trắng', () => {
    expect(normalizeBaiVietTenBaiForCompare('Đại hội\n\tMTTQ')).toBe('đại hội mttq');
  });

  it('null / undefined / chuỗi trắng → rỗng', () => {
    expect(normalizeBaiVietTenBaiForCompare(null)).toBe('');
    expect(normalizeBaiVietTenBaiForCompare(undefined)).toBe('');
    expect(normalizeBaiVietTenBaiForCompare('   ')).toBe('');
  });
});

describe('mapBaiVietTenBaiConstraintError', () => {
  it('nhận đúng unique index của tên bài', () => {
    const mapped = mapBaiVietTenBaiConstraintError({
      code: '23505',
      message: 'duplicate key value violates unique constraint "uq_bai_viet_danh_sach_ten_bai_lower"',
    });
    expect(mapped).toBeInstanceOf(BaiVietTenBaiConflictError);
  });

  it('bỏ qua unique violation của ràng buộc khác (liên kết) và lỗi khác mã', () => {
    expect(
      mapBaiVietTenBaiConstraintError({
        code: '23505',
        message: 'duplicate key value violates unique constraint "uq_bai_viet_danh_sach_link_lower"',
      }),
    ).toBeNull();
    expect(mapBaiVietTenBaiConstraintError({ code: '23503', message: 'foreign key' })).toBeNull();
    expect(mapBaiVietTenBaiConstraintError(new Error('boom'))).toBeNull();
    expect(mapBaiVietTenBaiConstraintError(null)).toBeNull();
  });
});
