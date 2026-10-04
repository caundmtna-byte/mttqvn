import { describe, expect, it } from 'vitest';
import type { HoNgheoThongKeRow } from '../core/types';
import { HNGH_DOI_TUONG_VALUES, HNGH_TRANG_THAI_VALUES } from '../core/constants';
import {
  HNGH_KHONG_XAC_DINH,
  HNGH_THONG_KE_INITIAL_DIMS,
  aggregateHnghByXaPhuong,
  buildHnghBarData,
  buildHnghDanTocBarData,
  computeHnghKpis,
  filterRowsForHnghThongKe,
} from './aggregate-hngh-stats';

/** Một nhóm = một hộ trừ khi ghi đè `so_ho`. */
function ho(p: Partial<HoNgheoThongKeRow> = {}): HoNgheoThongKeRow {
  return {
    so_ho: 1,
    xa_phuong_id: '1',
    ten_xa_phuong: 'Xã A',
    doi_tuong: 'Hộ nghèo',
    dan_toc_id: '10',
    ten_dan_toc: 'Kinh',
    ton_giao: 'Không',
    trang_thai: 'Đang khó khăn',
    ...p,
  };
}

describe('filterRowsForHnghThongKe', () => {
  const rows = [
    ho({ xa_phuong_id: '1', doi_tuong: 'Hộ nghèo' }),
    ho({ xa_phuong_id: '2', doi_tuong: 'Cận nghèo' }),
    ho({ xa_phuong_id: null, doi_tuong: null }),
  ];

  it('không chọn gì ⇒ giữ nguyên', () => {
    expect(filterRowsForHnghThongKe(rows, HNGH_THONG_KE_INITIAL_DIMS)).toHaveLength(3);
  });

  it('lọc theo xã và theo đối tượng', () => {
    const dims = { ...HNGH_THONG_KE_INITIAL_DIMS, xa_phuong: ['2'] };
    expect(filterRowsForHnghThongKe(rows, dims).map((r) => r.xa_phuong_id)).toEqual(['2']);
    const dims2 = { ...HNGH_THONG_KE_INITIAL_DIMS, doi_tuong: ['Hộ nghèo', 'Cận nghèo'] };
    expect(filterRowsForHnghThongKe(rows, dims2)).toHaveLength(2);
  });

  it('giá trị trống chỉ khớp khi chọn "Chưa xác định"', () => {
    const dims = { ...HNGH_THONG_KE_INITIAL_DIMS, xa_phuong: [HNGH_KHONG_XAC_DINH] };
    expect(filterRowsForHnghThongKe(rows, dims)).toEqual([rows[2]]);
  });
});

describe('computeHnghKpis', () => {
  it('đếm trạng thái, tôn giáo và tỷ lệ hết khó khăn', () => {
    const k = computeHnghKpis([
      ho({ trang_thai: 'Hết khó khăn', ton_giao: 'Có' }),
      ho({ trang_thai: 'Đang khó khăn' }),
      ho({ trang_thai: 'Đang khó khăn' }),
    ]);
    expect(k).toEqual({
      tongSoHo: 3,
      dangKhoKhan: 2,
      hetKhoKhan: 1,
      tyLeHetKhoKhan: 33,
      coTonGiao: 1,
    });
  });

  it('không có hộ nào ⇒ tỷ lệ 0, không chia cho 0', () => {
    expect(computeHnghKpis([]).tyLeHetKhoKhan).toBe(0);
  });
});

describe('buildHnghBarData', () => {
  it('giữ thứ tự nghiệp vụ, nhóm 0 vẫn có mặt', () => {
    const out = buildHnghBarData([ho({ doi_tuong: 'Khó khăn' })], 'doi_tuong', HNGH_DOI_TUONG_VALUES, '?');
    expect(out).toEqual([
      { label: 'Hộ nghèo', soHo: 0 },
      { label: 'Cận nghèo', soHo: 0 },
      { label: 'Khó khăn', soHo: 1 },
    ]);
  });

  it('hộ bỏ trống gom cột "Chưa xác định" để tổng khớp KPI', () => {
    const rows = [ho({ doi_tuong: null }), ho({ doi_tuong: 'Hộ nghèo' })];
    const out = buildHnghBarData(rows, 'doi_tuong', HNGH_DOI_TUONG_VALUES, 'Chưa xác định');
    expect(out.at(-1)).toEqual({ label: 'Chưa xác định', soHo: 1 });
    expect(out.reduce((s, p) => s + p.soHo, 0)).toBe(rows.length);
  });

  it('không có hộ trống ⇒ không thêm cột thừa', () => {
    const out = buildHnghBarData([ho()], 'trang_thai', HNGH_TRANG_THAI_VALUES, '?');
    expect(out.map((p) => p.label)).toEqual([...HNGH_TRANG_THAI_VALUES]);
  });
});

describe('buildHnghDanTocBarData', () => {
  it('nhiều hộ nhất trước, chưa ghi dân tộc xếp cuối', () => {
    const out = buildHnghDanTocBarData(
      [
        ho({ dan_toc_id: '10', ten_dan_toc: 'Kinh' }),
        ho({ dan_toc_id: '11', ten_dan_toc: 'Thái' }),
        ho({ dan_toc_id: '11', ten_dan_toc: 'Thái' }),
        ho({ dan_toc_id: null, ten_dan_toc: null }),
      ],
      'Chưa xác định',
    );
    expect(out).toEqual([
      { label: 'Thái', soHo: 2 },
      { label: 'Kinh', soHo: 1 },
      { label: 'Chưa xác định', soHo: 1 },
    ]);
  });
});

describe('aggregateHnghByXaPhuong', () => {
  it('gộp đủ cột theo xã, hộ chưa gán xã có dòng riêng, sắp theo tổng', () => {
    const out = aggregateHnghByXaPhuong(
      [
        ho({ xa_phuong_id: '1', ten_xa_phuong: 'Xã A', doi_tuong: 'Hộ nghèo' }),
        ho({ xa_phuong_id: '2', ten_xa_phuong: 'Xã B', doi_tuong: 'Cận nghèo' }),
        ho({ xa_phuong_id: '2', ten_xa_phuong: 'Xã B', trang_thai: 'Hết khó khăn', doi_tuong: 'Khó khăn' }),
        ho({ xa_phuong_id: null, ten_xa_phuong: null }),
      ],
      'Chưa gán xã',
    );
    expect(out.map((r) => [r.label, r.tongSoHo])).toEqual([
      ['Xã B', 2],
      ['Chưa gán xã', 1],
      ['Xã A', 1],
    ]);
    expect(out[0]).toMatchObject({ dangKhoKhan: 1, hetKhoKhan: 1, canNgheo: 1, khoKhan: 1, hoNgheo: 0 });
    expect(out.reduce((s, r) => s + r.tongSoHo, 0)).toBe(4);
  });
});

describe('cộng theo nhóm hộ', () => {
  it('KPI, biểu đồ và bảng xã đều cộng so_ho, cùng ra một tổng', () => {
    const rows = [
      ho({ so_ho: 5, xa_phuong_id: '1', trang_thai: 'Hết khó khăn', ton_giao: 'Có' }),
      ho({ so_ho: 3, xa_phuong_id: '2', doi_tuong: 'Cận nghèo' }),
      ho({ so_ho: 2, xa_phuong_id: null, ten_xa_phuong: null, doi_tuong: null, dan_toc_id: null }),
    ];
    const k = computeHnghKpis(rows);
    expect(k).toMatchObject({ tongSoHo: 10, hetKhoKhan: 5, dangKhoKhan: 5, coTonGiao: 5, tyLeHetKhoKhan: 50 });
    const sum = (xs: { soHo: number }[]) => xs.reduce((s, p) => s + p.soHo, 0);
    expect(sum(buildHnghBarData(rows, 'doi_tuong', HNGH_DOI_TUONG_VALUES, '?'))).toBe(10);
    expect(sum(buildHnghDanTocBarData(rows, '?'))).toBe(10);
    expect(aggregateHnghByXaPhuong(rows, '?').reduce((s, r) => s + r.tongSoHo, 0)).toBe(10);
  });
});
