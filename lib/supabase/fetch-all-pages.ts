/** PostgREST/Supabase mặc định tối đa 1000 dòng/request — loop đến hết. */
export const SUPABASE_PAGE_SIZE = 1000;

/**
 * Gọi `fetchPage(from, to)` lặp `.range(from, to)` đến khi chunk < pageSize.
 */
export async function fetchAllPages<T>(
  fetchPage: (from: number, to: number) => Promise<T[]>,
  pageSize = SUPABASE_PAGE_SIZE,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + pageSize - 1;
    const chunk = await fetchPage(from, to);
    out.push(...chunk);
    if (chunk.length < pageSize) break;
    from += pageSize;
  }
  return out;
}
