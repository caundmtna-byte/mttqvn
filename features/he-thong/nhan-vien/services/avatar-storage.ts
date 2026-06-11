import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';

export const AVATAR_BUCKET = 'avatars';

const DATA_URL_RE = /^data:([\w+/.-]+);base64,(.*)$/i;

/** True nếu giá trị là data URL `data:image/...;base64,...`. */
export function isEmployeeAvatarDataUrl(v: string): boolean {
  return DATA_URL_RE.test(v);
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const len = bin.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function extFromMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    default:
      return 'png';
  }
}

/**
 * Trích path object trong bucket `avatars` từ giá trị lưu DB:
 * - `nhan-vien/123/....jpg` → giữ nguyên
 * - URL public Supabase cũ → path sau `/object/public/avatars/`
 */
export function avatarsObjectPathFromStored(stored: string | null | undefined): string | null {
  if (stored == null) return null;
  const s = String(stored).trim();
  if (!s || s.startsWith('data:')) return null;
  if (s.startsWith('nhan-vien/')) return s.split('?')[0] || null;
  const marker = '/object/public/avatars/';
  const i = s.indexOf(marker);
  if (i >= 0) {
    const path = s.slice(i + marker.length).split('?')[0];
    return path || null;
  }
  const signMarker = '/object/sign/avatars/';
  const j = s.indexOf(signMarker);
  if (j >= 0) {
    const path = s.slice(j + signMarker.length).split('?')[0];
    return path || null;
  }
  // Một số client/SDK từng tạo URL thiếu `public` (GET trực tiếp sẽ 400 với bucket private).
  const rawObjectMarker = '/object/avatars/';
  const k = s.indexOf(rawObjectMarker);
  if (k >= 0) {
    const path = s.slice(k + rawObjectMarker.length).split('?')[0];
    return path || null;
  }
  const storageV1 = '/storage/v1/object/avatars/';
  const m = s.indexOf(storageV1);
  if (m >= 0) {
    const path = s.slice(m + storageV1.length).split('?')[0];
    return path || null;
  }
  return null;
}

/** Thời hạn signed URL — sau hạn cần gọi lại `createSignedUrl` (vd. mở lại form / refetch). */
const DEFAULT_SIGNED_TTL_SEC = 60 * 60 * 12; // 12 giờ

/**
 * Signed URL (private bucket). Trả null nếu không có client, lỗi, hoặc path rỗng.
 * Không gọi handleSupabaseError để tránh toast khi chỉ lỗi preview ảnh.
 */
export async function createSignedAvatarUrl(
  objectPath: string,
  expiresIn: number = DEFAULT_SIGNED_TTL_SEC,
): Promise<string | null> {
  const path = objectPath.trim();
  if (!path) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * @deprecated Upload mới dùng Cloudinary — xem `lib/cloudinary/upload-image.ts`.
 * Giữ signed URL helpers cho avatar legacy trong Supabase Storage.
 */
export async function uploadEmployeeAvatarIfDataUrl(
  value: string | null | undefined,
  employeeId: string,
): Promise<string | null> {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (!isEmployeeAvatarDataUrl(trimmed)) return trimmed;

  const supabase = getSupabase();
  if (!supabase) return trimmed;

  const m = DATA_URL_RE.exec(trimmed);
  if (!m) return trimmed;
  const mime = m[1] || 'image/png';
  const b64 = m[2] || '';
  const bytes = decodeBase64(b64);
  const ext = extFromMime(mime);
  const empPath = String(employeeId || 'unknown').trim() || 'unknown';
  const objectPath = `nhan-vien/${empPath}/${Date.now()}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, bytes, {
      contentType: mime,
      upsert: true,
      cacheControl: '3600',
    });
  if (upErr) handleSupabaseError(upErr);

  return objectPath;
}
