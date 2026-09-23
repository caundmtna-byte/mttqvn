import { describe, it, expect } from 'vitest';
import {
  parseSoInput,
  isSoTienHopLe,
  formatSoInput,
  chuanHoaDangGo,
  SO_TIEN_TOI_DA,
} from './number';

describe('parseSoInput — số nguyên (tiền VND)', () => {
  it('đọc được số gõ liền', () => {
    expect(parseSoInput('1500000')).toBe(1_500_000);
  });

  it('đọc được số có dấu chấm nhóm hàng nghìn kiểu Việt Nam', () => {
    expect(parseSoInput('1.500.000')).toBe(1_500_000);
  });

  it('đọc được số dán từ Excel (dấu phẩy nhóm hàng nghìn)', () => {
    expect(parseSoInput('1,500,000')).toBe(1_500_000);
  });

  it('đọc được số có khoảng trắng', () => {
    expect(parseSoInput(' 1 500 000 ')).toBe(1_500_000);
  });

  it('trả null khi để trống', () => {
    expect(parseSoInput('')).toBeNull();
    expect(parseSoInput('   ')).toBeNull();
    expect(parseSoInput(null)).toBeNull();
    expect(parseSoInput(undefined)).toBeNull();
  });

  it('trả null khi có chữ hoặc ký hiệu tiền tệ', () => {
    expect(parseSoInput('1.500.000đ')).toBeNull();
    expect(parseSoInput('một triệu')).toBeNull();
    expect(parseSoInput('1.500.000 VND')).toBeNull();
  });

  it('đọc được số dán từ Word/Excel có dấu cách không ngắt', () => {
    // U+00A0 và U+202F — người dán không nhìn thấy, nhưng vẫn nằm trong chuỗi.
    expect(parseSoInput('1 500 000')).toBe(1_500_000);
    expect(parseSoInput('1 500 000')).toBe(1_500_000);
  });

  it('trả null khi chỉ có dấu phân cách', () => {
    expect(parseSoInput('...')).toBeNull();
  });

  it('giữ nguyên số đưa vào dạng number', () => {
    expect(parseSoInput(250_000)).toBe(250_000);
    expect(parseSoInput(Number.NaN)).toBeNull();
  });

  it('ca của anh Công: 500.000.000 phải là năm trăm triệu', () => {
    // `parseFloat('500.000.000')` trả 500 — sai một triệu lần, và im lặng.
    expect(parseSoInput('500.000.000')).toBe(500_000_000);
    expect(parseSoInput('500,000,000')).toBe(500_000_000);
    expect(parseSoInput('500 000 000')).toBe(500_000_000);
    expect(parseSoInput('500 000 000')).toBe(500_000_000);
  });

  it('từ chối nhóm hàng nghìn sai độ dài thay vì đoán bừa', () => {
    expect(parseSoInput('1.50')).toBeNull();
    expect(parseSoInput('1,5')).toBeNull();
    expect(parseSoInput('12.34.567')).toBeNull();
    expect(parseSoInput('1234.567')).toBeNull();
  });

  it('số 0 là số đọc được, không phải "chưa nhập"', () => {
    expect(parseSoInput('0')).toBe(0);
    expect(parseSoInput(0)).toBe(0);
  });
});

describe('parseSoInput — cho phép thập phân (số lượng hàng hoá)', () => {
  const le = { choThapPhan: true };

  it('dấu sau cùng là dấu thập phân kiểu Việt Nam', () => {
    expect(parseSoInput('1.500.000,25', le)).toBe(1_500_000.25);
    expect(parseSoInput('12,5', le)).toBe(12.5);
  });

  it('dấu sau cùng là dấu thập phân kiểu Anh–Mỹ', () => {
    expect(parseSoInput('1,500,000.25', le)).toBe(1_500_000.25);
  });

  it('một dấu + nhóm đúng 3 chữ số vẫn là dấu nhóm, không phải số lẻ', () => {
    // `1.500` ở Việt Nam là một nghìn rưỡi, không phải một phẩy năm.
    expect(parseSoInput('1.500', le)).toBe(1500);
    expect(parseSoInput('1,500', le)).toBe(1500);
  });

  it('số lẻ không đủ 3 chữ số thì chắc chắn là phần thập phân', () => {
    expect(parseSoInput('1.5', le)).toBe(1.5);
    expect(parseSoInput('0,125', le)).toBe(0.125);
  });

  it('vẫn từ chối chuỗi vô nghĩa', () => {
    expect(parseSoInput('1,2,3', le)).toBeNull();
    expect(parseSoInput('1,', le)).toBeNull();
    expect(parseSoInput('abc', le)).toBeNull();
  });
});

describe('isSoTienHopLe', () => {
  it('chấp nhận số dương', () => {
    expect(isSoTienHopLe(1)).toBe(true);
    expect(isSoTienHopLe(1_500_000)).toBe(true);
  });

  it('từ chối 0 và số âm', () => {
    expect(isSoTienHopLe(0)).toBe(false);
    expect(isSoTienHopLe(-1)).toBe(false);
  });

  it('từ chối null và số không đọc được', () => {
    expect(isSoTienHopLe(null)).toBe(false);
    expect(isSoTienHopLe(Number.NaN)).toBe(false);
    expect(isSoTienHopLe(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('trần là MAX_SAFE_INTEGER — vượt mốc đó thì cộng dồn số dư không còn đáng tin', () => {
    expect(SO_TIEN_TOI_DA).toBe(Number.MAX_SAFE_INTEGER);
    expect(isSoTienHopLe(SO_TIEN_TOI_DA)).toBe(true);
    expect(isSoTienHopLe(SO_TIEN_TOI_DA + 2)).toBe(false);
  });
});

describe('formatSoInput', () => {
  it('nhóm hàng nghìn bằng dấu chấm, không kèm ký hiệu tiền tệ', () => {
    expect(formatSoInput(1_500_000)).toBe('1.500.000');
    expect(formatSoInput(500_000_000)).toBe('500.000.000');
  });

  it('hiện số 0 thay vì để rỗng — 0 đồng khác với chưa nhập', () => {
    expect(formatSoInput(0)).toBe('0');
  });

  it('trả chuỗi rỗng khi không có số', () => {
    expect(formatSoInput(null)).toBe('');
    expect(formatSoInput(undefined)).toBe('');
    expect(formatSoInput(Number.NaN)).toBe('');
  });

  it('giữ phần thập phân khi ô cho phép', () => {
    expect(formatSoInput(12.5, { soLeToiDa: 3 })).toBe('12,5');
    expect(formatSoInput(1_500_000.25, { soLeToiDa: 2 })).toBe('1.500.000,25');
  });

  it('khoá vi-VN, không đổi theo locale máy', () => {
    // Máy cài en-US mà dùng toLocaleString() sẽ ra "500,000,000".
    expect(formatSoInput(500_000_000)).not.toContain(',');
  });
});

describe('chuanHoaDangGo — khoan dung với chuỗi gõ dở', () => {
  it('ô số nguyên chỉ giữ chữ số', () => {
    expect(chuanHoaDangGo('1.500.00', 0)).toEqual({ nguyen: '150000', le: null });
    expect(chuanHoaDangGo('abc', 0)).toEqual({ nguyen: '', le: null });
  });

  it('ô số lẻ giữ được dấu phẩy đang gõ dở', () => {
    expect(chuanHoaDangGo('12,', 3)).toEqual({ nguyen: '12', le: '' });
    expect(chuanHoaDangGo('1.500,25', 3)).toEqual({ nguyen: '1500', le: '25' });
  });

  it('cắt phần lẻ vượt quá số chữ số cho phép', () => {
    expect(chuanHoaDangGo('1,23456', 3)).toEqual({ nguyen: '1', le: '234' });
  });
});
