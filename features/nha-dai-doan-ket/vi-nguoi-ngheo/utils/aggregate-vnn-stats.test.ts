import { describe, expect, it } from 'vitest';
import type { ViNguoiNgheo } from '../core/types';
import {
  VNN_KHONG_XAC_DINH,
  VNN_THONG_KE_INITIAL_DIMS,
  aggregateVnnByXaPhuong,
  buildVnnBarData,
  buildVnnNamSeries,
  computeVnnKpis,
  filterRowsForVnnThongKe,
  topVnnDonViByTien,
} from './aggregate-vnn-stats';
import { VNN_LINH_VUC_VALUES } from '../core/constants';

let seq = 0;
function row(over: Partial<ViNguoiNgheo> = {}): ViNguoiNgheo {
  seq += 1;
  return {
    id: String(seq),
    noi_dung_ho_tro: 'Tết vì người nghèo 2026',
    nam: 2026,
    linh_vuc_ho_tro: 'Tết vì người nghèo',
    nguon: 'Vì người nghèo',
    nguon_ho_tro: 'Cấp tỉnh',
    ho_ngheo_id: null,
    ho_ten_nguoi_nhan: `Người ${seq}`,
    xa_phuong_id: '1',
    ten_xa_phuong: 'Xã A',
    khoi_xom: null,
    doi_tuong: 'Hộ nghèo',
    hinh_thuc_ho_tro: 'Tiền mặt',
    so_tien: 1_000_000,
    trang_thai: 'Đang khảo sát',
    ngay_cap_nhat_trang_thai: '',
    don_vi_ho_tro_id: null,
    ten_don_vi_ho_tro: null,
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: '',
    tg_cap_nhat: '',
    ...over,
  };
}

describe('computeVnnKpis', () => {
  it('khoản chỉ có quà (so_tien null) không cộng vào tổng tiền nhưng vẫn đếm khoản', () => {
    const k = computeVnnKpis([
      row({ so_tien: 500_000, trang_thai: 'Đã nhận' }),
      row({ so_tien: null, hinh_thuc_ho_tro: 'Quà' }),
    ]);
    expect(k.tongSoKhoan).toBe(2);
    expect(k.tongSoTien).toBe(500_000);
    expect(k.daNhan).toBe(1);
    expect(k.dangKhaoSat).toBe(1);
    expect(k.tyLeDaNhan).toBe(50);
  });

  it('một hộ nhận nhiều khoản chỉ đếm một người; người nhập tay trùng tên khác xã là hai người', () => {
    const k = computeVnnKpis([
      row({ ho_ngheo_id: '9', ho_ten_nguoi_nhan: 'Lê Văn A' }),
      row({ ho_ngheo_id: '9', ho_ten_nguoi_nhan: 'Lê Văn A' }),
      row({ ho_ten_nguoi_nhan: 'Trần  Thị B', xa_phuong_id: '1' }),
      row({ ho_ten_nguoi_nhan: 'trần thị b', xa_phuong_id: '1' }),
      row({ ho_ten_nguoi_nhan: 'Trần Thị B', xa_phuong_id: '2' }),
    ]);
    expect(k.soNguoiNhan).toBe(3);
  });

  it('rỗng ⇒ 0, không chia cho 0', () => {
    expect(computeVnnKpis([])).toMatchObject({ tongSoKhoan: 0, tyLeDaNhan: 0, soNguoiNhan: 0 });
  });
});

describe('filterRowsForVnnThongKe', () => {
  it('lọc "chưa gán xã" bằng khoá riêng', () => {
    const rows = [row({ xa_phuong_id: null }), row({ xa_phuong_id: '1' })];
    const out = filterRowsForVnnThongKe(rows, {
      ...VNN_THONG_KE_INITIAL_DIMS,
      xa_phuong: [VNN_KHONG_XAC_DINH],
    });
    expect(out).toHaveLength(1);
    expect(out[0].xa_phuong_id).toBeNull();
  });

  it('nhiều chiều lọc cùng lúc là AND', () => {
    const rows = [
      row({ nam: 2025, linh_vuc_ho_tro: 'Cứu trợ' }),
      row({ nam: 2026, linh_vuc_ho_tro: 'Cứu trợ' }),
      row({ nam: 2026, linh_vuc_ho_tro: 'Chữa bệnh' }),
    ];
    const out = filterRowsForVnnThongKe(rows, {
      ...VNN_THONG_KE_INITIAL_DIMS,
      nam: ['2026'],
      linh_vuc: ['Cứu trợ'],
    });
    expect(out).toHaveLength(1);
  });
});

describe('buildVnnBarData / buildVnnNamSeries', () => {
  it('trả đủ mọi lĩnh vực theo thứ tự nghiệp vụ, nhóm rỗng = 0', () => {
    const out = buildVnnBarData([row({ linh_vuc_ho_tro: 'Chữa bệnh', so_tien: 2 })], 'linh_vuc_ho_tro', VNN_LINH_VUC_VALUES);
    expect(out.map((p) => p.label)).toEqual([...VNN_LINH_VUC_VALUES]);
    expect(out.find((p) => p.label === 'Chữa bệnh')).toEqual({ label: 'Chữa bệnh', soKhoan: 1, soTien: 2 });
    expect(out.find((p) => p.label === 'Cứu trợ')?.soKhoan).toBe(0);
  });

  it('chuỗi năm sắp tăng dần, cộng tiền đúng năm', () => {
    const out = buildVnnNamSeries([row({ nam: 2026, so_tien: 3 }), row({ nam: 2024, so_tien: 1 }), row({ nam: 2026, so_tien: null })]);
    expect(out).toEqual([
      { nam: 2024, soKhoan: 1, soTien: 1 },
      { nam: 2026, soKhoan: 2, soTien: 3 },
    ]);
  });
});

describe('gom theo xã / đơn vị', () => {
  it('dòng chưa gán xã gom vào một dòng riêng — tổng khớp KPI', () => {
    const rows = [row({ xa_phuong_id: null, ten_xa_phuong: null }), row(), row()];
    const out = aggregateVnnByXaPhuong(rows, 'Chưa gán');
    expect(out.reduce((s, r) => s + r.soKhoan, 0)).toBe(3);
    expect(out[0]).toMatchObject({ id: '1', soKhoan: 2 });
    expect(out[1]).toMatchObject({ id: VNN_KHONG_XAC_DINH, label: 'Chưa gán' });
  });

  it('top đơn vị sắp theo tiền giảm dần và cắt đúng giới hạn', () => {
    const rows = [
      row({ don_vi_ho_tro_id: 'a', ten_don_vi_ho_tro: 'DN A', so_tien: 1 }),
      row({ don_vi_ho_tro_id: 'b', ten_don_vi_ho_tro: 'DN B', so_tien: 5 }),
      row({ don_vi_ho_tro_id: 'a', ten_don_vi_ho_tro: 'DN A', so_tien: 2, trang_thai: 'Đã nhận' }),
    ];
    const out = topVnnDonViByTien(rows, 'Chưa gán', 1);
    expect(out).toEqual([{ id: 'b', label: 'DN B', soKhoan: 1, soTien: 5, daNhan: 0 }]);
    expect(topVnnDonViByTien(rows, 'Chưa gán')[1]).toMatchObject({ id: 'a', soTien: 3, daNhan: 1 });
  });
});
