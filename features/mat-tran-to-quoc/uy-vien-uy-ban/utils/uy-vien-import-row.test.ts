import { describe, it, expect } from 'vitest';
import {
  parseUyVienImportRow,
  resolveCanBoImport,
  uyVienImportPayload,
  uyVienMappedDbColumns,
  type UyVienImportRowCtx,
} from './uy-vien-import-row';

const ctx: UyVienImportRowCtx = {
  nhiemKy: [
    { id: '1', ten: 'Nhiệm kỳ 2024-2029' },
    { id: '2', ten: 'Nhiệm kỳ 2019-2024' },
    { id: '3', ten: 'Nhiệm kỳ 2019-2024' },
  ],
  xaPhuong: [{ id: '50', ten: 'Phường Hà Huy Tập' }],
  canBo: [
    { id: '10', ho_ten: 'Nguyễn Văn An', ngay_sinh: '1980-01-02' },
    { id: '11', ho_ten: 'Nguyễn Văn An', ngay_sinh: '1990-05-06' },
    { id: '12', ho_ten: 'Trần Thị Bình', ngay_sinh: null },
  ],
};

describe('resolveCanBoImport', () => {
  it('ô ID thắng họ tên; ID không tồn tại ⇒ lỗi, không lùi sang họ tên', () => {
    expect(resolveCanBoImport(ctx.canBo, { can_bo_id: '12', ho_va_ten: 'Nguyễn Văn An' })).toEqual({ ok: true, id: '12' });
    expect(resolveCanBoImport(ctx.canBo, { can_bo_id: '99', ho_va_ten: 'Trần Thị Bình' })).toEqual({
      ok: false,
      reason: 'missing_id',
    });
  });

  it('trùng họ tên ⇒ ngày sinh phân biệt; thiếu ngày sinh ⇒ ambiguous', () => {
    expect(resolveCanBoImport(ctx.canBo, { ho_va_ten: 'nguyen van an', ngay_sinh: '06/05/1990' })).toEqual({
      ok: true,
      id: '11',
    });
    expect(resolveCanBoImport(ctx.canBo, { ho_va_ten: 'Nguyễn Văn An' })).toEqual({ ok: false, reason: 'ambiguous' });
  });

  it('khớp nguyên vẹn, không khớp chuỗi con', () => {
    expect(resolveCanBoImport(ctx.canBo, { ho_va_ten: 'Văn An' })).toEqual({ ok: false, reason: 'missing' });
    // Hồ sơ chưa có ngày sinh vẫn khớp khi file có ngày sinh.
    expect(resolveCanBoImport(ctx.canBo, { ho_va_ten: 'Trần Thị Bình', ngay_sinh: '1970-01-01' })).toEqual({
      ok: true,
      id: '12',
    });
  });
});

describe('parseUyVienImportRow', () => {
  it('đơn vị "Tỉnh" hoặc trống ⇒ cấp tỉnh; trạng thái trống ⇒ null (ghi đè giữ cũ)', () => {
    const r = parseUyVienImportRow(2, { ten_nhiem_ky: '1', ten_don_vi: 'tỉnh', can_bo_id: '12', ma_uv: ' UV01 ' }, ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({ nhiem_ky_id: '1', don_vi_id: null, ma_uv: 'UV01', trang_thai_tham_gia: null });
    expect(uyVienImportPayload(r.data)).not.toHaveProperty('trang_thai_tham_gia');
    expect(uyVienImportPayload(r.data, true).trang_thai_tham_gia).toBe('Đang tham gia');
  });

  it('nhiệm kỳ trùng tên / đơn vị lạ / trạng thái lạ ⇒ lỗi theo dòng', () => {
    const nk = parseUyVienImportRow(3, { ten_nhiem_ky: 'Nhiệm kỳ 2019-2024', can_bo_id: '12' }, ctx);
    expect(!nk.ok && nk.message).toContain('có nhiều nhiệm kỳ cùng tên');
    const dv = parseUyVienImportRow(4, { ten_nhiem_ky: '1', ten_don_vi: 'Hà Huy', can_bo_id: '12' }, ctx);
    expect(!dv.ok && dv.message).toContain('không tìm thấy đơn vị « Hà Huy »');
    const tt = parseUyVienImportRow(5, { ten_nhiem_ky: '1', can_bo_id: '12', trang_thai_tham_gia: 'nghỉ' }, ctx);
    expect(!tt.ok && tt.message).toContain('« nghỉ »');
  });

  it('cột họ tên map ⇒ được ghi đè can_bo_id', () => {
    const cols = uyVienMappedDbColumns(new Set(['ten_nhiem_ky', 'ho_va_ten']));
    expect(cols.has('nhiem_ky_id')).toBe(true);
    expect(cols.has('can_bo_id')).toBe(true);
    expect(cols.has('don_vi_id')).toBe(false);
  });
});

describe('phạm vi đơn vị đích của cán bộ cấp xã', () => {
  const scoped: UyVienImportRowCtx = { ...ctx, xaPhuong: [...ctx.xaPhuong, { id: '51', ten: 'Xã Khác' }], xaPhamVi: '50' };
  const base = { ten_nhiem_ky: '1', can_bo_id: '12' };

  it('ô đơn vị trống ⇒ gán xã của mình, không thành cấp tỉnh', () => {
    const r = parseUyVienImportRow(2, base, scoped);
    expect(r.ok && r.data.don_vi_id).toBe('50');
  });

  it('ghi xã khác hoặc "Tỉnh" ⇒ lỗi', () => {
    expect(parseUyVienImportRow(2, { ...base, ten_don_vi: 'Xã Khác' }, scoped).ok).toBe(false);
    expect(parseUyVienImportRow(2, { ...base, ten_don_vi: 'Tỉnh' }, scoped).ok).toBe(false);
  });
});
