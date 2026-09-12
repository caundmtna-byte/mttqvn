import { describe, expect, it } from 'vitest';
import type { Employee } from '../core/types';
import {
  boNhanVienKhoiDanhSach,
  datTrangThaiNhanVien,
  khoiPhucNhanVienVaoDanhSach,
} from './use-nhan-vien';

function nv(id: string, ten = `NV ${id}`): Employee {
  return { id, ho_va_ten: ten } as Employee;
}

const danhSach: Employee[] = [nv('1'), nv('2'), nv('3')];

describe('boNhanVienKhoiDanhSach', () => {
  it('bỏ đúng nhân viên, giữ thứ tự dòng còn lại', () => {
    expect(boNhanVienKhoiDanhSach(danhSach, ['2'])!.map((e) => e.id)).toEqual(['1', '3']);
  });

  it('bỏ nhiều nhân viên một lần (xóa hàng loạt)', () => {
    expect(boNhanVienKhoiDanhSach(danhSach, ['1', '3'])!.map((e) => e.id)).toEqual(['2']);
  });

  it('id không tồn tại thì không bỏ nhầm ai', () => {
    expect(boNhanVienKhoiDanhSach(danhSach, ['99'])).toHaveLength(3);
  });

  it('không sửa mảng gốc', () => {
    boNhanVienKhoiDanhSach(danhSach, ['1']);
    expect(danhSach).toHaveLength(3);
  });

  it('chưa có danh sách trong cache thì giữ nguyên undefined', () => {
    expect(boNhanVienKhoiDanhSach(undefined, ['1'])).toBeUndefined();
  });
});

describe('khoiPhucNhanVienVaoDanhSach', () => {
  it('đưa lại nhân viên đã xóa vào danh sách', () => {
    const conLai = [nv('1'), nv('3')];
    expect(khoiPhucNhanVienVaoDanhSach(conLai, [nv('2')])!.map((e) => e.id)).toEqual(['1', '3', '2']);
  });

  it('không tạo dòng trùng khi nhân viên đã có sẵn', () => {
    const ketQua = khoiPhucNhanVienVaoDanhSach(danhSach, [nv('2')])!;
    expect(ketQua).toBe(danhSach);
    expect(ketQua).toHaveLength(3);
  });

  it('khôi phục hàng loạt, bỏ qua những người đã có', () => {
    const conLai = [nv('1')];
    expect(khoiPhucNhanVienVaoDanhSach(conLai, [nv('1'), nv('2'), nv('3')])!.map((e) => e.id)).toEqual([
      '1',
      '2',
      '3',
    ]);
  });

  it('không sửa mảng gốc', () => {
    const conLai = [nv('1')];
    khoiPhucNhanVienVaoDanhSach(conLai, [nv('2')]);
    expect(conLai).toHaveLength(1);
  });

  it('chưa có danh sách trong cache thì giữ nguyên undefined', () => {
    expect(khoiPhucNhanVienVaoDanhSach(undefined, [nv('1')])).toBeUndefined();
  });

  it('xóa rồi khôi phục đúng bộ id ban đầu', () => {
    const daXoa = [nv('1'), nv('3')];
    const sauXoa = boNhanVienKhoiDanhSach(danhSach, ['1', '3'])!;
    const sauKhoiPhuc = khoiPhucNhanVienVaoDanhSach(sauXoa, daXoa)!;
    expect([...sauKhoiPhuc.map((e) => e.id)].sort()).toEqual(['1', '2', '3']);
  });
});

describe('datTrangThaiNhanVien', () => {
  const ds: Employee[] = [
    { id: '1', ho_va_ten: 'A', trang_thai: 'Hoạt động' } as Employee,
    { id: '2', ho_va_ten: 'B', trang_thai: 'Hoạt động' } as Employee,
  ];

  it('chỉ đổi nhân viên được chọn', () => {
    const kq = datTrangThaiNhanVien(ds, ['2'], 'Khóa')!;
    expect(kq.map((e) => e.trang_thai)).toEqual(['Hoạt động', 'Khóa']);
  });

  it('không sửa mảng gốc', () => {
    datTrangThaiNhanVien(ds, ['1'], 'Khóa');
    expect(ds[0].trang_thai).toBe('Hoạt động');
  });

  it('danh sách id rỗng thì giữ nguyên bảng', () => {
    expect(datTrangThaiNhanVien(ds, [], 'Khóa')).toBe(ds);
  });

  it('cache rỗng thì giữ nguyên undefined', () => {
    expect(datTrangThaiNhanVien(undefined, ['1'], 'Khóa')).toBeUndefined();
  });
});
