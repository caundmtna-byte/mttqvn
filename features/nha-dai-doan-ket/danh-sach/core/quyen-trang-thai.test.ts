import { describe, expect, it } from 'vitest';
import { NDDK_TRANG_THAI_VALUES } from './constants';
import { nddkTrangThaiCanQuyenDuyet, nddkTrangThaiChonDuoc } from './quyen-trang-thai';

describe('nddkTrangThaiCanQuyenDuyet', () => {
  it('chỉ "Đã phê duyệt" đòi quyền Duyệt', () => {
    expect(nddkTrangThaiCanQuyenDuyet('Đã phê duyệt')).toBe(true);
    expect(nddkTrangThaiCanQuyenDuyet('Đang khảo sát')).toBe(false);
    expect(nddkTrangThaiCanQuyenDuyet('Đang thực hiện')).toBe(false);
    // Bàn giao là ghi nhận việc đã xảy ra, không phải quyết định cần phê.
    expect(nddkTrangThaiCanQuyenDuyet('Đã bàn giao')).toBe(false);
    expect(nddkTrangThaiCanQuyenDuyet('Tạm dừng')).toBe(false);
  });

  it('bỏ qua khoảng trắng thừa và giá trị rỗng', () => {
    expect(nddkTrangThaiCanQuyenDuyet('  Đã phê duyệt  ')).toBe(true);
    expect(nddkTrangThaiCanQuyenDuyet('')).toBe(false);
    expect(nddkTrangThaiCanQuyenDuyet(null)).toBe(false);
    expect(nddkTrangThaiCanQuyenDuyet(undefined)).toBe(false);
  });
});

describe('nddkTrangThaiChonDuoc', () => {
  it('có quyền Duyệt ⇒ chọn được mọi trạng thái', () => {
    expect(nddkTrangThaiChonDuoc('Đang khảo sát', true)).toEqual(NDDK_TRANG_THAI_VALUES);
  });

  it('không có quyền Duyệt ⇒ ẩn "Đã phê duyệt", giữ nguyên các bước nhập liệu', () => {
    const opts = nddkTrangThaiChonDuoc('Đang khảo sát', false);
    expect(opts).not.toContain('Đã phê duyệt');
    expect(opts).toContain('Đang khảo sát');
    expect(opts).toContain('Đang thực hiện');
    expect(opts).toContain('Đã bàn giao');
    expect(opts).toContain('Tạm dừng');
  });

  it('hồ sơ ĐANG ở "Đã phê duyệt" vẫn giữ trạng thái đó trong danh sách dù thiếu quyền', () => {
    // Nếu lọc mất, hộp thoại mở ra với ô trống và người dùng buộc phải đổi
    // trạng thái mới đóng được.
    const opts = nddkTrangThaiChonDuoc('Đã phê duyệt', false);
    expect(opts).toContain('Đã phê duyệt');
    expect(opts).toEqual(NDDK_TRANG_THAI_VALUES);
  });

  it('không bao giờ trả danh sách rỗng', () => {
    for (const t of [...NDDK_TRANG_THAI_VALUES, '', null]) {
      expect(nddkTrangThaiChonDuoc(t, false).length).toBeGreaterThan(0);
    }
  });
});
