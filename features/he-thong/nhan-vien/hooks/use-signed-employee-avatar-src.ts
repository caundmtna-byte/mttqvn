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
  const [legacySrc, setLegacySrc] = useState('');

  useEffect(() => {
    if (syncSrc) {
      setLegacySrc('');
      return;
    }
    if (!isLegacySupabaseAvatarPath(stored)) {
      setLegacySrc('');
      return;
    }

    let cancelled = false;
    void (async () => {
      const signed = await resolveLegacySupabaseAvatarSrc(stored);
      if (!cancelled) setLegacySrc(signed);
    })();
    return () => {
      cancelled = true;
    };
  }, [stored, syncSrc]);

  return syncSrc || legacySrc;
}
