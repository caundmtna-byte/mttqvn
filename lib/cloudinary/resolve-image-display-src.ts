import {
  avatarsObjectPathFromStored,
  createSignedAvatarUrl,
} from '@/features/he-thong/nhan-vien/services/avatar-storage';

/**
 * URL dùng cho `<img src>`: Cloudinary/https trực tiếp; legacy Supabase signed URL;
 * data URL tạm (mock / chưa migrate).
 */
export function resolveImageDisplaySrcSync(stored: string | null | undefined): string {
  const s = stored?.trim() ?? '';
  if (!s) return '';
  if (s.startsWith('data:image/')) return s;
  if (s.startsWith('http')) return s;
  return '';
}

export function isLegacySupabaseAvatarPath(stored: string | null | undefined): boolean {
  const s = stored?.trim() ?? '';
  if (!s || s.startsWith('data:') || s.startsWith('http')) return false;
  return avatarsObjectPathFromStored(s) != null;
}

/** Async: legacy Supabase path → signed URL. */
export async function resolveLegacySupabaseAvatarSrc(
  stored: string | null | undefined,
): Promise<string> {
  const path = avatarsObjectPathFromStored(stored);
  if (!path) return '';
  const signed = await createSignedAvatarUrl(path);
  return signed ?? '';
}
