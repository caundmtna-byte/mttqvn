import { describe, it, expect, beforeAll } from 'vitest';
import { applyZodVietnameseErrors } from '@/lib/validation/zod-vi';
import { baiVietDanhSachSchema } from './schema';

beforeAll(() => applyZodVietnameseErrors());

const BAI_HOP_LE = {
  ten_bai: 'Bài mẫu',
  id_the_loai: 'tl-1',
  ngay_dang: '2026-01-01',
  id_nguon_dang: 'ng-1',
  id_trang_dang: 'tr-1',
  link: 'https://example.com/bai-mau',
};

function donGia(v: unknown) {
  return baiVietDanhSachSchema.safeParse({ ...BAI_HOP_LE, don_gia: v });
}

describe('đơn giá bài viết — đọc số tiền', () => {
  it('đọc đúng số có dấu phân tách hàng nghìn', () => {
    const r = donGia('500.000.000');
    expect(r.success).toBe(true);
    expect(r.data!.don_gia).toBe(500_000_000);
  });

  it('ô trống là 0', () => {
    const r = donGia('');
    expect(r.success).toBe(true);
    expect(r.data!.don_gia).toBe(0);
  });

  it('chuỗi không đọc được thì BÁO LỖI, không lặng lẽ về 0', () => {
    // Bản cũ trả 0: bài viết vẫn lưu, không thông báo, nhuận bút tính bằng 0 đồng.
    const r = donGia('năm trăm nghìn');
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.message.includes('Đơn giá chưa đọc được'))).toBe(true);
  });

  it('đơn giá âm bị từ chối', () => {
    expect(donGia(-1).success).toBe(false);
  });
});
