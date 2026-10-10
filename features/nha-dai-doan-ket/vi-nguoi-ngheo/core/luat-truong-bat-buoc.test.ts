import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { NDDK_NGUON_CAN_QUYET_DINH } from '../../danh-sach/core/luat-truong-bat-buoc';
import { vnnTruongBatBuoc, vnnTruongConThieu } from './luat-truong-bat-buoc';

describe('ô bắt buộc theo trạng thái — Chương trình hỗ trợ', () => {
  it('Đang khảo sát không đòi gì', () => {
    expect(vnnTruongBatBuoc('Đang khảo sát', 'Cấp tỉnh')).toEqual([]);
  });

  it('Đã nhận + Cấp tỉnh/Cấp xã/Trung ương đòi ngày bàn giao + số, ngày quyết định', () => {
    for (const nguon of ['Cấp tỉnh', 'Cấp xã', 'Trung ương']) {
      expect(vnnTruongBatBuoc('Đã nhận', nguon)).toEqual(['ngay_ban_giao', 'so_quyet_dinh', 'ngay_quyet_dinh']);
    }
  });

  it('Đã nhận + Ủng hộ trực tiếp chỉ đòi ngày bàn giao', () => {
    expect(vnnTruongBatBuoc('Đã nhận', 'Ủng hộ trực tiếp')).toEqual(['ngay_ban_giao']);
  });

  it('biên bản null hoặc ô chỉ có khoảng trắng coi là thiếu', () => {
    expect(vnnTruongConThieu('Đã nhận', 'Ủng hộ trực tiếp', null)).toEqual(['ngay_ban_giao']);
    expect(
      vnnTruongConThieu('Đã nhận', 'Cấp xã', { ngay_ban_giao: '2026-05-10', so_quyet_dinh: ' ', ngay_quyet_dinh: '' }),
    ).toEqual(['so_quyet_dinh', 'ngay_quyet_dinh']);
  });
});

describe('khớp trigger fn_vnn_kiem_truong_bat_buoc', () => {
  const sql = readFileSync(resolve(__dirname, '../../../../supabase/schema.sql'), 'utf8');
  const start = sql.indexOf('CREATE FUNCTION public.fn_vnn_kiem_truong_bat_buoc()');
  const body = sql.slice(start, sql.indexOf('$$;', start));

  it('trigger có trong schema.sql, cùng trạng thái, nguồn và khoá jsonb', () => {
    expect(start).toBeGreaterThan(-1);
    expect(body).toContain(`NEW.trang_thai = 'Đã nhận'`);
    expect(body).toContain(`IN (${NDDK_NGUON_CAN_QUYET_DINH.map((n) => `'${n}'`).join(', ')})`);
    for (const k of ['ngay_ban_giao', 'so_quyet_dinh', 'ngay_quyet_dinh']) {
      expect(body).toContain(`->>'${k}'`);
    }
  });
});
