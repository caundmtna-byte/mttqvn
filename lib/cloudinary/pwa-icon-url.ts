/** Cloudinary transform cho icon PWA (vuông, padding an toàn cho maskable). */
export function cloudinaryPwaIconUrl(url: string, size: 192 | 512): string {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes('res.cloudinary.com')) return url;

    const parts = parsed.pathname.split('/');
    const uploadIdx = parts.indexOf('upload');
    if (uploadIdx === -1) return url;

    const transform = size === 512 ? 'w_512,h_512,c_pad,f_png' : 'w_192,h_192,c_pad,f_png';
    const next = parts[uploadIdx + 1];
    if (next && (next.includes('w_') || next.includes('c_'))) {
      parts[uploadIdx + 1] = transform;
    } else {
      parts.splice(uploadIdx + 1, 0, transform);
    }
    parsed.pathname = parts.join('/');
    return parsed.toString();
  } catch {
    return url;
  }
}

export function isCloudinaryUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes('res.cloudinary.com');
  } catch {
    return false;
  }
}
