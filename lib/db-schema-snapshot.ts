import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Đọc `supabase/schema.sql` — bản chụp cấu trúc DB thật (`npm run db:schema`).
 * CHỈ dùng trong test đối chiếu luật client ↔ CHECK / trigger dưới DB.
 * Migration cũ đã xoá khỏi repo, nên đây là nguồn duy nhất để so.
 */
let cache: string | null = null;

export function docSchemaSql(): string {
  cache ??= readFileSync(resolve(__dirname, '../supabase/schema.sql'), 'utf8');
  return cache;
}

/** Khối `CREATE TABLE public.<bang> ( … );` trong bản chụp. */
function khoiBang(bang: string): string {
  const sql = docSchemaSql();
  const dau = sql.indexOf(`CREATE TABLE public.${bang} (`);
  if (dau < 0) throw new Error(`Không thấy bảng ${bang} trong supabase/schema.sql`);
  return sql.slice(dau, sql.indexOf('\n);', dau));
}

/**
 * Danh sách giá trị của CHECK dạng `cot = ANY (ARRAY['a'::text, …])` trên bảng
 * — đúng thứ tự khai báo. pg_dump luôn viết `IN (…)` thành dạng này.
 */
export function checkValuesTrongSchema(bang: string, cot: string): string[] {
  const m = khoiBang(bang).match(new RegExp(`\\(${cot} = ANY \\(ARRAY\\[([^\\]]*)\\]`));
  if (!m) throw new Error(`Không thấy CHECK của ${bang}.${cot} trong supabase/schema.sql`);
  return [...m[1].matchAll(/'([^']+)'::text/g)].map((x) => x[1]);
}

/** Thân hàm `CREATE FUNCTION public.<ten>(…)` — giữ nguyên chữ như lúc tạo. */
export function thanHamTrongSchema(ten: string): string {
  const sql = docSchemaSql();
  const dau = sql.indexOf(`CREATE FUNCTION public.${ten}(`);
  if (dau < 0) throw new Error(`Không thấy hàm ${ten} trong supabase/schema.sql`);
  return sql.slice(dau, sql.indexOf('\n$$;', dau));
}
