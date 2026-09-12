import { describe, expect, it, vi } from 'vitest';
import {
  fetchAllPages,
  FETCH_ALL_PAGES_SAFETY_LIMIT,
  FETCH_ALL_PAGES_WARN_AT,
} from './fetch-all-pages';

/** Giả lập một bảng có `total` dòng; trả đúng lát cắt [from, to]. */
function makeTable(total: number) {
  const calls: Array<[number, number]> = [];
  const fetchPage = async (from: number, to: number) => {
    calls.push([from, to]);
    const rows: number[] = [];
    for (let i = from; i <= Math.min(to, total - 1); i += 1) rows.push(i);
    return rows;
  };
  return { fetchPage, calls };
}

describe('fetchAllPages', () => {
  it('lấy hết khi bảng nhỏ hơn một trang', async () => {
    const { fetchPage, calls } = makeTable(120);
    await expect(fetchAllPages(fetchPage, 1000)).resolves.toHaveLength(120);
    expect(calls).toEqual([[0, 999]]);
  });

  it('lặp qua nhiều trang cho tới hết', async () => {
    const { fetchPage, calls } = makeTable(2500);
    await expect(fetchAllPages(fetchPage, 1000)).resolves.toHaveLength(2500);
    expect(calls).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it('KHÔNG cắt dữ liệu: 10.000 dòng phải về đủ 10.000', async () => {
    const { fetchPage } = makeTable(10_000);
    await expect(fetchAllPages(fetchPage, 1000)).resolves.toHaveLength(10_000);
  });

  it('bảng lớn vẫn về đủ, chỉ ghi cảnh báo', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fetchPage } = makeTable(FETCH_ALL_PAGES_WARN_AT + 500);
    const rows = await fetchAllPages(fetchPage, { pageSize: 1000, label: 'kho_nhap_xuat_kho_ct' });
    expect(rows).toHaveLength(FETCH_ALL_PAGES_WARN_AT + 500);
    expect(warn.mock.calls[0]?.[0]).toContain('kho_nhap_xuat_kho_ct');
    warn.mockRestore();
  });

  it('không cảnh báo với bảng cỡ thường', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fetchPage } = makeTable(3_000);
    await expect(fetchAllPages(fetchPage, 1000)).resolves.toHaveLength(3_000);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('vượt ngưỡng an toàn thì NÉM LỖI, không trả về một phần', async () => {
    const { fetchPage } = makeTable(5_000);
    await expect(
      fetchAllPages(fetchPage, { pageSize: 1000, safetyLimit: 2_000, label: 'bang_test' }),
    ).rejects.toThrow(/bang_test.*ngưỡng an toàn/s);
  });

  it('ngưỡng an toàn mặc định rất cao, không chạm với dữ liệu thật', () => {
    expect(FETCH_ALL_PAGES_SAFETY_LIMIT).toBeGreaterThanOrEqual(100_000);
  });

  it('bảng rỗng ⇒ mảng rỗng, một request', async () => {
    const { fetchPage, calls } = makeTable(0);
    await expect(fetchAllPages(fetchPage, 1000)).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });
});
