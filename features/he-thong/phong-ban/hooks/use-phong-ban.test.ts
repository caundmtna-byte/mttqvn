import { describe, expect, it } from 'vitest';
import type { Department } from '../core/types';
import {
  boPhongBanKhoiDanhSach,
  datTrangThaiPhongBan,
  gomKetQuaHangLoat,
  tomTatLyDoHong,
} from './use-phong-ban';

function pb(id: string, trangThai: Department['trang_thai'] = 'Đang hoạt động'): Department {
  return { id, ten_phong_ban: `Phòng ${id}`, trang_thai: trangThai } as Department;
}

describe('gomKetQuaHangLoat', () => {
  it('tách đúng ai xong ai hỏng theo thứ tự id', () => {
    const ketQua = gomKetQuaHangLoat(['1', '2', '3'], [
      { status: 'fulfilled', value: undefined },
      { status: 'rejected', reason: new Error('Còn phòng con') },
      { status: 'fulfilled', value: undefined },
    ]);
    expect(ketQua.thanhCong).toEqual(['1', '3']);
    expect(ketQua.thatBai).toHaveLength(1);
    expect(ketQua.thatBai[0].id).toBe('2');
  });

  it('tất cả thành công', () => {
    const ketQua = gomKetQuaHangLoat(['1'], [{ status: 'fulfilled', value: 1 }]);
    expect(ketQua.thanhCong).toEqual(['1']);
    expect(ketQua.thatBai).toEqual([]);
  });

  it('tất cả thất bại', () => {
    const ketQua = gomKetQuaHangLoat(['1', '2'], [
      { status: 'rejected', reason: new Error('x') },
      { status: 'rejected', reason: new Error('y') },
    ]);
    expect(ketQua.thanhCong).toEqual([]);
    expect(ketQua.thatBai.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('thiếu kết quả thì tính là thất bại, không âm thầm bỏ qua', () => {
    const ketQua = gomKetQuaHangLoat(['1', '2'], [{ status: 'fulfilled', value: 1 }]);
    expect(ketQua.thanhCong).toEqual(['1']);
    expect(ketQua.thatBai.map((t) => t.id)).toEqual(['2']);
  });

  it('danh sách rỗng', () => {
    expect(gomKetQuaHangLoat([], [])).toEqual({ thanhCong: [], thatBai: [] });
  });
});

describe('tomTatLyDoHong', () => {
  it('gộp các lý do trùng nhau thành một', () => {
    const loi = new Error('Không thể xóa phòng ban đang chứa phòng ban con.');
    expect(tomTatLyDoHong([{ loi }, { loi }])).toBe('Không thể xóa phòng ban đang chứa phòng ban con.');
  });

  it('nêu tối đa 2 lý do khác nhau', () => {
    // Lý do phải là câu tiếng Việt thật: `getErrorMessage` nay thay mọi chuỗi
    // không dấu bằng câu mặc định, nên placeholder kiểu 'A'/'B' sẽ gộp làm một.
    const ket = tomTatLyDoHong([
      { loi: new Error('Còn phòng ban con bên trong') },
      { loi: new Error('Còn nhân viên đang thuộc phòng này') },
      { loi: new Error('Phòng ban đang được dùng ở nơi khác') },
    ]);
    expect(ket).toBe('Còn phòng ban con bên trong; Còn nhân viên đang thuộc phòng này');
  });
});

describe('datTrangThaiPhongBan', () => {
  const danhSach = [pb('1'), pb('2'), pb('3', 'Ngừng hoạt động')];

  it('chỉ đổi phòng ban được chọn', () => {
    const ketQua = datTrangThaiPhongBan(danhSach, ['1', '3'], 'Ngừng hoạt động')!;
    expect(ketQua.map((d) => d.trang_thai)).toEqual([
      'Ngừng hoạt động',
      'Đang hoạt động',
      'Ngừng hoạt động',
    ]);
  });

  it('không sửa mảng gốc', () => {
    datTrangThaiPhongBan(danhSach, ['1'], 'Ngừng hoạt động');
    expect(danhSach[0].trang_thai).toBe('Đang hoạt động');
  });

  it('danh sách id rỗng (mọi phòng ban đều hỏng) thì giữ nguyên bảng', () => {
    expect(datTrangThaiPhongBan(danhSach, [], 'Ngừng hoạt động')).toBe(danhSach);
  });

  it('cache rỗng thì giữ nguyên undefined', () => {
    expect(datTrangThaiPhongBan(undefined, ['1'], 'Ngừng hoạt động')).toBeUndefined();
  });
});

describe('boPhongBanKhoiDanhSach', () => {
  const danhSach = [pb('1'), pb('2'), pb('3')];

  it('bỏ đúng phòng ban, giữ thứ tự còn lại', () => {
    expect(boPhongBanKhoiDanhSach(danhSach, ['2'])!.map((d) => d.id)).toEqual(['1', '3']);
  });

  it('xóa hàng loạt hỏng hết thì bảng không đổi', () => {
    expect(boPhongBanKhoiDanhSach(danhSach, [])).toBe(danhSach);
  });

  it('không sửa mảng gốc', () => {
    boPhongBanKhoiDanhSach(danhSach, ['1', '2', '3']);
    expect(danhSach).toHaveLength(3);
  });
});

describe('xóa hàng loạt hỏng một phần — bảng phải khớp với thực tế', () => {
  it('chỉ bỏ những phòng ban xóa được, phòng ban hỏng hiện lại', () => {
    const truoc = [pb('1'), pb('2'), pb('3')];
    // Trên màn hình: bỏ hết 3 dòng ngay khi xác nhận.
    const lacQuan = boPhongBanKhoiDanhSach(truoc, ['1', '2', '3'])!;
    expect(lacQuan).toHaveLength(0);

    // Máy chủ trả về: '2' không xóa được vì còn phòng con.
    const ketQua = gomKetQuaHangLoat(['1', '2', '3'], [
      { status: 'fulfilled', value: undefined },
      { status: 'rejected', reason: new Error('Còn phòng con') },
      { status: 'fulfilled', value: undefined },
    ]);
    const cuoi = boPhongBanKhoiDanhSach(truoc, ketQua.thanhCong)!;
    expect(cuoi.map((d) => d.id)).toEqual(['2']);
  });
});
