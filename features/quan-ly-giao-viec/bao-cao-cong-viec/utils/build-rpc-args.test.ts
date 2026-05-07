import { describe, expect, it } from 'vitest';
import {
  buildTaskReportRpcArgs,
  isNonDefaultTaskReportDateRange,
  resolveTaskReportDateRange,
  TASK_REPORT_ALL_RANGE_START,
} from './build-rpc-args';
import type { TaskReportFilters } from '../core/types';

describe('resolveTaskReportDateRange', () => {
  it('thisMonth', () => {
    const now = new Date('2026-05-15T08:00:00Z');
    const r = resolveTaskReportDateRange('thisMonth', '', '', now);
    expect(r.start).toBe('2026-05-01');
    expect(r.end).toBe('2026-05-15');
  });

  it('all → từ ngày sàn đến hôm nay', () => {
    const now = new Date('2026-05-15T08:00:00Z');
    const r = resolveTaskReportDateRange('all', '', '', now);
    expect(r.start).toBe(TASK_REPORT_ALL_RANGE_START);
    expect(r.end).toBe('2026-05-15');
  });

  it('unknown preset → all (fallback)', () => {
    const now = new Date('2026-05-15T08:00:00Z');
    const r = resolveTaskReportDateRange('typo', '', '', now);
    expect(r.start).toBe(TASK_REPORT_ALL_RANGE_START);
    expect(r.end).toBe('2026-05-15');
  });

  it('thisQuarter resolves to quarter start', () => {
    const now = new Date('2026-05-15T08:00:00Z');
    const r = resolveTaskReportDateRange('thisQuarter', '', '', now);
    expect(r.start).toBe('2026-04-01');
    expect(r.end).toBe('2026-05-15');
  });

  it('thisYear resolves to Jan 1', () => {
    const now = new Date('2026-05-15T08:00:00Z');
    const r = resolveTaskReportDateRange('thisYear', '', '', now);
    expect(r.start).toBe('2026-01-01');
    expect(r.end).toBe('2026-05-15');
  });

  it('thisWeek resolves to ISO Monday', () => {
    const now = new Date('2026-05-15T08:00:00Z'); // Friday
    const r = resolveTaskReportDateRange('thisWeek', '', '', now);
    expect(r.start).toBe('2026-05-11'); // Monday
    expect(r.end).toBe('2026-05-15');
  });

  it('custom swaps start > end', () => {
    const now = new Date('2026-05-15T08:00:00Z');
    const r = resolveTaskReportDateRange('custom', '2026-05-20', '2026-05-10', now);
    expect(r.start).toBe('2026-05-10');
    expect(r.end).toBe('2026-05-20');
  });

  it('custom keeps start <= end', () => {
    const now = new Date('2026-05-15T08:00:00Z');
    const r = resolveTaskReportDateRange('custom', '2026-05-10', '2026-05-20', now);
    expect(r.start).toBe('2026-05-10');
    expect(r.end).toBe('2026-05-20');
  });

  it('custom defaults to today when empty', () => {
    const now = new Date('2026-05-15T08:00:00Z');
    const r = resolveTaskReportDateRange('custom', '', '', now);
    expect(r.start).toBe('2026-05-15');
    expect(r.end).toBe('2026-05-15');
  });
});

describe('buildTaskReportRpcArgs', () => {
  const baseFilters: TaskReportFilters = {
    range: { start: '2026-05-01', end: '2026-05-31' },
    idTrachNhiem: [],
    idNguoiTao: [],
    trangThai: [],
    mucDo: [],
    overdueOnly: false,
  };

  it('empty arrays → null (Postgres bỏ qua filter)', () => {
    const args = buildTaskReportRpcArgs(baseFilters);
    expect(args.p_start).toBe('2026-05-01');
    expect(args.p_end).toBe('2026-05-31');
    expect(args.p_id_trach_nhiem).toBeNull();
    expect(args.p_id_nguoi_tao).toBeNull();
    expect(args.p_trang_thai).toBeNull();
    expect(args.p_muc_do).toBeNull();
    expect(args.p_overdue_only).toBe(false);
  });

  it('parses string ids → bigint number array', () => {
    const args = buildTaskReportRpcArgs({
      ...baseFilters,
      idTrachNhiem: ['1', '2', '99'],
      idNguoiTao: ['7'],
    });
    expect(args.p_id_trach_nhiem).toEqual([1, 2, 99]);
    expect(args.p_id_nguoi_tao).toEqual([7]);
  });

  it('drops invalid ids and returns null when none valid', () => {
    const args = buildTaskReportRpcArgs({ ...baseFilters, idTrachNhiem: ['abc', 'NaN'] });
    expect(args.p_id_trach_nhiem).toBeNull();
  });

  it('passes enum arrays as-is', () => {
    const args = buildTaskReportRpcArgs({
      ...baseFilters,
      trangThai: ['Mới', 'Hoàn thành'],
      mucDo: ['Khẩn'],
    });
    expect(args.p_trang_thai).toEqual(['Mới', 'Hoàn thành']);
    expect(args.p_muc_do).toEqual(['Khẩn']);
  });

  it('honors overdueOnly flag', () => {
    const args = buildTaskReportRpcArgs({ ...baseFilters, overdueOnly: true });
    expect(args.p_overdue_only).toBe(true);
  });
});

describe('isNonDefaultTaskReportDateRange', () => {
  it('all (mặc định) → false', () => {
    expect(isNonDefaultTaskReportDateRange({ preset: 'all', customStart: '', customEnd: '' })).toBe(
      false,
    );
  });

  it('thisMonth → true', () => {
    expect(
      isNonDefaultTaskReportDateRange({ preset: 'thisMonth', customStart: '', customEnd: '' }),
    ).toBe(true);
  });

  it('thisYear → true', () => {
    expect(
      isNonDefaultTaskReportDateRange({ preset: 'thisYear', customStart: '', customEnd: '' }),
    ).toBe(true);
  });

  it('custom with both filled → true', () => {
    expect(
      isNonDefaultTaskReportDateRange({
        preset: 'custom',
        customStart: '2026-01-01',
        customEnd: '2026-01-31',
      }),
    ).toBe(true);
  });

  it('custom with empty fields → false', () => {
    expect(
      isNonDefaultTaskReportDateRange({ preset: 'custom', customStart: '', customEnd: '' }),
    ).toBe(false);
  });
});
