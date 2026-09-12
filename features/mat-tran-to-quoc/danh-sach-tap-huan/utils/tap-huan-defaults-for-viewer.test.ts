import { describe, it, expect } from 'vitest';
import { buildTapHuanDefaultsForViewer } from './tap-huan-defaults-for-viewer';
import type { MttqTapHuanFormValues } from '../core/schema';

const BASE: MttqTapHuanFormValues = {
  ten_lop_tap_huan: '',
  nam_tap_huan: 2026,
  cap_tap_huan: 'Cấp tỉnh',
  don_vi_id: '',
  to_chuc_id: '',
  ghi_chu: undefined,
  chi_tiet: [],
};

describe('buildTapHuanDefaultsForViewer', () => {
  it('không phải cấp Xã phường → giữ nguyên Cấp tỉnh', () => {
    const d = buildTapHuanDefaultsForViewer({
      base: BASE,
      isXaPhuongViewer: false,
      viewerDonViId: 'xa-01',
    });
    expect(d.cap_tap_huan).toBe('Cấp tỉnh');
    expect(d.don_vi_id).toBe('');
  });

  it('cấp Xã phường → Cấp xã + đơn vị của viewer', () => {
    const d = buildTapHuanDefaultsForViewer({
      base: BASE,
      isXaPhuongViewer: true,
      viewerDonViId: 'xa-01',
    });
    expect(d.cap_tap_huan).toBe('Cấp xã');
    expect(d.don_vi_id).toBe('xa-01');
  });

  it('cấp Xã phường nhưng hồ sơ thiếu đơn vị → không đổi cấp (tránh lớp Cấp xã trống đơn vị)', () => {
    const d = buildTapHuanDefaultsForViewer({
      base: BASE,
      isXaPhuongViewer: true,
      viewerDonViId: null,
    });
    expect(d.cap_tap_huan).toBe('Cấp tỉnh');
    expect(d.don_vi_id).toBe('');
  });

  it('không làm bẩn hằng số nền và luôn trả mảng chi tiết riêng', () => {
    const d = buildTapHuanDefaultsForViewer({
      base: BASE,
      isXaPhuongViewer: true,
      viewerDonViId: 'xa-01',
    });
    expect(BASE.cap_tap_huan).toBe('Cấp tỉnh');
    expect(BASE.don_vi_id).toBe('');
    expect(d.chi_tiet).not.toBe(BASE.chi_tiet);
  });
});
