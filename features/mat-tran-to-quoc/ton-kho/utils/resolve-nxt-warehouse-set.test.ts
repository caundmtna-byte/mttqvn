import { describe, expect, it } from 'vitest';
import { resolveNxtWarehouseSet } from './resolve-nxt-warehouse-set';

const ids = (s: Set<string> | null) => (s ? [...s].sort() : null);

describe('resolveNxtWarehouseSet', () => {
  it('không chọn kho, không giới hạn ⇒ null (mọi kho)', () => {
    expect(resolveNxtWarehouseSet([], null)).toBeNull();
  });

  it('chỉ chọn kho ⇒ đúng kho đã chọn', () => {
    expect(ids(resolveNxtWarehouseSet(['k1', 'k2'], null))).toEqual(['k1', 'k2']);
  });

  it('cán bộ xã chưa chọn kho ⇒ toàn bộ kho của xã', () => {
    expect(ids(resolveNxtWarehouseSet([], ['k1', 'k3']))).toEqual(['k1', 'k3']);
  });

  it('cán bộ xã chọn kho ⇒ chỉ phần nằm trong phạm vi', () => {
    expect(ids(resolveNxtWarehouseSet(['k1', 'k2'], ['k1', 'k3']))).toEqual(['k1']);
  });

  it('phạm vi rỗng ⇒ Set rỗng, không phải mọi kho', () => {
    expect(ids(resolveNxtWarehouseSet([], []))).toEqual([]);
    expect(ids(resolveNxtWarehouseSet(['k1'], []))).toEqual([]);
  });
});
