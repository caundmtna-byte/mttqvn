import {
  uploadImageIfDataUrl,
  isImageDataUrl,
  isHttpImageUrl,
  validateHttpImageUrl,
  CLOUDINARY_FOLDERS,
} from './upload-image';

/** public_id cố định — mỗi lần upload ghi đè logo cũ trên Cloudinary. */
export const LOGO_PUBLIC_ID = 'mttqvn/branding/app-logo';

export const isLogoDataUrl = isImageDataUrl;
export const isHttpLogoUrl = isHttpImageUrl;
export const validateHttpLogoUrl = validateHttpImageUrl;

/** Upload logo tổ chức lên Cloudinary hoặc giữ URL http(s). */
export async function uploadLogoIfDataUrl(
  value: string | null | undefined,
): Promise<string | null> {
  return uploadImageIfDataUrl(value, {
    folder: CLOUDINARY_FOLDERS.branding,
    publicId: LOGO_PUBLIC_ID,
  });
}
