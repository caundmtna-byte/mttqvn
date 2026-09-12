import { describe, it, expect } from 'vitest';
import { buildPhanQuyenUpdatesPayload, parseChucVuId } from './build-phan-quyen-updates-payload';

describe('parseChucVuId', () => {
  it('chỉ nhận id dương', () => {
    expect(parseChucVuId('12')).toBe(12);
    expect(parseChucVuId(' 12 ')).toBe(12);
    expect(parseChucVuId('0')).toBeNull();
    expect(parseChucVuId('-3')).toBeNull();
    expect(parseChucVuId('abc')).toBeNull();
    expect(parseChucVuId('')).toBeNull();
  });
});

describe('buildPhanQuyenUpdatesPayload', () => {
  it('đổi danh sách hành động sang chuỗi token tiếng Việt', () => {
    expect(
      buildPhanQuyenUpdatesPayload([{ roleId: '5', actions: ['view', 'create', 'update'] }]),
    ).toEqual([{ chuc_vu_id: 5, quyen: 'xem,them,sua' }]);
  });

  it('chức vụ bị gỡ hết quyền vẫn phải có mặt với quyen rỗng', () => {
    // Vắng mặt là RPC không xoá dòng cũ ⇒ gỡ quyền trên UI mà DB vẫn còn quyền.
    expect(buildPhanQuyenUpdatesPayload([{ roleId: '5', actions: [] }])).toEqual([
      { chuc_vu_id: 5, quyen: '' },
    ]);
  });

  it('bỏ roleId không hợp lệ', () => {
    expect(
      buildPhanQuyenUpdatesPayload([
        { roleId: 'x', actions: ['view'] },
        { roleId: '7', actions: ['view'] },
      ]),
    ).toEqual([{ chuc_vu_id: 7, quyen: 'xem' }]);
  });

  it('trùng chức vụ thì gộp một dòng, lần sửa sau thắng', () => {
    // Hai dòng cùng chuc_vu_id sẽ vi phạm UNIQUE(chuc_vu_id, module_key) khi RPC chèn lại.
    expect(
      buildPhanQuyenUpdatesPayload([
        { roleId: '3', actions: ['view'] },
        { roleId: '3', actions: ['view', 'delete'] },
      ]),
    ).toEqual([{ chuc_vu_id: 3, quyen: 'xem,xoa' }]);
  });

  it('danh sách rỗng cho ra mảng rỗng — service dừng trước khi gọi RPC', () => {
    expect(buildPhanQuyenUpdatesPayload([])).toEqual([]);
  });
});
