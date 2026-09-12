import { describe, it, expect } from 'vitest';
import type { MttqTapHuanFormValues } from '../core/schema';
import { buildTapHuanChiTietPayload, isPersistedChildId } from './build-tap-huan-chi-tiet-payload';

type Line = MttqTapHuanFormValues['chi_tiet'][number];

function line(over: Partial<Line> = {}): Line {
  return { id: undefined, can_bo_id: '1', thuoc_dien: 'Biên chế', ...over } as Line;
}

describe('isPersistedChildId', () => {
  it('chỉ nhận id toàn chữ số của dòng đã lưu', () => {
    expect(isPersistedChildId('45')).toBe(true);
    expect(isPersistedChildId('tmp-2')).toBe(false);
    expect(isPersistedChildId(undefined)).toBe(false);
  });
});

describe('buildTapHuanChiTietPayload', () => {
  it('giữ id cho dòng đã lưu và bỏ id cho dòng mới', () => {
    const out = buildTapHuanChiTietPayload([
      line({ id: '45', can_bo_id: '1' }),
      line({ id: undefined, can_bo_id: '2', thuoc_dien: 'Ngoài biên chế' }),
    ]);
    expect(out).toEqual([
      { id: '45', can_bo_id: '1', thuoc_dien: 'Biên chế' },
      { can_bo_id: '2', thuoc_dien: 'Ngoài biên chế' },
    ]);
  });

  it('giữ nguyên thứ tự dòng của form', () => {
    const out = buildTapHuanChiTietPayload([
      line({ can_bo_id: '3' }),
      line({ can_bo_id: '1' }),
      line({ can_bo_id: '2' }),
    ]);
    expect(out.map((x) => x.can_bo_id)).toEqual(['3', '1', '2']);
  });

  it('cắt khoảng trắng ở id và can_bo_id', () => {
    const [out] = buildTapHuanChiTietPayload([line({ id: ' 9 ', can_bo_id: ' 12 ' })]);
    expect(out).toEqual({ id: '9', can_bo_id: '12', thuoc_dien: 'Biên chế' });
  });

  it('mảng rỗng cho ra mảng rỗng — RPC sẽ từ chối bằng TAP_HUAN_CHI_TIET_RONG', () => {
    expect(buildTapHuanChiTietPayload([])).toEqual([]);
  });
});
