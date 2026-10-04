import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NDDK_TRANG_THAI_VALUES } from './constants';
import { NDDK_TRANG_THAI_BAT_BUOC_TIEN, canNhaTaiTro, nddkThieuTien } from './luat-so-tien';

describe('nddkThieuTien', () => {
  it('đang khảo sát / tạm dừng được để trống tiền', () => {
    expect(nddkThieuTien('Đang khảo sát', null)).toBe(false);
    expect(nddkThieuTien('Tạm dừng', null)).toBe(false);
  });
  it('từ đã phê duyệt trở đi phải có tiền > 0', () => {
    for (const tt of ['Đã phê duyệt', 'Đang thực hiện', 'Đã bàn giao']) {
      expect(nddkThieuTien(tt, null)).toBe(true);
      expect(nddkThieuTien(tt, 0)).toBe(true);
      expect(nddkThieuTien(tt, 50_000_000)).toBe(false);
    }
  });
});

describe('canNhaTaiTro', () => {
  it('chỉ nguồn "Ủng hộ trực tiếp" mới bắt buộc chọn nhà tài trợ', () => {
    expect(canNhaTaiTro('Ủng hộ trực tiếp')).toBe(true);
    expect(canNhaTaiTro('Cấp tỉnh')).toBe(false);
    expect(canNhaTaiTro('Cấp xã')).toBe(false);
  });
});

describe('khớp CHECK nddk_so_tien_theo_trang_thai_chk trong schema.sql', () => {
  const schema = readFileSync(resolve(__dirname, '../../../../supabase/schema.sql'), 'utf8');
  const line = schema.split('\n').find((l) => l.includes('CONSTRAINT nddk_so_tien_theo_trang_thai_chk'));
  it('đúng danh sách trạng thái bắt buộc tiền', () => {
    expect(line).toBeDefined();
    const dsTrongDb = [...(line ?? '').matchAll(/'([^']+)'::text/g)].map((m) => m[1]);
    expect(dsTrongDb).toEqual([...NDDK_TRANG_THAI_BAT_BUOC_TIEN]);
    for (const tt of dsTrongDb) expect(NDDK_TRANG_THAI_VALUES).toContain(tt);
  });
});
