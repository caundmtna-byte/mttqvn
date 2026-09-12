import { describe, it, expect } from 'vitest';
import type { QuySoThuChiListRow } from '../../so-thu-chi/core/types';
import { aggregateQuyStats, buildQuyTrendSeries } from './aggregate-quy-stats';

function dong(over: Partial<QuySoThuChiListRow>): QuySoThuChiListRow {
  return {
    id: '1',
    quy: 'vi_nguoi_ngheo',
    loai: 'thu',
    so_chung_tu: 'PT-2026-0001',
    ngay_chung_tu: '2026-01-15',
    khoan_id: '1',
    ten_khoan: 'Ủng hộ của tổ chức',
    tai_khoan_id: '1',
    ten_tai_khoan: 'Tiền mặt',
    so_tien: 1_000_000,
    noi_dung: 'Nội dung',
    nguoi_nop_nhan: null,
    don_vi_id: null,
    ten_don_vi: null,
    chung_tu_goc: null,
    ghi_chu: null,
    id_nguoi_tao: null,
    ho_va_ten_nguoi_tao: null,
    tg_tao: '',
    tg_cap_nhat: '',
    ...over,
  };
}

describe('aggregateQuyStats', () => {
  it('sổ rỗng trả về mọi số bằng 0', () => {
    const s = aggregateQuyStats([]);
    expect(s.tongThu).toBe(0);
    expect(s.tongChi).toBe(0);
    expect(s.soDu).toBe(0);
    expect(s.soPhieu).toBe(0);
    expect(s.theoKhoanThu).toEqual([]);
    expect(s.theoKy).toEqual([]);
  });

  it('số dư là tổng thu trừ tổng chi, không phải cộng thẳng cột tiền', () => {
    const s = aggregateQuyStats([
      dong({ id: '1', loai: 'thu', so_tien: 5_000_000 }),
      dong({ id: '2', loai: 'chi', so_tien: 2_000_000 }),
      dong({ id: '3', loai: 'chi', so_tien: 500_000 }),
    ]);
    expect(s.tongThu).toBe(5_000_000);
    expect(s.tongChi).toBe(2_500_000);
    expect(s.soDu).toBe(2_500_000);
    expect(s.soPhieuThu).toBe(1);
    expect(s.soPhieuChi).toBe(2);
    expect(s.soPhieu).toBe(3);
  });

  it('cộng được cả khi cột tiền về dạng chuỗi (numeric của Postgres)', () => {
    const s = aggregateQuyStats([
      dong({ id: '1', loai: 'thu', so_tien: '1500000.00' as unknown as number }),
      dong({ id: '2', loai: 'thu', so_tien: '500000' as unknown as number }),
    ]);
    expect(s.tongThu).toBe(2_000_000);
  });

  it('tách khoản thu và khoản chi thành hai bảng riêng', () => {
    const s = aggregateQuyStats([
      dong({ id: '1', loai: 'thu', khoan_id: '10', ten_khoan: 'Ủng hộ', so_tien: 3_000_000 }),
      dong({ id: '2', loai: 'thu', khoan_id: '10', ten_khoan: 'Ủng hộ', so_tien: 1_000_000 }),
      dong({ id: '3', loai: 'chi', khoan_id: '20', ten_khoan: 'Hỗ trợ hộ nghèo', so_tien: 2_000_000 }),
    ]);
    expect(s.theoKhoanThu).toHaveLength(1);
    expect(s.theoKhoanThu[0]).toMatchObject({ label: 'Ủng hộ', thu: 4_000_000, soPhieu: 2 });
    expect(s.theoKhoanChi).toHaveLength(1);
    expect(s.theoKhoanChi[0]).toMatchObject({ label: 'Hỗ trợ hộ nghèo', chi: 2_000_000 });
  });

  it('gom theo tài khoản, số dư từng tài khoản bằng thu trừ chi', () => {
    const s = aggregateQuyStats([
      dong({ id: '1', loai: 'thu', tai_khoan_id: '1', ten_tai_khoan: 'Tiền mặt', so_tien: 4_000_000 }),
      dong({ id: '2', loai: 'chi', tai_khoan_id: '1', ten_tai_khoan: 'Tiền mặt', so_tien: 1_000_000 }),
      dong({ id: '3', loai: 'thu', tai_khoan_id: '2', ten_tai_khoan: 'Vietcombank', so_tien: 9_000_000 }),
    ]);
    const tienMat = s.theoTaiKhoan.find((r) => r.label === 'Tiền mặt');
    expect(tienMat).toMatchObject({ thu: 4_000_000, chi: 1_000_000, soDu: 3_000_000 });
    expect(s.theoTaiKhoan.find((r) => r.label === 'Vietcombank')?.soDu).toBe(9_000_000);
  });

  it('phiếu không gắn xã/phường vẫn được gom vào nhóm "Không xác định"', () => {
    const s = aggregateQuyStats([
      dong({ id: '1', don_vi_id: null, ten_don_vi: null, so_tien: 1_000 }),
      dong({ id: '2', don_vi_id: '5', ten_don_vi: 'Xã A', so_tien: 2_000 }),
    ]);
    expect(s.theoDonVi).toHaveLength(2);
    expect(s.theoDonVi.find((r) => r.label === 'Không xác định')?.thu).toBe(1_000);
  });

  it('gom theo tháng và sắp tăng dần theo thời gian', () => {
    const s = aggregateQuyStats([
      dong({ id: '1', ngay_chung_tu: '2026-03-02', so_tien: 3_000 }),
      dong({ id: '2', ngay_chung_tu: '2026-01-31', so_tien: 1_000 }),
      dong({ id: '3', ngay_chung_tu: '2026-01-01', so_tien: 500 }),
    ]);
    expect(s.theoKy.map((r) => r.id)).toEqual(['2026-01', '2026-03']);
    expect(s.theoKy[0]?.thu).toBe(1_500);
  });

  it('bỏ qua dòng có loai lạ thay vì cộng nhầm vào thu', () => {
    const s = aggregateQuyStats([
      dong({ id: '1', loai: 'thu', so_tien: 1_000 }),
      dong({ id: '2', loai: 'khac' as unknown as 'thu', so_tien: 9_999_999 }),
    ]);
    expect(s.tongThu).toBe(1_000);
    expect(s.tongChi).toBe(0);
    expect(s.soPhieu).toBe(1);
  });
});

describe('buildQuyTrendSeries', () => {
  it('preset «Tất cả» (start/end rỗng) KHÔNG được treo — suy khoảng từ dữ liệu', () => {
    const series = buildQuyTrendSeries(
      [
        dong({ id: '1', ngay_chung_tu: '2026-01-10', loai: 'thu', so_tien: 1_000 }),
        dong({ id: '2', ngay_chung_tu: '2026-03-10', loai: 'chi', so_tien: 400 }),
      ],
      { start: '', end: '', allTime: true },
    );
    expect(series.map((p) => p.thang)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(series[0]).toMatchObject({ thu: 1_000, chi: 0, soDu: 1_000 });
    expect(series[1]).toMatchObject({ thu: 0, chi: 0, soDu: 0 });
    expect(series[2]).toMatchObject({ thu: 0, chi: 400, soDu: -400 });
  });

  it('«Tất cả» mà không có dòng nào ⇒ trả rỗng, không lặp vô tận', () => {
    expect(buildQuyTrendSeries([], { start: '', end: '', allTime: true })).toEqual([]);
  });

  it('theo đúng khoảng ngày người dùng chọn, lấp cả tháng trống', () => {
    const series = buildQuyTrendSeries(
      [dong({ id: '1', ngay_chung_tu: '2026-02-05', loai: 'thu', so_tien: 2_000 })],
      { start: '2026-01-01', end: '2026-04-30' },
    );
    expect(series.map((p) => p.thang)).toEqual(['2026-01', '2026-02', '2026-03', '2026-04']);
    expect(series[1]?.thu).toBe(2_000);
  });

  it('nhãn hiển thị theo kiểu Việt Nam MM/YYYY', () => {
    const series = buildQuyTrendSeries([], { start: '2026-05-01', end: '2026-05-31' });
    expect(series).toHaveLength(1);
    expect(series[0]?.label).toBe('05/2026');
  });

  it('khoảng ngày không hợp lệ ⇒ trả rỗng chứ không lặp', () => {
    expect(buildQuyTrendSeries([], { start: 'khong-phai-ngay', end: 'cung-vay' })).toEqual([]);
  });

  it('ngày bắt đầu sau ngày kết thúc ⇒ trả rỗng', () => {
    expect(buildQuyTrendSeries([], { start: '2026-06-01', end: '2026-01-01' })).toEqual([]);
  });

  it('dữ liệu rác trải 100 năm vẫn dừng nhờ trần cứng 600 tháng', () => {
    const series = buildQuyTrendSeries(
      [
        dong({ id: '1', ngay_chung_tu: '1900-01-01', so_tien: 1 }),
        dong({ id: '2', ngay_chung_tu: '2026-01-01', so_tien: 1 }),
      ],
      { start: '', end: '', allTime: true },
    );
    expect(series.length).toBe(600);
  });
});
