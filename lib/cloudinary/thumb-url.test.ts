import { describe, it, expect } from 'vitest';
import { cloudinaryThumbUrl } from './thumb-url';

const BASE = 'https://res.cloudinary.com/demo/image/upload/v1699/mttqvn/avatars/7/a.jpg';

describe('cloudinaryThumbUrl', () => {
  it('chèn transform ngay sau /upload/', () => {
    expect(cloudinaryThumbUrl(BASE, 96)).toBe(
      'https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_96,c_limit/v1699/mttqvn/avatars/7/a.jpg',
    );
  });

  it('crop fill khi cần khung cố định', () => {
    expect(cloudinaryThumbUrl(BASE, 96, { crop: 'fill' })).toContain('w_96,c_fill');
  });

  it('làm tròn bề rộng lẻ', () => {
    expect(cloudinaryThumbUrl(BASE, 95.4)).toContain('w_95,');
  });

  it('không chồng transform lên URL đã có sẵn', () => {
    const withTransform =
      'https://res.cloudinary.com/demo/image/upload/w_512,h_512,c_pad,f_png/v1/x.png';
    expect(cloudinaryThumbUrl(withTransform, 96)).toBe(withTransform);
  });

  it('bỏ qua URL không phải Cloudinary', () => {
    for (const u of [
      'https://example.com/a.jpg',
      'data:image/png;base64,AAAA',
      'https://xyz.supabase.co/storage/v1/object/sign/avatars/a.jpg?token=t',
    ]) {
      expect(cloudinaryThumbUrl(u, 96)).toBe(u);
    }
  });

  it('rỗng / null → chuỗi rỗng', () => {
    expect(cloudinaryThumbUrl('', 96)).toBe('');
    expect(cloudinaryThumbUrl(null, 96)).toBe('');
    expect(cloudinaryThumbUrl(undefined, 96)).toBe('');
  });

  it('URL hỏng → trả nguyên trạng, không ném lỗi', () => {
    expect(cloudinaryThumbUrl('res.cloudinary.com/khong-co-scheme', 96)).toBe(
      'res.cloudinary.com/khong-co-scheme',
    );
  });
});
