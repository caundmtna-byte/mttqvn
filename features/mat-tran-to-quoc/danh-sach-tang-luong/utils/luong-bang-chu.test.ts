import { describe, expect, it } from 'vitest';
import { docSoTienVND, formatHeSoLuong } from './luong-bang-chu';

describe('docSoTienVND', () => {
  it.each([
    [0, 'Không đồng'],
    [1_000, 'Một nghìn đồng'],
    [15_000, 'Mười lăm nghìn đồng'],
    [21_000, 'Hai mươi mốt nghìn đồng'],
    [6_300_000, 'Sáu triệu ba trăm nghìn đồng'],
    [4_680_000, 'Bốn triệu sáu trăm tám mươi nghìn đồng'],
    [10_000_000, 'Mười triệu đồng'],
    [1_234_567, 'Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy đồng'],
  ])('%i → %s', (n, chu) => {
    expect(docSoTienVND(n)).toBe(chu);
  });

  it('đọc "không trăm lẻ" khi cụm giữa khuyết — tránh nhập nhằng số tiền', () => {
    expect(docSoTienVND(1_005_000)).toBe('Một triệu không trăm lẻ năm nghìn đồng');
    expect(docSoTienVND(2_000_500)).toBe('Hai triệu năm trăm đồng');
  });

  it('làm tròn về đồng và bỏ dấu âm', () => {
    expect(docSoTienVND(1_000.4)).toBe('Một nghìn đồng');
    expect(docSoTienVND(-2_000)).toBe('Hai nghìn đồng');
  });

  it('giá trị không hợp lệ trả chuỗi rỗng', () => {
    expect(docSoTienVND(null)).toBe('');
    expect(docSoTienVND(Number.NaN)).toBe('');
  });
});

describe('formatHeSoLuong', () => {
  it('hai chữ số thập phân, dấu phẩy kiểu Việt Nam', () => {
    expect(formatHeSoLuong(2.34)).toBe('2,34');
    expect(formatHeSoLuong(3)).toBe('3,00');
  });

  it('giá trị không hợp lệ trả chuỗi rỗng', () => {
    expect(formatHeSoLuong(0)).toBe('');
    expect(formatHeSoLuong(null)).toBe('');
  });
});
