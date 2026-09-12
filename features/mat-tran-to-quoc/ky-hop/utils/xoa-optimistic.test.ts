import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { boDongTheoId, chupCache, hoanNguyenCache, xoaDongKhoiCache } from './xoa-optimistic';

interface Dong {
  id: string;
  ten: string;
}

const LIST_KEY = ['ds'] as const;

function dungCache() {
  const qc = new QueryClient();
  qc.setQueryData<Dong[]>(['ds'], [
    { id: '1', ten: 'A' },
    { id: '2', ten: 'B' },
    { id: '3', ten: 'C' },
  ]);
  qc.setQueryData<Dong[]>(['ds', 'by-nhiem-ky', 'nk-1'], [
    { id: '2', ten: 'B' },
    { id: '3', ten: 'C' },
  ]);
  qc.setQueryData<Dong[]>(['khac'], [{ id: '1', ten: 'A' }]);
  return qc;
}

describe('boDongTheoId', () => {
  const rows: Dong[] = [
    { id: '1', ten: 'A' },
    { id: '2', ten: 'B' },
  ];

  it('bỏ đúng dòng, giữ thứ tự dòng còn lại', () => {
    expect(boDongTheoId(rows, ['1'])).toEqual([{ id: '2', ten: 'B' }]);
  });

  it('không sửa mảng gốc', () => {
    boDongTheoId(rows, ['1']);
    expect(rows).toHaveLength(2);
  });

  it('danh sách id rỗng thì trả nguyên mảng cũ', () => {
    expect(boDongTheoId(rows, [])).toBe(rows);
  });

  it('id không tồn tại thì không bỏ nhầm dòng nào', () => {
    expect(boDongTheoId(rows, ['99'])).toHaveLength(2);
  });

  it('cache rỗng thì giữ nguyên undefined', () => {
    expect(boDongTheoId(undefined, ['1'])).toBeUndefined();
  });
});

describe('xoaDongKhoiCache', () => {
  it('bỏ dòng khỏi MỌI nhánh cache dưới cùng tiền tố khoá', () => {
    const qc = dungCache();
    xoaDongKhoiCache<Dong>(qc, LIST_KEY, ['2']);
    expect(qc.getQueryData<Dong[]>(['ds'])!.map((r) => r.id)).toEqual(['1', '3']);
    expect(qc.getQueryData<Dong[]>(['ds', 'by-nhiem-ky', 'nk-1'])!.map((r) => r.id)).toEqual(['3']);
  });

  it('không đụng nhánh cache ngoài tiền tố', () => {
    const qc = dungCache();
    xoaDongKhoiCache<Dong>(qc, LIST_KEY, ['1']);
    expect(qc.getQueryData<Dong[]>(['khac'])).toHaveLength(1);
  });

  it('xóa nhiều dòng một lần', () => {
    const qc = dungCache();
    xoaDongKhoiCache<Dong>(qc, LIST_KEY, ['1', '3']);
    expect(qc.getQueryData<Dong[]>(['ds'])!.map((r) => r.id)).toEqual(['2']);
  });
});

describe('hoanNguyenCache', () => {
  it('trả mọi nhánh về đúng trạng thái trước khi xóa', () => {
    const qc = dungCache();
    const truoc = qc.getQueryData(['ds']);
    const truocNk = qc.getQueryData(['ds', 'by-nhiem-ky', 'nk-1']);

    const snapshot = xoaDongKhoiCache<Dong>(qc, LIST_KEY, ['2', '3']);
    expect(qc.getQueryData<Dong[]>(['ds'])).toHaveLength(1);

    hoanNguyenCache(qc, snapshot);
    expect(qc.getQueryData(['ds'])).toEqual(truoc);
    expect(qc.getQueryData(['ds', 'by-nhiem-ky', 'nk-1'])).toEqual(truocNk);
  });

  it('snapshot rỗng thì không làm gì', () => {
    const qc = dungCache();
    expect(() => hoanNguyenCache(qc, undefined)).not.toThrow();
    expect(qc.getQueryData<Dong[]>(['ds'])).toHaveLength(3);
  });

  it('chupCache không tự sửa cache', () => {
    const qc = dungCache();
    chupCache(qc, LIST_KEY);
    expect(qc.getQueryData<Dong[]>(['ds'])).toHaveLength(3);
  });
});
