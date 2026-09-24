import { describe, expect, it } from 'vitest';
import type { NhaDaiDoanKet } from '@/features/nha-dai-doan-ket/danh-sach/core/types';
import {
  NDDK_KHONG_XAC_DINH,
  NDDK_THONG_KE_INITIAL_DIMS,
  aggregateNddkByXaPhuong,
  buildNddkBarData,
  buildNddkNamSeries,
  computeNddkKpis,
  filterRowsForNddkThongKe,
  topNddkXaPhuongByTien,
} from './aggregate-nddk-stats';

function nha(partial: Partial<NhaDaiDoanKet>): NhaDaiDoanKet {
  return {
    id: '1',
    noi_dung_ho_tro: 'Hỗ trợ xây nhà',
    nam: 2026,
    nguon: 'Vì người nghèo',
    nguon_ho_tro: 'Cấp tỉnh',
    ho_ngheo_id: null,
    ho_ten_chu_ho: 'Nguyễn Văn A',
    xa_phuong_id: null,
    ten_xa_phuong: null,
    khoi_xom: null,
    doi_tuong: 'Hộ nghèo',
    loai_hinh_ho_tro: 'Xây mới',
    so_tien: 60000000,
    trang_thai: 'Đang thực hiện',
    ngay_cap_nhat_trang_thai: '2026-01-01T00:00:00Z',
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: '2026-01-01T00:00:00Z',
    tg_cap_nhat: '2026-01-01T00:00:00Z',
    ...partial,
  };
}

describe('computeNddkKpis', () => {
  it('bỏ qua hồ sơ chưa có số tiền khi cộng tổng và tính bình quân', () => {
    const kpis = computeNddkKpis([
      nha({ id: '1', so_tien: 60000000 }),
      nha({ id: '2', so_tien: 40000000 }),
      nha({ id: '3', so_tien: null }),
    ]);
    expect(kpis.tongSoNha).toBe(3);
    expect(kpis.tongSoTien).toBe(100000000);
    expect(kpis.soHoSoCoTien).toBe(2);
    // Bình quân chia cho SỐ HỒ SƠ CÓ TIỀN (2), không chia cho tổng số nhà (3).
    expect(kpis.binhQuanMoiNha).toBe(50000000);
  });

  it('đếm đã bàn giao / đang thực hiện và tỷ lệ bàn giao', () => {
    const kpis = computeNddkKpis([
      nha({ id: '1', trang_thai: 'Đã bàn giao' }),
      nha({ id: '2', trang_thai: 'Đã bàn giao' }),
      nha({ id: '3', trang_thai: 'Đang thực hiện' }),
      nha({ id: '4', trang_thai: 'Tạm dừng' }),
    ]);
    expect(kpis.daBanGiao).toBe(2);
    expect(kpis.dangThucHien).toBe(1);
    expect(kpis.tyLeBanGiao).toBe(50);
  });

  it('danh sách rỗng không chia cho 0', () => {
    const kpis = computeNddkKpis([]);
    expect(kpis.tyLeBanGiao).toBe(0);
    expect(kpis.binhQuanMoiNha).toBe(0);
    expect(kpis.tongSoTien).toBe(0);
  });
});

describe('buildNddkNamSeries', () => {
  it('gom theo năm, sắp tăng dần, cộng dồn số tiền', () => {
    const series = buildNddkNamSeries([
      nha({ id: '1', nam: 2026, so_tien: 10 }),
      nha({ id: '2', nam: 2024, so_tien: 20 }),
      nha({ id: '3', nam: 2026, so_tien: null }),
      nha({ id: '4', nam: 2025, so_tien: 5 }),
    ]);
    expect(series.map((p) => p.nam)).toEqual([2024, 2025, 2026]);
    expect(series.find((p) => p.nam === 2026)).toEqual({ nam: 2026, soNha: 2, soTien: 10 });
  });
});

describe('buildNddkBarData', () => {
  it('giữ đủ mọi giá trị theo đúng thứ tự truyền vào, kể cả nhóm rỗng', () => {
    const bars = buildNddkBarData(
      [nha({ id: '1', loai_hinh_ho_tro: 'Xây mới' }), nha({ id: '2', loai_hinh_ho_tro: 'Xây mới' })],
      'loai_hinh_ho_tro',
      ['Xây mới', 'Sửa chữa'],
    );
    expect(bars).toEqual([
      { label: 'Xây mới', soNha: 2, soTien: 120000000 },
      { label: 'Sửa chữa', soNha: 0, soTien: 0 },
    ]);
  });
});

describe('aggregateNddkByXaPhuong', () => {
  it('gom hồ sơ chưa gán xã vào một dòng riêng thay vì bỏ đi', () => {
    const rows = aggregateNddkByXaPhuong(
      [
        nha({ id: '1', xa_phuong_id: '5', ten_xa_phuong: 'Xã A', so_tien: 10 }),
        nha({ id: '2', xa_phuong_id: '5', ten_xa_phuong: 'Xã A', so_tien: 20, trang_thai: 'Đã bàn giao' }),
        nha({ id: '3', xa_phuong_id: null, ten_xa_phuong: null, so_tien: 7 }),
      ],
      'Chưa gán xã phường',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ id: '5', label: 'Xã A', soNha: 2, soTien: 30, daBanGiao: 1 });
    expect(rows[1]).toEqual({
      id: NDDK_KHONG_XAC_DINH,
      label: 'Chưa gán xã phường',
      soNha: 1,
      soTien: 7,
      daBanGiao: 0,
    });
    // Tổng của bảng phải khớp KPI, không được hụt dòng nào.
    expect(rows.reduce((s, r) => s + r.soNha, 0)).toBe(3);
  });

  it('topNddkXaPhuongByTien sắp theo số tiền giảm dần', () => {
    const rows = aggregateNddkByXaPhuong(
      [
        nha({ id: '1', xa_phuong_id: '5', ten_xa_phuong: 'Xã A', so_tien: 10 }),
        nha({ id: '2', xa_phuong_id: '6', ten_xa_phuong: 'Xã B', so_tien: 99 }),
      ],
      'Chưa gán',
    );
    expect(topNddkXaPhuongByTien(rows, 1).map((r) => r.label)).toEqual(['Xã B']);
  });
});

describe('filterRowsForNddkThongKe', () => {
  const rows = [
    nha({ id: '1', nam: 2025, trang_thai: 'Đã bàn giao', xa_phuong_id: '5' }),
    nha({ id: '2', nam: 2026, trang_thai: 'Tạm dừng', xa_phuong_id: '6' }),
    nha({ id: '3', nam: 2026, trang_thai: 'Đã bàn giao', xa_phuong_id: null, doi_tuong: null }),
  ];

  it('không chọn gì thì giữ nguyên mọi dòng', () => {
    expect(filterRowsForNddkThongKe(rows, NDDK_THONG_KE_INITIAL_DIMS)).toHaveLength(3);
  });

  it('lọc giao nhau giữa nhiều chiều', () => {
    const out = filterRowsForNddkThongKe(rows, {
      ...NDDK_THONG_KE_INITIAL_DIMS,
      nam: ['2026'],
      trang_thai: ['Đã bàn giao'],
    });
    expect(out.map((r) => r.id)).toEqual(['3']);
  });

  it('chọn "chưa xác định" bắt đúng dòng có giá trị rỗng', () => {
    const out = filterRowsForNddkThongKe(rows, {
      ...NDDK_THONG_KE_INITIAL_DIMS,
      xa_phuong: [NDDK_KHONG_XAC_DINH],
    });
    expect(out.map((r) => r.id)).toEqual(['3']);
  });
});
