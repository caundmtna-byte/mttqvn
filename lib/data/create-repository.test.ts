import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

const mockGetAll = vi.fn().mockResolvedValue([{ id: '1', name: 'A' }]);

vi.mock('./supabase-repository', () => ({
  SupabaseRepository: class {
    getAll = mockGetAll;
  },
}));

describe('createRepository', () => {
  beforeEach(() => {
    vi.resetModules();
    mockGetAll.mockClear();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns SupabaseRepository that delegates getAll', async () => {
    const { createRepository } = await import('./create-repository');
    type Row = { id: string; name: string };
    const repo = createRepository<Row>({
      tableName: 'var_nhan_vien',
    });
    const rows = await repo.getAll();
    expect(mockGetAll).toHaveBeenCalledOnce();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('A');
  });
});
