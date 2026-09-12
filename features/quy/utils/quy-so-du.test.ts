import { describe, it, expect } from 'vitest';
import { normalizeSoDuRow, tongHopSoDu, tongHopTuDongSo } from './quy-so-du';

describe('normalizeSoDuRow', () => {
  it('đổi cột numeric dạng chuỗi thành số rồi mới trừ', () => {
    const row = normalizeSoDuRow({
      tai_khoan_id: 7,
      ten_tai_khoan: 'Tiền mặt',
      tong_thu: '10000000.00',
      tong_chi: '3000000.00',
      so_du: '7000000.00',
    });
    expect(row).toEqual({
      tai_khoan_id: '7',
      ten_tai_khoan: 'Tiền mặt',
      tong_thu: 10_000_000,
      tong_chi: 3_000_000,
      so_du: 7_000_000,
    });
  });

  it('tài khoản chưa phát sinh thì mọi số là 0, không phải null', () => {
    const row = normalizeSoDuRow({ tai_khoan_id: 1, ten_tai_khoan: 'Vietcombank' });
    expect(row.tong_thu).toBe(0);
    expect(row.tong_chi).toBe(0);
    expect(row.so_du).toBe(0);
  });

  it('tính lại số dư từ thu/chi, không tin cột so_du của view', () => {
    const row = normalizeSoDuRow({
      tai_khoan_id: 2,
      ten_tai_khoan: 'Tiền mặt',
      tong_thu: '5000',
      tong_chi: '2000',
      so_du: '999999',
    });
    expect(row.so_du).toBe(3_000);
  });
});

describe('tongHopSoDu', () => {
  it('cộng dồn mọi tài khoản thành tổng của quỹ', () => {
    const res = tongHopSoDu([
      { tai_khoan_id: '1', ten_tai_khoan: 'Tiền mặt', tong_thu: 10_000_000, tong_chi: 4_000_000, so_du: 6_000_000 },
      { tai_khoan_id: '2', ten_tai_khoan: 'Vietcombank', tong_thu: 25_000_000, tong_chi: 5_000_000, so_du: 20_000_000 },
    ]);
    expect(res).toEqual({ tongThu: 35_000_000, tongChi: 9_000_000, soDu: 26_000_000 });
  });

  it('không có tài khoản nào thì tất cả bằng 0', () => {
    expect(tongHopSoDu([])).toEqual({ tongThu: 0, tongChi: 0, soDu: 0 });
  });

  it('chi nhiều hơn thu thì số dư âm — phải hiện đúng chứ không kẹp về 0', () => {
    const res = tongHopSoDu([
      { tai_khoan_id: '1', ten_tai_khoan: 'Tiền mặt', tong_thu: 1_000, tong_chi: 3_000, so_du: -2_000 },
    ]);
    expect(res.soDu).toBe(-2_000);
  });
});

describe('tongHopTuDongSo', () => {
  it('cộng thu và chi theo cột loai, không cộng thẳng cột tiền', () => {
    const res = tongHopTuDongSo([
      { loai: 'thu', so_tien: 1_000_000 },
      { loai: 'chi', so_tien: 400_000 },
      { loai: 'thu', so_tien: '2500000.00' },
      { loai: 'chi', so_tien: '100000' },
    ]);
    expect(res).toEqual({ tongThu: 3_500_000, tongChi: 500_000, soDu: 3_000_000 });
  });

  it('bỏ qua dòng có loai lạ thay vì cộng nhầm vào thu', () => {
    const res = tongHopTuDongSo([
      { loai: 'thu', so_tien: 1_000 },
      { loai: 'khac', so_tien: 9_999_999 },
    ]);
    expect(res).toEqual({ tongThu: 1_000, tongChi: 0, soDu: 1_000 });
  });

  it('sổ rỗng cho số dư 0', () => {
    expect(tongHopTuDongSo([])).toEqual({ tongThu: 0, tongChi: 0, soDu: 0 });
  });
});
