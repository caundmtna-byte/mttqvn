import { describe, expect, it, vi } from 'vitest';
import { fetchAllPages, SUPABASE_PAGE_SIZE } from '../fetch-all-pages';

describe('fetchAllPages', () => {
  it('returns empty when first page is empty', async () => {
    const fetchPage = vi.fn().mockResolvedValue([]);
    await expect(fetchAllPages(fetchPage)).resolves.toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(fetchPage).toHaveBeenCalledWith(0, SUPABASE_PAGE_SIZE - 1);
  });

  it('loops until chunk smaller than page size', async () => {
    const fetchPage = vi.fn(async (from: number, to: number) => {
      const size = to - from + 1;
      if (from === 0) return Array.from({ length: size }, (_, i) => i);
      if (from === SUPABASE_PAGE_SIZE) return Array.from({ length: size }, (_, i) => i + SUPABASE_PAGE_SIZE);
      return Array.from({ length: 500 }, (_, i) => i + 2 * SUPABASE_PAGE_SIZE);
    });
    const all = await fetchAllPages(fetchPage);
    expect(all).toHaveLength(SUPABASE_PAGE_SIZE + SUPABASE_PAGE_SIZE + 500);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  it('respects custom pageSize', async () => {
    const fetchPage = vi.fn(async (from: number, to: number) => {
      if (from === 0) return [1, 2, 3];
      return [];
    });
    await fetchAllPages(fetchPage, 3);
    expect(fetchPage).toHaveBeenCalledWith(0, 2);
  });
});
