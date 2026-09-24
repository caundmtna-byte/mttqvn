import { describe, expect, it } from 'vitest';
import type { BaiVietDanhSach } from '../core/types';
import { buildBaiVietImportPlan } from './bai-viet-import-plan';
import type { BaiVietImportRow } from './bai-viet-import-row';

const existingRow = (over: Partial<BaiVietDanhSach>): BaiVietDanhSach => ({
  id: 'e1',
  ten_bai: 'Bài cũ',
  id_the_loai: '1',
  ten_the_loai: 'Tin',
  don_gia: 30_000,
  ngay_dang: '2026-05-01',
  id_nguon_dang: '10',
  ten_nguon_dang: 'Biên tập',
  id_trang_dang: '20',
  ten_trang_dang: 'Zalo',
  link: 'https://example.test/cu',
  id_nguoi_tao: '77',
  ho_va_ten_nguoi_tao: 'NV',
  ten_tai_khoan_nguoi_tao: null,
  tg_tao: '2026-05-01T00:00:00.000Z',
  tg_cap_nhat: '2026-05-01T00:00:00.000Z',
  ...over,
});

const importRow = (rowNum: number, tenBai: string, link: string): BaiVietImportRow => ({
  rowNum,
  raw: {},
  idKey: null,
  values: {
    ten_bai: tenBai,
    id_the_loai: '1',
    don_gia: 30_000,
    ngay_dang: '2026-05-02',
    id_nguon_dang: '10',
    id_trang_dang: '20',
    link,
  },
  idNguoiTao: '77',
  linkKey: link.trim().toLowerCase(),
  tenBaiKey: tenBai.trim().replace(/\s+/g, ' ').toLowerCase(),
});

const existing = [existingRow({ id: 'e1' })];
const BOTH_KEYS = ['link', 'ten_bai'];

describe('buildBaiVietImportPlan', () => {
  describe('chế độ chỉ thêm mới', () => {
    it('dòng chưa có → thêm mới', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'Bài mới', 'https://example.test/moi')],
        existing,
        mode: 'insert',
        matchKeys: BOTH_KEYS,
      });
      expect(p.creates.map((c) => c.rowNum)).toEqual([2]);
      expect(p.skips).toEqual([]);
    });

    it('trùng link → bỏ qua, không phải lỗi', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'Tên khác hẳn', 'https://example.test/cu')],
        existing,
        mode: 'insert',
        matchKeys: BOTH_KEYS,
      });
      expect(p.creates).toEqual([]);
      expect(p.skips.map((s) => s.rowNum)).toEqual([2]);
      expect(p.errors).toEqual([]);
    });

    it('trùng tên bài → cũng bỏ qua, dù chỉ chọn khoá link', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'bài cũ', 'https://example.test/moi')],
        existing,
        mode: 'insert',
        matchKeys: ['link'],
      });
      expect(p.skips.map((s) => s.rowNum)).toEqual([2]);
    });
  });

  describe('chế độ thêm mới và ghi đè', () => {
    it('trùng link → ghi đè đúng bản ghi', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'Tên mới', 'https://example.test/cu')],
        existing,
        mode: 'upsert',
        matchKeys: BOTH_KEYS,
      });
      expect(p.updates).toHaveLength(1);
      expect(p.updates[0]).toMatchObject({ rowNum: 2, existingId: 'e1' });
      expect(p.creates).toEqual([]);
    });

    it('không trùng → thêm mới', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'Bài mới', 'https://example.test/moi')],
        existing,
        mode: 'upsert',
        matchKeys: BOTH_KEYS,
      });
      expect(p.creates.map((c) => c.rowNum)).toEqual([2]);
      expect(p.updates).toEqual([]);
    });

    it('khớp theo link nhưng tên bài đã thuộc bài khác → lỗi ngay, không để DB trả 23505', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'Bài B', 'https://example.test/a')],
        existing: [
          existingRow({ id: 'theo-link', link: 'https://example.test/a', ten_bai: 'Bài A' }),
          existingRow({ id: 'theo-ten', link: 'https://example.test/b', ten_bai: 'Bài B' }),
        ],
        mode: 'upsert',
        matchKeys: BOTH_KEYS,
      });
      expect(p.updates).toEqual([]);
      expect(p.errors.map((e) => e.rowNum)).toEqual([2]);
    });

    it('link ưu tiên hơn tên bài khi cả hai cùng trỏ một bài', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'Bài A', 'https://example.test/a')],
        existing: [existingRow({ id: 'theo-link', link: 'https://example.test/a', ten_bai: 'Bài A' })],
        mode: 'upsert',
        matchKeys: BOTH_KEYS,
      });
      expect(p.updates[0].existingId).toBe('theo-link');
    });

    it('chỉ chọn khoá tên bài thì khớp theo tên', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'BÀI   CŨ', 'https://example.test/moi')],
        existing,
        mode: 'upsert',
        matchKeys: ['ten_bai'],
      });
      expect(p.updates[0].existingId).toBe('e1');
    });

    it('đụng bản ghi cũ ở khoá KHÔNG được chọn → báo lỗi thay vì thêm mới chắc hỏng', () => {
      const p = buildBaiVietImportPlan({
        // Khớp tên bài cũ nhưng chỉ chọn khoá link → nếu thêm mới sẽ vi phạm
        // unique lower(ten_bai) dưới DB.
        rows: [importRow(2, 'Bài cũ', 'https://example.test/moi')],
        existing,
        mode: 'upsert',
        matchKeys: ['link'],
      });
      expect(p.creates).toEqual([]);
      expect(p.errors.map((e) => e.rowNum)).toEqual([2]);
    });
  });

  describe('chế độ chỉ cập nhật', () => {
    it('trùng → ghi đè', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'Tên mới', 'https://example.test/cu')],
        existing,
        mode: 'update',
        matchKeys: BOTH_KEYS,
      });
      expect(p.updates.map((u) => u.rowNum)).toEqual([2]);
    });

    it('không trùng → bỏ qua, tuyệt đối không thêm mới', () => {
      const p = buildBaiVietImportPlan({
        rows: [importRow(2, 'Bài mới', 'https://example.test/moi')],
        existing,
        mode: 'update',
        matchKeys: BOTH_KEYS,
      });
      expect(p.creates).toEqual([]);
      expect(p.skips.map((s) => s.rowNum)).toEqual([2]);
    });
  });

  describe('trùng trong chính file', () => {
    it('hai dòng cùng link → dòng sau báo lỗi kèm số dòng trước', () => {
      const p = buildBaiVietImportPlan({
        rows: [
          importRow(2, 'Bài A', 'https://example.test/x'),
          importRow(3, 'Bài B', 'https://example.test/x'),
        ],
        existing: [],
        mode: 'insert',
        matchKeys: BOTH_KEYS,
      });
      expect(p.creates.map((c) => c.rowNum)).toEqual([2]);
      expect(p.errors.map((e) => e.rowNum)).toEqual([3]);
      expect(p.errors[0].message).toContain('dòng 2');
    });

    it('hai dòng cùng tên bài → dòng sau báo lỗi', () => {
      const p = buildBaiVietImportPlan({
        rows: [
          importRow(2, 'Bài A', 'https://example.test/1'),
          importRow(3, 'bài a', 'https://example.test/2'),
        ],
        existing: [],
        mode: 'insert',
        matchKeys: BOTH_KEYS,
      });
      expect(p.errors.map((e) => e.rowNum)).toEqual([3]);
    });

    it('hai dòng cùng ghi đè một bài đã có → dòng sau báo lỗi, bài chỉ bị ghi một lần', () => {
      const p = buildBaiVietImportPlan({
        rows: [
          importRow(2, 'Bài cũ', 'https://example.test/khac'),
          importRow(3, 'Tên khác', 'https://example.test/cu'),
        ],
        existing,
        mode: 'upsert',
        matchKeys: BOTH_KEYS,
      });
      expect(p.updates).toHaveLength(1);
      expect(p.updates[0].rowNum).toBe(2);
      expect(p.errors.map((e) => e.rowNum)).toEqual([3]);
    });
  });

  it('file rỗng → kế hoạch rỗng', () => {
    const p = buildBaiVietImportPlan({ rows: [], existing, mode: 'upsert', matchKeys: BOTH_KEYS });
    expect(p).toEqual({ creates: [], updates: [], skips: [], errors: [] });
  });
});
