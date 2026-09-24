import { describe, expect, it } from 'vitest';
import { buildImportPlan, chuanHoaKhoaVanBan, ghepKhoa, type ImportKeySpec } from './import-plan';

type E = { id: string; cccd: string | null; ten: string; xa: string };
type R = { rowNum: number; id: string | null; cccd: string | null; ten: string; xa: string };

const KEYS: ImportKeySpec<E, R>[] = [
  { key: 'id', label: 'mã', unique: true, ofExisting: (e) => e.id, ofRow: (r) => r.id },
  { key: 'cccd', label: 'CCCD', unique: true, ofExisting: (e) => e.cccd, ofRow: (r) => r.cccd },
  {
    key: 'ten_xa',
    label: 'họ tên + xã',
    unique: false,
    ofExisting: (e) => ghepKhoa(chuanHoaKhoaVanBan(e.ten), e.xa),
    ofRow: (r) => ghepKhoa(chuanHoaKhoaVanBan(r.ten), r.xa),
  },
];

const existing: E[] = [
  { id: '1', cccd: '001', ten: 'Nguyễn A', xa: 'x1' },
  { id: '2', cccd: null, ten: 'Trần B', xa: 'x1' },
  { id: '3', cccd: null, ten: 'Trần B', xa: 'x1' },
];

const row = (rowNum: number, over: Partial<R> = {}): R => ({
  rowNum,
  id: null,
  cccd: null,
  ten: 'Mới',
  xa: 'x9',
  ...over,
});

const plan = (rows: R[], mode: 'insert' | 'upsert' | 'update', matchKeys: string[], canWrite?: (e: E) => boolean) =>
  buildImportPlan({ rows, existing, mode, matchKeys, keys: KEYS, canWrite });

describe('buildImportPlan', () => {
  it('insert: đụng khoá unique → bỏ qua; trùng khoá không unique vẫn thêm', () => {
    const p = plan([row(2, { cccd: '001' }), row(3, { ten: 'Trần B', xa: 'x1' })], 'insert', ['cccd']);
    expect(p.skips.map((s) => s.rowNum)).toEqual([2]);
    expect(p.creates.map((c) => c.rowNum)).toEqual([3]);
  });

  it('upsert theo CCCD: khớp → ghi đè, không khớp → thêm', () => {
    const p = plan([row(2, { cccd: '001' }), row(3, { cccd: '999' })], 'upsert', ['cccd']);
    expect(p.updates).toEqual([expect.objectContaining({ rowNum: 2, existingId: '1' })]);
    expect(p.creates.map((c) => c.rowNum)).toEqual([3]);
  });

  it('update: không khớp → bỏ qua', () => {
    const p = plan([row(2, { cccd: '999' })], 'update', ['cccd']);
    expect(p.skips.map((s) => s.rowNum)).toEqual([2]);
  });

  it('khoá không unique khớp nhiều bản ghi → lỗi, không đoán', () => {
    const p = plan([row(2, { ten: '  trần   b ', xa: 'x1' })], 'upsert', ['ten_xa']);
    expect(p.updates).toEqual([]);
    expect(p.errors[0].message).toContain('2 bản ghi');
  });

  it('upsert: không khớp khoá đã chọn nhưng đụng unique khoá khác → lỗi', () => {
    const p = plan([row(2, { cccd: '001', ten: 'X', xa: 'x5' })], 'upsert', ['ten_xa']);
    expect(p.errors.map((e) => e.rowNum)).toEqual([2]);
  });

  it('khớp theo id nhưng CCCD thuộc bản ghi khác → lỗi', () => {
    const p = plan([row(2, { id: '2', cccd: '001' })], 'update', ['id']);
    expect(p.errors.map((e) => e.rowNum)).toEqual([2]);
  });

  it('trùng khoá trong chính file → dòng sau lỗi', () => {
    const p = plan([row(2, { cccd: '777' }), row(3, { cccd: '777' })], 'insert', ['cccd']);
    expect(p.creates.map((c) => c.rowNum)).toEqual([2]);
    expect(p.errors[0].message).toContain('dòng 2');
  });

  it('hai dòng cùng trỏ một bản ghi → dòng sau lỗi', () => {
    const p = plan([row(2, { id: '1' }), row(3, { cccd: '001' })], 'upsert', ['id', 'cccd']);
    expect(p.updates.map((u) => u.rowNum)).toEqual([2]);
    expect(p.errors.map((e) => e.rowNum)).toEqual([3]);
  });

  it('bản ghi ngoài phạm vi ghi → lỗi', () => {
    const p = plan([row(2, { cccd: '001' })], 'upsert', ['cccd'], (e) => e.xa !== 'x1');
    expect(p.updates).toEqual([]);
    expect(p.errors.map((e) => e.rowNum)).toEqual([2]);
  });

  it('thứ tự khớp theo thứ tự khai báo khoá', () => {
    const p = plan([row(2, { id: '1', ten: 'Trần B', xa: 'x1' })], 'update', ['ten_xa', 'id']);
    expect(p.updates[0].existingId).toBe('1');
  });

  it('checkUpdate: luật riêng xét cả bản ghi cũ → lỗi ngay ở bước lập kế hoạch', () => {
    const p = buildImportPlan({
      rows: [row(2, { cccd: '001', xa: '' })],
      existing,
      mode: 'update',
      matchKeys: ['cccd'],
      keys: KEYS,
      checkUpdate: (e, r) => (e.xa && !r.xa ? 'không được xoá xã' : null),
    });
    expect(p.updates).toEqual([]);
    expect(p.errors[0].message).toContain('không được xoá xã');
  });
});
