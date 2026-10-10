import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { NDDK_NGUON_HO_TRO_VALUES } from './constants';
import { NDDK_NGUON_CAN_QUYET_DINH, nddkTruongBatBuoc, nddkTruongConThieu } from './luat-truong-bat-buoc';

describe('trường bắt buộc theo trạng thái', () => {
  it('Đang khảo sát chỉ đòi ngày khảo sát', () => {
    expect(nddkTruongBatBuoc('Đang khảo sát', 'Cấp tỉnh')).toEqual(['ngay_khao_sat']);
  });

  it('Đã bàn giao + Cấp tỉnh/Cấp xã/Trung ương đòi thêm số + ngày quyết định', () => {
    for (const nguon of ['Cấp tỉnh', 'Cấp xã', 'Trung ương']) {
      expect(nddkTruongBatBuoc('Đã bàn giao', nguon)).toEqual([
        'ngay_kiem_tra_hoan_thanh',
        'ngay_ban_giao',
        'so_quyet_dinh',
        'ngay_quyet_dinh',
      ]);
    }
  });

  it('Đã bàn giao + Ủng hộ trực tiếp không đòi quyết định', () => {
    expect(nddkTruongBatBuoc('Đã bàn giao', 'Ủng hộ trực tiếp')).toEqual([
      'ngay_kiem_tra_hoan_thanh',
      'ngay_ban_giao',
    ]);
  });

  it('các trạng thái giữa không đòi gì (kể cả ngày khảo sát)', () => {
    for (const t of ['Đang thực hiện', 'Tạm dừng', '', null]) {
      expect(nddkTruongBatBuoc(t, 'Cấp tỉnh')).toEqual([]);
    }
  });

  it('chuỗi chỉ có khoảng trắng coi là thiếu', () => {
    expect(
      nddkTruongConThieu('Đã bàn giao', 'Cấp xã', {
        ngay_kiem_tra_hoan_thanh: '2026-05-01',
        ngay_ban_giao: '2026-05-10',
        so_quyet_dinh: '   ',
        ngay_quyet_dinh: null,
      }),
    ).toEqual(['so_quyet_dinh', 'ngay_quyet_dinh']);
    expect(nddkTruongConThieu('Đang khảo sát', 'Cấp xã', { ngay_khao_sat: '2026-03-01' })).toEqual([]);
  });

  it('danh sách nguồn cần quyết định là tập con nguồn hợp lệ', () => {
    for (const n of NDDK_NGUON_CAN_QUYET_DINH) {
      expect(NDDK_NGUON_HO_TRO_VALUES).toContain(n);
    }
  });
});

describe('khớp trigger fn_nddk_kiem_truong_bat_buoc', () => {
  const sql = readFileSync(resolve(__dirname, '../../../../supabase/schema.sql'), 'utf8');
  const start = sql.indexOf('CREATE FUNCTION public.fn_nddk_kiem_truong_bat_buoc()');
  const body = sql.slice(start, sql.indexOf('$$;', start));

  it('trigger có trong schema.sql và cùng danh sách nguồn', () => {
    expect(start).toBeGreaterThan(-1);
    const nguon = NDDK_NGUON_CAN_QUYET_DINH.map((n) => `'${n}'`).join(', ');
    expect(body).toContain(`IN (${nguon})`);
  });

  it('cùng các cột bắt buộc', () => {
    for (const cot of [
      'ngay_khao_sat',
      'ngay_kiem_tra_hoan_thanh',
      'ngay_ban_giao',
      'so_quyet_dinh',
      'ngay_quyet_dinh',
    ]) {
      expect(body).toContain(`NEW.${cot}`);
    }
  });
});
