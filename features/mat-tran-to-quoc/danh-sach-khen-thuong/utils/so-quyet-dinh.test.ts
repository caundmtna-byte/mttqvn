import { describe, expect, it } from 'vitest';
import {
  SO_QD_PLACEHOLDER,
  chuanHoaSoQuyetDinh,
  laSoQuyetDinhHopLe,
  soLuongBangChu,
  soLuongVanBan,
} from './so-quyet-dinh';

describe('laSoQuyetDinhHopLe', () => {
  it('chấp nhận số và ký hiệu văn bản thường gặp', () => {
    expect(laSoQuyetDinhHopLe('12')).toBe(true);
    expect(laSoQuyetDinhHopLe('12/QĐ')).toBe(true);
    expect(laSoQuyetDinhHopLe('12/QĐ-MTTQ-BTT')).toBe(true);
    expect(laSoQuyetDinhHopLe('05-QĐ/MT')).toBe(true);
  });

  it('loại giá trị trống hoặc không có chữ số', () => {
    expect(laSoQuyetDinhHopLe('')).toBe(false);
    expect(laSoQuyetDinhHopLe('   ')).toBe(false);
    expect(laSoQuyetDinhHopLe(null)).toBe(false);
    expect(laSoQuyetDinhHopLe('QĐ-MTTQ')).toBe(false);
  });

  it('loại câu văn bị nhập nhầm vào ô số quyết định', () => {
    // Dữ liệu thật: 4/12 dòng `so_qd` đang chứa cả câu lý do khen thưởng.
    expect(
      laSoQuyetDinhHopLe('Có thành tích xuất sắc trong công tác Bầu cử đại biểu Quốc hội khóa XV'),
    ).toBe(false);
    expect(laSoQuyetDinhHopLe('Hoàn thành xuất sắc nhiệm vụ năm 2024')).toBe(false);
  });
});

describe('chuanHoaSoQuyetDinh', () => {
  it('bổ sung ký hiệu mặc định khi chỉ nhập phần số', () => {
    const r = chuanHoaSoQuyetDinh('12');
    expect(r.hopLe).toBe(true);
    expect(r.soKyHieu).toBe('12/QĐ-MTTQ-BTT');
    expect(r.noiDungNhapNham).toBeNull();
  });

  it('giữ nguyên ký hiệu người dùng đã nhập đủ', () => {
    expect(chuanHoaSoQuyetDinh('07/QĐ-MT').soKyHieu).toBe('07/QĐ-MT');
  });

  it('đẩy câu bị nhập nhầm xuống nội dung, ô Số để trống', () => {
    const cau = 'Có thành tích xuất sắc trong công tác Bầu cử';
    const r = chuanHoaSoQuyetDinh(cau);
    expect(r.hopLe).toBe(false);
    expect(r.soKyHieu).toBe(SO_QD_PLACEHOLDER);
    expect(r.noiDungNhapNham).toBe(cau);
  });

  it('so_qd rỗng vẫn cho ra ô Số điền tay', () => {
    const r = chuanHoaSoQuyetDinh('  ');
    expect(r.soKyHieu).toBe(SO_QD_PLACEHOLDER);
    expect(r.noiDungNhapNham).toBeNull();
  });
});

describe('soLuongBangChu', () => {
  it.each([
    [0, 'không'],
    [1, 'một'],
    [5, 'năm'],
    [10, 'mười'],
    [11, 'mười một'],
    [15, 'mười lăm'],
    [21, 'hai mươi mốt'],
    [25, 'hai mươi lăm'],
    [100, 'một trăm'],
    [105, 'một trăm lẻ năm'],
    [231, 'hai trăm ba mươi mốt'],
  ])('%i → %s', (n, chu) => {
    expect(soLuongBangChu(n)).toBe(chu);
  });

  it('số quá lớn thì trả lại chữ số', () => {
    expect(soLuongBangChu(1234)).toBe('1234');
  });
});

describe('soLuongVanBan', () => {
  it('thêm số 0 đứng đầu cho số một chữ số', () => {
    expect(soLuongVanBan(5)).toBe('05 (năm)');
    expect(soLuongVanBan(12)).toBe('12 (mười hai)');
    expect(soLuongVanBan(0)).toBe('00 (không)');
  });
});
