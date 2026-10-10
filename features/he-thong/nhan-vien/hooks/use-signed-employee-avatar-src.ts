import { useEffect, useState } from 'react';
import {
  resolveImageDisplaySrcSync,
  resolveLegacySupabaseAvatarSrc,
  isLegacySupabaseAvatarPath,
} from '@/lib/cloudinary/resolve-image-display-src';

/**
 * Chuỗi dùng cho `<img src>`: Cloudinary/https, legacy Supabase signed URL, hoặc data URL (mock).
 */
export function useSignedEmployeeAvatarSrc(stored: string | null | undefined): string {
  const syncSrc = resolveImageDisplaySrcSync(stored);
  const canKyLegacy = !syncSrc && isLegacySupabaseAvatarPath(stored);
  // Kết quả ký gắn với đúng `stored` đã ký — đổi ảnh thì kết quả cũ tự bị bỏ qua, không cần reset state.
  const [legacy, setLegacy] = useState<{ stored: string | null | undefined; src: string } | null>(
    null,
  );

  useEffect(() => {
    if (!canKyLegacy) return;
    let cancelled = false;
    void (async () => {
      const signed = await resolveLegacySupabaseAvatarSrc(stored);
      if (!cancelled) setLegacy({ stored, src: signed });
    })();
    return () => {
      cancelled = true;
    };
  }, [stored, canKyLegacy]);

  if (syncSrc) return syncSrc;
  return canKyLegacy && legacy != null && legacy.stored === stored ? legacy.src : '';
}
