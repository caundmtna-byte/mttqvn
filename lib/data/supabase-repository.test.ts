// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Chống ghi đè đồng thời: hai cán bộ mở cùng một hồ sơ, người lưu sau không
 * được lặng lẽ đè mất công sức của người lưu trước.
 *
 * Test này giả lập tầng PostgREST bằng một chuỗi builder tối thiểu, đủ để
 * khẳng định: có `expectedTgCapNhat` thì `update` phải kèm điều kiện
 * `.eq('tg_cap_nhat', …)`, và khi không ghi được dòng nào thì câu báo lỗi phải
 * phân biệt "người khác vừa sửa" với "bản ghi đã bị xoá".
 */

type Ket = { data: unknown; error: null };

const goiEq: Array<[string, unknown]> = [];
let ketQuaUpdate: Ket = { data: { id: '1' }, error: null };
/** Bản ghi có còn tồn tại không — dùng cho nhánh phân biệt câu lỗi. */
let banGhiConTonTai = true;

function taoBuilderUpdate() {
  const b: Record<string, unknown> = {};
  b.eq = (col: string, val: unknown) => {
    goiEq.push([col, val]);
    return b;
  };
  b.select = () => b;
  b.maybeSingle = () => Promise.resolve(ketQuaUpdate);
  return b;
}

function taoBuilderSelect() {
  const b: Record<string, unknown> = {};
  b.select = () => b;
  b.eq = () => b;
  b.maybeSingle = () =>
    Promise.resolve({ data: banGhiConTonTai ? { id: '1' } : null, error: null });
  return b;
}

vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({
    from: () => ({
      update: () => taoBuilderUpdate(),
      select: () => (taoBuilderSelect().select as () => unknown)(),
    }),
  }),
}));

const { SupabaseRepository } = await import('./supabase-repository');

function repo() {
  return new SupabaseRepository<{ id: string; ten: string }>('var_phong_ban' as never);
}

beforeEach(() => {
  goiEq.length = 0;
  ketQuaUpdate = { data: { id: '1', ten: 'A' }, error: null };
  banGhiConTonTai = true;
});

describe('SupabaseRepository.update — chống ghi đè đồng thời', () => {
  it('không truyền mốc thời gian ⇒ giữ hành vi cũ, chỉ lọc theo id', async () => {
    await repo().update('1', { ten: 'A' });
    expect(goiEq).toEqual([['id', '1']]);
  });

  it('có mốc thời gian ⇒ thêm điều kiện tg_cap_nhat', async () => {
    await repo().update('1', { ten: 'A' }, { expectedTgCapNhat: '2026-09-11T08:00:00Z' });
    expect(goiEq).toEqual([
      ['id', '1'],
      ['tg_cap_nhat', '2026-09-11T08:00:00Z'],
    ]);
  });

  it('mốc lệch mà bản ghi VẪN còn ⇒ báo "người khác vừa sửa"', async () => {
    ketQuaUpdate = { data: null, error: null };
    banGhiConTonTai = true;
    await expect(
      repo().update('1', { ten: 'A' }, { expectedTgCapNhat: 'cu' }),
    ).rejects.toThrow(/người khác sửa/i);
  });

  it('mốc lệch và bản ghi đã bị xoá ⇒ báo đúng là đã bị xoá', async () => {
    ketQuaUpdate = { data: null, error: null };
    banGhiConTonTai = false;
    await expect(
      repo().update('1', { ten: 'A' }, { expectedTgCapNhat: 'cu' }),
    ).rejects.toThrow(/đã bị người khác xoá/i);
  });

  it('không có mốc mà vẫn không ghi được dòng nào ⇒ báo bản ghi không còn', async () => {
    ketQuaUpdate = { data: null, error: null };
    await expect(repo().update('1', { ten: 'A' })).rejects.toThrow(/Không tìm thấy bản ghi/i);
  });
});
