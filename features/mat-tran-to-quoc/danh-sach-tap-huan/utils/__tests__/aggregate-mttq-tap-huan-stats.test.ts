import { describe, expect, it } from 'vitest';
import {
  aggregateTapHuanByCap,
  aggregateTapHuanByNam,
  aggregateTapHuanByThuocDien,
  aggregateTapHuanTopDonViLop,
  aggregateTapHuanTopTenLop,
  computeTapHuanKpis,
  computeTapHuanKpisScoped,
} from '../aggregate-mttq-tap-huan-stats';
import type { MttqLopTapHuanListRow, MttqTapHuanChiTietFlatRow } from '../../core/types';

function row(partial: Partial<MttqLopTapHuanListRow>): MttqLopTapHuanListRow {
  return {
    id: '1',
    ten_lop_tap_huan: 'L',
    nam_tap_huan: 2024,
    cap_tap_huan: 'Cấp tỉnh',
    don_vi_id: null,
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: '',
    tg_cap_nhat: '',
    so_dong: 0,
    ...partial,
  };
}

describe('aggregate-mttq-tap-huan-stats', () => {
  it('computeTapHuanKpis sums lop and so_dong', () => {
    const rows = [row({ so_dong: 2 }), row({ so_dong: 3 })];
    expect(computeTapHuanKpis(rows)).toEqual({ totalLop: 2, totalNguoi: 5 });
  });

  it('computeTapHuanKpisScoped uses flat row count', () => {
    const lop = [row({ id: '1' }), row({ id: '2' })];
    const flat: MttqTapHuanChiTietFlatRow[] = [
      {
        id: 'a',
        id_lop_tap_huan: '1',
        ten_lop_tap_huan: 'L',
        nam_tap_huan: 2024,
        cap_tap_huan: 'Cấp tỉnh',
        don_vi_id: null,
        ten_don_vi_lop: null,
        tg_cap_nhat_lop: '',
        id_phong_ban_nguoi_tao: null,
        can_bo_id: '1',
        ten_can_bo: null,
        ten_to_chuc: null,
        ten_phong_ban: null,
        chuc_vu: null,
        ten_don_vi_can_bo: null,
        thuoc_dien: 'Biên chế',
      },
    ];
    expect(computeTapHuanKpisScoped(lop, flat)).toEqual({ totalLop: 2, totalNguoi: 1 });
  });

  it('aggregateTapHuanByCap groups by cap', () => {
    const rows = [row({ cap_tap_huan: 'Cấp tỉnh' }), row({ cap_tap_huan: 'Cấp xã' }), row({ cap_tap_huan: 'Cấp tỉnh' })];
    const agg = aggregateTapHuanByCap(rows);
    expect(agg.find((x) => x.label === 'Cấp tỉnh')?.count).toBe(2);
    expect(agg.find((x) => x.label === 'Cấp xã')?.count).toBe(1);
  });

  it('aggregateTapHuanByNam groups by year string', () => {
    const rows = [row({ nam_tap_huan: 2023 }), row({ nam_tap_huan: 2024 }), row({ nam_tap_huan: 2024 })];
    const agg = aggregateTapHuanByNam(rows);
    expect(agg.find((x) => x.label === '2024')?.count).toBe(2);
    expect(agg.find((x) => x.label === '2023')?.count).toBe(1);
  });

  it('aggregateTapHuanTopDonViLop counts by ten_don_vi', () => {
    const rows = [
      row({ ten_don_vi: 'Xã A' }),
      row({ ten_don_vi: 'Xã A' }),
      row({ ten_don_vi: undefined }),
    ];
    const top = aggregateTapHuanTopDonViLop(rows, 5);
    expect(top[0]?.label).toBe('Xã A');
    expect(top[0]?.value).toBe(2);
  });

  it('aggregateTapHuanByThuocDien groups flat rows', () => {
    const flat = [
      { thuoc_dien: 'Biên chế' },
      { thuoc_dien: 'Ngoài biên chế' },
      { thuoc_dien: 'Biên chế' },
    ] as MttqTapHuanChiTietFlatRow[];
    const agg = aggregateTapHuanByThuocDien(flat);
    expect(agg.find((x) => x.label === 'Biên chế')?.count).toBe(2);
    expect(agg.find((x) => x.label === 'Ngoài biên chế')?.count).toBe(1);
  });

  it('aggregateTapHuanTopTenLop sorts by so_dong', () => {
    const rows = [row({ id: '1', ten_lop_tap_huan: 'A', so_dong: 1 }), row({ id: '2', ten_lop_tap_huan: 'B', so_dong: 5 })];
    const top = aggregateTapHuanTopTenLop(rows, 10);
    expect(top[0]?.id).toBe('2');
    expect(top[0]?.value).toBe(5);
  });
});
