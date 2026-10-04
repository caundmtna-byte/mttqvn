import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TN_HINH_THUC_VALUES, TN_MUC_DICH_VALUES, TN_PHU_LUC_MAX, TN_TRANG_THAI_VALUES } from './constants';

const schema = readFileSync(resolve(__dirname, '../../../../supabase/schema.sql'), 'utf8');

function constraintText(name: string): string {
  const i = schema.indexOf(`CONSTRAINT ${name} CHECK`);
  if (i < 0) throw new Error(`Không thấy ${name} trong schema.sql`);
  return schema.slice(i, schema.indexOf('\n', i));
}
const values = (name: string) => [...constraintText(name).matchAll(/'([^']+)'::text/g)].map((m) => m[1]);

describe('Tiếp nhận — hằng số khớp CHECK dưới DB', () => {
  it('hình thức', () => expect(values('tn_hinh_thuc_chk')).toEqual([...TN_HINH_THUC_VALUES]));
  it('trạng thái', () => expect(values('tn_trang_thai_chk')).toEqual([...TN_TRANG_THAI_VALUES]));
  it('mục đích', () => expect(values('tn_muc_dich_chk')).toEqual([...TN_MUC_DICH_VALUES]));
  it('số dòng phụ lục tối đa', () => expect(constraintText('tn_phu_luc_chk')).toContain(`<= ${TN_PHU_LUC_MAX}`));
});
