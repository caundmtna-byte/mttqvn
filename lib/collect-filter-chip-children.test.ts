import { describe, it, expect } from 'vitest';
import { computeVisibleChipCount, orderChipsByPriority } from './collect-filter-chip-children';

const base = { gap: 8, overflowWidth: 32 };

describe('computeVisibleChipCount', () => {
  it('đủ chỗ thì hiện hết và không cần nút "…"', () => {
    // 100 + 8 + 100 = 208
    expect(computeVisibleChipCount({ ...base, chipWidths: [100, 100], available: 208 })).toBe(2);
  });

  it('thiếu 1px thì thu bớt và chừa chỗ cho nút "…"', () => {
    // 1 chip + gap + nút = 100 + 8 + 32 = 140 ≤ 207
    expect(computeVisibleChipCount({ ...base, chipWidths: [100, 100], available: 207 })).toBe(1);
  });

  it('chip vừa nhưng nút "…" không vừa thì thu thêm một chip', () => {
    // 2 chip = 208, nhưng còn chip thứ 3 nên cần + 8 + 32 = 248 > 230
    expect(computeVisibleChipCount({ ...base, chipWidths: [100, 100, 100], available: 230 })).toBe(1);
  });

  it('hẹp tới mức chỉ còn nút "…" ⇒ 0 chip', () => {
    expect(computeVisibleChipCount({ ...base, chipWidths: [100, 100], available: 40 })).toBe(0);
    expect(computeVisibleChipCount({ ...base, chipWidths: [100], available: 0 })).toBe(0);
  });

  it('trần cap giới hạn dù còn chỗ', () => {
    expect(computeVisibleChipCount({ ...base, chipWidths: [50, 50, 50], available: 9999, cap: 2 })).toBe(2);
  });

  it('không có chip ⇒ 0', () => {
    expect(computeVisibleChipCount({ ...base, chipWidths: [], available: 500 })).toBe(0);
  });
});

describe('orderChipsByPriority', () => {
  it('chip đang lọc lên trước, mỗi nhóm giữ thứ tự gốc', () => {
    const items = [
      { id: 'a', on: false },
      { id: 'b', on: true },
      { id: 'c', on: false },
      { id: 'd', on: true },
    ];
    expect(orderChipsByPriority(items, (x) => x.on).map((x) => x.id)).toEqual(['b', 'd', 'a', 'c']);
  });
});
