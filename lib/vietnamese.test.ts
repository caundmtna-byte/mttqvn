import { describe, expect, it } from 'vitest';
import { boDauTiengViet, chuanHoaKhoaSoKhop } from './vietnamese';

describe('boDauTiengViet', () => {
  it('bỏ dấu thanh và dấu mũ, giữ hoa/thường', () => {
    expect(boDauTiengViet('Ngày đăng')).toBe('Ngay dang');
    expect(boDauTiengViet('Thể loại')).toBe('The loai');
    expect(boDauTiengViet('NGUỒN ĐĂNG')).toBe('NGUON DANG');
  });

  it('xử lý đ/Đ — ký tự này NFD không tách ra được', () => {
    expect(boDauTiengViet('đơn vị')).toBe('don vi');
    expect(boDauTiengViet('Đơn Vị')).toBe('Don Vi');
  });

  it('chuỗi không dấu giữ nguyên', () => {
    expect(boDauTiengViet('Link 2026')).toBe('Link 2026');
  });
});

describe('chuanHoaKhoaSoKhop', () => {
  it('bỏ dấu, thường hoá, gộp khoảng trắng và cắt hai đầu', () => {
    expect(chuanHoaKhoaSoKhop('  Ngày   Đăng  ')).toBe('ngay dang');
    expect(chuanHoaKhoaSoKhop('NGÀY ĐĂNG')).toBe('ngay dang');
    expect(chuanHoaKhoaSoKhop('ngay dang')).toBe('ngay dang');
  });

  it('gộp cả tab và xuống dòng', () => {
    expect(chuanHoaKhoaSoKhop('Tên\tbài\nviết')).toBe('ten bai viet');
  });

  it('null / undefined / rỗng đều ra chuỗi rỗng', () => {
    expect(chuanHoaKhoaSoKhop(null)).toBe('');
    expect(chuanHoaKhoaSoKhop(undefined)).toBe('');
    expect(chuanHoaKhoaSoKhop('   ')).toBe('');
  });

  it('số cũng dùng được làm khoá', () => {
    expect(chuanHoaKhoaSoKhop(12)).toBe('12');
  });
});
