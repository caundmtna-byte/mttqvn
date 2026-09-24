import { describe, expect, it } from 'vitest';
import { parseKyHopImportRow, type KyHopImportRowCtx } from './ky-hop-import-row';
import { KY_HOP_IMPORT_KEYS } from './ky-hop-import-keys';

const ctx: KyHopImportRowCtx = {
  nhiemKy: [{ id: '1', ten: 'Nhiệm kỳ 2024-2029' }],
  xaPhuong: [
    { id: '50', ten: 'Phường Hà Huy Tập' },
    { id: '51', ten: 'Xã Khác' },
  ],
};
const base = { nhiem_ky_id: '1', ky_thu: '1' };

describe('parseKyHopImportRow — phạm vi cán bộ cấp xã', () => {
  const scoped = { ...ctx, xaPhamVi: '50' };

  it('ô đơn vị trống ⇒ gán xã của mình', () => {
    const r = parseKyHopImportRow(2, base, scoped);
    expect(r.ok && r.data.don_vi_id).toBe('50');
  });

  it('xã khác hoặc cấp tỉnh ⇒ lỗi', () => {
    expect(parseKyHopImportRow(2, { ...base, ten_don_vi: 'Xã Khác' }, scoped).ok).toBe(false);
    expect(parseKyHopImportRow(2, { ...base, ten_don_vi: 'MTTQ tỉnh' }, scoped).ok).toBe(false);
  });

  it('không giới hạn phạm vi ⇒ ô trống là cấp tỉnh', () => {
    const r = parseKyHopImportRow(2, base, ctx);
    expect(r.ok && r.data.don_vi_id).toBeNull();
  });
});

describe('khoá Nhiệm kỳ + Đơn vị + Kỳ thứ', () => {
  const key = KY_HOP_IMPORT_KEYS.find((k) => k.key === 'nhiem_ky_ky_thu')!;
  it('"Kỳ thứ 1" của hai xã khác nhau không trùng khoá; cấp tỉnh có khoá riêng', () => {
    const e = (don_vi_id: string | null) => ({ id: 'x', nhiem_ky_id: '1', ky_thu: 'Kỳ 1', don_vi_id, id_nguoi_tao: null });
    expect(key.ofExisting(e('50'))).not.toBe(key.ofExisting(e('51')));
    expect(key.ofExisting(e(null))).not.toBeNull();
  });
});
