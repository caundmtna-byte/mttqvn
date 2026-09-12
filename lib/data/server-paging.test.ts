import { describe, expect, it } from 'vitest';
import {
  buildRpcSortParam,
  fetchAllServerPages,
  readRpcTotalCount,
} from './server-paging';

const ALLOWED = ['ten_bai', 'don_gia', 'ngay_dang'] as const;

describe('buildRpcSortParam', () => {
  it('ghép cột + hướng khi cột nằm trong whitelist', () => {
    expect(buildRpcSortParam({ column: 'don_gia', direction: 'desc' }, ALLOWED)).toBe('don_gia_desc');
    expect(buildRpcSortParam({ column: 'ten_bai', direction: 'asc' }, ALLOWED)).toBe('ten_bai_asc');
  });

  it('trả null khi chưa chọn sắp xếp', () => {
    expect(buildRpcSortParam(null, ALLOWED)).toBeNull();
    expect(buildRpcSortParam(undefined, ALLOWED)).toBeNull();
    expect(buildRpcSortParam({ column: null, direction: null }, ALLOWED)).toBeNull();
    expect(buildRpcSortParam({ column: 'don_gia', direction: null }, ALLOWED)).toBeNull();
    expect(buildRpcSortParam({ column: null, direction: 'asc' }, ALLOWED)).toBeNull();
  });

  it('bỏ qua cột ngoài whitelist thay vì gửi lên DB', () => {
    expect(buildRpcSortParam({ column: 'ho_tro_display', direction: 'asc' }, ALLOWED)).toBeNull();
  });

  it('không cho chuỗi lạ lọt xuống tham số RPC', () => {
    expect(
      buildRpcSortParam({ column: "id; DROP TABLE bai_viet_danh_sach --", direction: 'asc' }, ALLOWED),
    ).toBeNull();
  });
});

describe('readRpcTotalCount', () => {
  it('lấy tổng từ dòng đầu tiên', () => {
    expect(readRpcTotalCount([{ id: 1, total_count: 542 }, { id: 2, total_count: 542 }])).toBe(542);
  });

  it('chấp nhận tổng dạng chuỗi (bigint qua PostgREST)', () => {
    expect(readRpcTotalCount([{ id: 1, total_count: '542' }])).toBe(542);
  });

  it('trang rỗng ⇒ null, không đoán bừa', () => {
    expect(readRpcTotalCount([])).toBeNull();
  });

  it('thiếu cột total_count ⇒ null', () => {
    expect(readRpcTotalCount([{ id: 1 }])).toBeNull();
  });
});

describe('fetchAllServerPages', () => {
  /** Giả lập service phân trang server trên `total` dòng. */
  function makeService(total: number) {
    const calls: Array<{ page: number; pageSize: number }> = [];
    const fetchPage = async (q: { page: number; pageSize: number }) => {
      calls.push({ page: q.page, pageSize: q.pageSize });
      const start = (q.page - 1) * q.pageSize;
      const rows: number[] = [];
      for (let i = start; i < Math.min(start + q.pageSize, total); i += 1) rows.push(i);
      return { rows, hasNextPage: start + rows.length < total, totalRecords: total };
    };
    return { fetchPage, calls };
  }

  it('kéo đủ mọi dòng qua nhiều lô', async () => {
    const { fetchPage, calls } = makeService(1_250);
    const rows = await fetchAllServerPages({ scope: 'all' }, fetchPage, { batchSize: 500 });
    expect(rows).toHaveLength(1_250);
    expect(calls.map((c) => c.page)).toEqual([1, 2, 3]);
  });

  it('KHÔNG cắt: 10.000 dòng phải xuất đủ 10.000', async () => {
    const { fetchPage } = makeService(10_000);
    await expect(
      fetchAllServerPages({}, fetchPage, { batchSize: 500 }),
    ).resolves.toHaveLength(10_000);
  });

  it('giữ nguyên bộ lọc ở mọi lô', async () => {
    const seen: unknown[] = [];
    const fetchPage = async (q: { page: number; pageSize: number; scope?: string }) => {
      seen.push(q.scope);
      return { rows: q.page === 1 ? [1] : [], hasNextPage: false, totalRecords: 1 };
    };
    await fetchAllServerPages({ scope: 'mine' }, fetchPage, { batchSize: 1 });
    expect(seen).toEqual(['mine']);
  });

  it('vượt ngưỡng an toàn thì ném lỗi, không xuất file thiếu dòng', async () => {
    const { fetchPage } = makeService(5_000);
    await expect(
      fetchAllServerPages({}, fetchPage, { batchSize: 500, safetyLimit: 1_000 }),
    ).rejects.toThrow(/ngưỡng an toàn/);
  });

  it('không có dòng nào ⇒ mảng rỗng', async () => {
    const { fetchPage, calls } = makeService(0);
    await expect(fetchAllServerPages({}, fetchPage, { batchSize: 500 })).resolves.toEqual([]);
    expect(calls).toHaveLength(1);
  });
});
