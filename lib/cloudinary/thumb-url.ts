import { isCloudinaryUrl } from './pwa-icon-url';

/**
 * Chèn transform Cloudinary vào URL ảnh để không phục vụ bản gốc.
 *
 * `f_auto,q_auto` cho Cloudinary tự chọn định dạng (AVIF/WebP) và mức nén theo
 * trình duyệt — thường giảm 50-80% dung lượng mà mắt thường không phân biệt được.
 * `w_<width>` cắt theo bề rộng thật sự hiển thị: avatar 40px trong bảng không cần
 * ảnh 2000px.
 *
 * URL không phải Cloudinary (data URL, Supabase signed URL legacy, ảnh ngoài)
 * trả về nguyên trạng.
 */
export function cloudinaryThumbUrl(
  url: string | null | undefined,
  width: number,
  options?: { crop?: 'fill' | 'limit' },
): string {
  const s = url?.trim() ?? '';
  if (!s || !isCloudinaryUrl(s)) return s;

  const crop = options?.crop ?? 'limit';
  try {
    const parsed = new URL(s);
    const parts = parsed.pathname.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return s;

    const transform = `f_auto,q_auto,w_${Math.round(width)},c_${crop}`;
    const next = parts[uploadIdx + 1];
    // Đã có transform sẵn (vd. bản PWA icon) → không chồng thêm.
    if (next && (next.includes('w_') || next.includes('c_') || next.includes('f_'))) {
      return s;
    }
    parts.splice(uploadIdx + 1, 0, transform);
    parsed.pathname = parts.join('/');
    return parsed.toString();
  } catch {
    return s;
  }
}

/** Bề rộng chuẩn theo vị trí hiển thị — tránh rải số ma thuật khắp component. */
export const CLOUDINARY_THUMB_WIDTH = {
  /** Avatar trong bảng / danh sách (hiển thị ~32-40px, ×2 cho màn retina) */
  avatarList: 96,
  /** Avatar lớn ở detail / form (hiển thị ~64-80px) */
  avatarDetail: 192,
  /** Ảnh thumbnail trong gallery nhiều ảnh */
  gallery: 400,
} as const;
