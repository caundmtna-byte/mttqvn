const DATA_URL_RE = /^data:([\w+/.-]+);base64,(.*)$/i;
const HTTP_IMAGE_RE = /^https?:\/\//i;

export type CloudinaryUploadOptions = {
  /** Folder trên Cloudinary, vd. mttqvn/avatars */
  folder: string;
  /** public_id cố định — ghi đè (logo) */
  publicId?: string;
  /** Phần cuối public_id unique, vd. `{employeeId}/{timestamp}` */
  filename?: string;
};

export function isImageDataUrl(value: string): boolean {
  return DATA_URL_RE.test(value.trim());
}

export function isHttpImageUrl(value: string): boolean {
  return HTTP_IMAGE_RE.test(value.trim());
}

export function validateHttpImageUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'URL ảnh không hợp lệ';
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return 'URL ảnh phải bắt đầu bằng http:// hoặc https://';
  }
  return null;
}

export function getCloudinaryConfig(): { cloudName: string; uploadPreset: string } | null {
  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim() ||
    (typeof process !== 'undefined' ? process.env.CLOUDINARY_CLOUD_NAME?.trim() : undefined);
  const uploadPreset =
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim() ||
    (typeof process !== 'undefined' ? process.env.CLOUDINARY_UPLOAD_PRESET?.trim() : undefined);
  if (!cloudName || !uploadPreset) return null;
  return { cloudName, uploadPreset };
}

function buildPublicId(options: CloudinaryUploadOptions): string | undefined {
  if (options.publicId) return options.publicId;
  if (options.filename) {
    const folder = options.folder.replace(/\/$/, '');
    return `${folder}/${options.filename}`;
  }
  return undefined;
}

async function postToCloudinary(
  body: FormData,
  config: { cloudName: string; uploadPreset: string },
): Promise<string> {
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
    { method: 'POST', body },
  );

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? `Upload Cloudinary thất bại (${res.status})`);
  }

  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error('Cloudinary không trả secure_url');
  return data.secure_url;
}

/** Upload File lên Cloudinary (unsigned preset). */
export async function uploadImageFromFile(
  file: File,
  options: CloudinaryUploadOptions,
): Promise<string> {
  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error(
      'Thiếu cấu hình Cloudinary (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)',
    );
  }

  const form = new FormData();
  form.append('file', file);
  form.append('upload_preset', config.uploadPreset);
  form.append('folder', options.folder);

  const publicId = buildPublicId(options);
  if (publicId) {
    form.append('public_id', publicId);
    form.append('overwrite', 'true');
  }

  return postToCloudinary(form, config);
}

/** Upload data URL hoặc trả nguyên HTTP URL. Safety net lúc save form. */
export async function uploadImageIfDataUrl(
  value: string | null | undefined,
  options: CloudinaryUploadOptions,
): Promise<string | null> {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  if (isHttpImageUrl(trimmed)) {
    const urlError = validateHttpImageUrl(trimmed);
    if (urlError) throw new Error(urlError);
    return trimmed;
  }

  if (!isImageDataUrl(trimmed)) {
    return trimmed;
  }

  const config = getCloudinaryConfig();
  if (!config) {
    throw new Error(
      'Thiếu cấu hình Cloudinary (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)',
    );
  }

  const form = new FormData();
  form.append('file', trimmed);
  form.append('upload_preset', config.uploadPreset);
  form.append('folder', options.folder);

  const publicId = buildPublicId(options);
  if (publicId) {
    form.append('public_id', publicId);
    form.append('overwrite', 'true');
  }

  return postToCloudinary(form, config);
}

export const CLOUDINARY_FOLDERS = {
  branding: 'mttqvn/branding',
  avatars: 'mttqvn/avatars',
  uploads: 'mttqvn/uploads',
} as const;

export function avatarCloudinaryFolder(employeeId: string | null | undefined): string {
  const id = String(employeeId || 'new').trim() || 'new';
  return `${CLOUDINARY_FOLDERS.avatars}/${id}`;
}

export function avatarCloudinaryFilename(): string {
  return String(Date.now());
}
