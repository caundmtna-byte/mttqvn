import { describe, it, expect, beforeAll } from 'vitest';
import { applyZodVietnameseErrors } from '@/lib/validation/zod-vi';
import { theLoaiSchema } from './schema';

beforeAll(() => applyZodVietnameseErrors());

function donGia(v: unknown): number | undefined {
  const r = theLoaiSchema.safeParse({ ten_the_loai: 'Tin', mo_ta: null, don_gia: v });
  return r.success ? r.data.don_gia : undefined;
}

describe('đơn giá thể loại — đọc số tiền', () => {
  it('KHÔNG được đọc "500.000.000" thành 500', () => {
    // Bản cũ: parseFloat('500.000.000') === 500, sai một triệu lần và im lặng.
    expect(donGia('500.000.000')).toBe(500_000_000);
  });

  it('đọc được số dán từ Excel và số có dấu cách', () => {
    expect(donGia('500,000,000')).toBe(500_000_000);
    expect(donGia('1 500 000')).toBe(1_500_000);
  });

  it('nhận số thuần và chuỗi số liền', () => {
    expect(donGia(250_000)).toBe(250_000);
    expect(donGia('250000')).toBe(250_000);
  });

  it('ô trống là 0', () => {
    expect(donGia('')).toBe(0);
  });

  it('chuỗi không đọc được thì BÁO LỖI, không lặng lẽ về 0', () => {
    const r = theLoaiSchema.safeParse({ ten_the_loai: 'Tin', mo_ta: null, don_gia: '500k' });
    expect(r.success).toBe(false);
    expect(r.error!.issues[0]!.message).toContain('Đơn giá chưa đọc được');
  });
});
