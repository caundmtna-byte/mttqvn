import { describe, it, expect } from 'vitest';
import type { MttqKhenThuongFormValues } from '../core/schema';
import {
  buildKhenThuongChiTietPayload,
  isPersistedChildId,
} from './build-khen-thuong-chi-tiet-payload';

type Line = MttqKhenThuongFormValues['chi_tiet'][number];

function line(over: Partial<Line> = {}): Line {
  return {
    id: undefined,
    can_bo_id: '1',
    cap_khen_thuong: 'Xã',
    hinh_thuc_khen: 'Thường xuyên',
    danh_hieu: 'Giấy khen',
    noi_dung_khen: undefined,
    ho_so_khen: undefined,
    ...over,
  } as Line;
}

describe('isPersistedChildId', () => {
  it('chỉ nhận id toàn chữ số của dòng đã lưu', () => {
    expect(isPersistedChildId('12')).toBe(true);
    expect(isPersistedChildId(' 12 ')).toBe(true);
    expect(isPersistedChildId('tmp-3')).toBe(false);
    expect(isPersistedChildId('')).toBe(false);
    expect(isPersistedChildId(undefined)).toBe(false);
    expect(isPersistedChildId(12)).toBe(false);
  });
});

describe('buildKhenThuongChiTietPayload', () => {
  it('giữ id cho dòng đã lưu và bỏ id cho dòng mới', () => {
    const out = buildKhenThuongChiTietPayload([
      line({ id: '7', can_bo_id: '3' }),
      line({ id: undefined, can_bo_id: '4' }),
      line({ id: 'tmp-1', can_bo_id: '5' }),
    ]);
    expect(out).toHaveLength(3);
    expect(out[0].id).toBe('7');
    expect(out[1].id).toBeUndefined();
    // id tạm sinh ở form không phải id DB ⇒ phải là dòng chèn mới.
    expect(out[2].id).toBeUndefined();
  });

  it('giữ nguyên thứ tự dòng của form', () => {
    const out = buildKhenThuongChiTietPayload([
      line({ can_bo_id: '9' }),
      line({ can_bo_id: '8' }),
      line({ can_bo_id: '7' }),
    ]);
    expect(out.map((x) => x.can_bo_id)).toEqual(['9', '8', '7']);
  });

  it('cắt khoảng trắng và đổi ô trống thành chuỗi rỗng (RPC sẽ ghi NULL)', () => {
    const [out] = buildKhenThuongChiTietPayload([
      line({ id: ' 21 ', can_bo_id: ' 5 ', noi_dung_khen: '  có nội dung  ', ho_so_khen: '   ' }),
    ]);
    expect(out).toEqual({
      id: '21',
      can_bo_id: '5',
      cap_khen_thuong: 'Xã',
      hinh_thuc_khen: 'Thường xuyên',
      danh_hieu: 'Giấy khen',
      noi_dung_khen: 'có nội dung',
      ho_so_khen: '',
    });
  });

  it('mảng rỗng cho ra mảng rỗng — RPC sẽ từ chối bằng KHEN_THUONG_CHI_TIET_RONG', () => {
    expect(buildKhenThuongChiTietPayload([])).toEqual([]);
  });
});
