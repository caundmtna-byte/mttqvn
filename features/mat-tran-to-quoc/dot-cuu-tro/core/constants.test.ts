import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DOT_LOAI_VALUES, DOT_TRANG_THAI_VALUES } from './constants';

const schema = readFileSync(resolve(__dirname, '../../../../supabase/schema.sql'), 'utf8');

/** Giá trị trong `CHECK (<cot> = ANY (ARRAY['a'::text, …]))` của một constraint. */
function checkValues(constraint: string): string[] {
  const line = schema.split('\n').find((l) => l.includes(`CONSTRAINT ${constraint} CHECK`));
  if (!line) throw new Error(`Không thấy ${constraint} trong schema.sql`);
  return [...line.matchAll(/'([^']+)'::text/g)].map((m) => m[1]);
}

describe('Chương trình vận động — hằng số khớp CHECK dưới DB', () => {
  it('loại', () => {
    expect(checkValues('kho_dot_cuu_tro_loai_chk')).toEqual([...DOT_LOAI_VALUES]);
  });
  it('trạng thái', () => {
    expect(checkValues('kho_dot_cuu_tro_trang_thai_chk')).toEqual([...DOT_TRANG_THAI_VALUES]);
  });
});
