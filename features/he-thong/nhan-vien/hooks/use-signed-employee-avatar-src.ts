import { useEffect, useState } from 'react';
import {
  avatarsObjectPathFromStored,
  createSignedAvatarUrl,
} from '@/features/he-thong/nhan-vien/services/avatar-storage';

/**
 * Chuỗi dùng cho `<img src>`: data URL, URL ngoài, hoặc signed URL từ path Storage (bucket private).
 */
export function useSignedEmployeeAvatarSrc(stored: string | null | undefined): string {
  const [src, setSrc] = useState('');

  useEffect(() => {
    const s = stored?.trim() ?? '';
    if (!s) {
      setSrc('');
      return;
    }
    if (s.startsWith('data:image/')) {
      setSrc(s);
      return;
    }
    if (s.startsWith('http') && !s.includes('.supabase.co')) {
      setSrc(s);
      return;
    }

    const path = avatarsObjectPathFromStored(s);
    if (!path) {
      setSrc('');
      return;
    }

    let cancelled = false;
    void (async () => {
      const signed = await createSignedAvatarUrl(path);
      if (!cancelled) setSrc(signed ?? '');
    })();
    return () => {
      cancelled = true;
    };
  }, [stored]);

  return src;
}
