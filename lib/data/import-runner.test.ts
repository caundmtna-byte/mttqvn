import { describe, expect, it } from 'vitest';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { createImportRunner, mappedColumnsOf, pickMappedColumns } from './import-runner';

describe('pickMappedColumns', () => {
  it('chỉ giữ cột có trong file, kể cả giá trị rỗng', () => {
    const mapped = new Set(['ten', 'ghi_chu', 'xa_phuong']);
    expect(
      pickMappedColumns({ ten: 'A', ghi_chu: null, trang_thai: 'Mặc định', xa_phuong_id: 5 }, mapped, {
        xa_phuong_id: 'xa_phuong',
      }),
    ).toEqual({ ten: 'A', ghi_chu: null, xa_phuong_id: 5 });
  });

  it('mappedColumnsOf bỏ khoá số dòng', () => {
    expect([...mappedColumnsOf([{ a: '', [IMPORT_ROW_NUM_KEY]: 2 }, { b: 1 }])]).toEqual(['a', 'b']);
  });
});

describe('createImportRunner', () => {
  type R = { rowNum: number; raw: Record<string, unknown>; ma: string };
  const runner = (written: string[]) =>
    createImportRunner<null, { id: string; ma: string }, R>({
      maxRows: 10,
      keys: [{ key: 'ma', label: 'mã', unique: true, ofExisting: (e) => e.ma, ofRow: (r) => r.ma }],
      load: async () => ({ ctx: null, existing: [{ id: '1', ma: 'A' }] }),
      parseRow: (rowNum, raw) =>
        raw.ma ? { ok: true, data: { rowNum, raw, ma: String(raw.ma) } } : { ok: false, message: 'thiếu mã' },
      create: async (r) => void written.push(`c:${r.ma}`),
      update: async (id, r, mapped) => void written.push(`u:${id}:${r.ma}:${[...mapped].join('|')}`),
    });

  const rows = [
    { ma: 'A', ten: 'x', [IMPORT_ROW_NUM_KEY]: 2 },
    { ma: 'B', ten: 'y', [IMPORT_ROW_NUM_KEY]: 3 },
    { ma: '', ten: 'z', [IMPORT_ROW_NUM_KEY]: 4 },
  ];

  it('xem trước khớp đúng số sẽ ghi', async () => {
    const d = await runner([]).dryRun(rows, { mode: 'upsert', matchKeys: ['ma'] });
    expect(d).toMatchObject({ willCreate: 1, willUpdate: 1, willSkip: 1 });
  });

  it('ghi: dòng lỗi và dòng bỏ qua giữ dữ liệu gốc trong errorRows', async () => {
    const written: string[] = [];
    const r = await runner(written).run(rows, { mode: 'insert', matchKeys: ['ma'] });
    expect(written).toEqual(['c:B']);
    expect(r.errorRows?.map((e) => [e.rowNum, e.data.ten])).toEqual([
      [4, 'z'],
      [2, 'x'],
    ]);
  });

  it('ghi đè nhận danh sách cột có trong file', async () => {
    const written: string[] = [];
    await runner(written).run(rows.slice(0, 1), { mode: 'update', matchKeys: ['ma'] });
    expect(written).toEqual(['u:1:A:ma|ten']);
  });
});
