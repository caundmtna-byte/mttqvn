import React from 'react';
import { getAvatarUrl } from '@/lib/utils';
import { useSignedEmployeeAvatarSrc } from '@/features/he-thong/nhan-vien/hooks/use-signed-employee-avatar-src';
import { resolveImageDisplaySrcSync } from '@/lib/cloudinary/resolve-image-display-src';
import { cloudinaryThumbUrl } from '@/lib/cloudinary/thumb-url';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  hinh_anh: string | null | undefined;
  ho_va_ten: string;
  /** Kích thước ảnh chữ (DiceBear) khi không có ảnh — mặc định 64. */
  fallbackSize?: number;
}

/**
 * Avatar nhân viên: Cloudinary/https trực tiếp; legacy Supabase signed URL.
 *
 * Ảnh Cloudinary được xin bản resize theo `fallbackSize` (×2 cho màn retina) thay vì
 * bản gốc — avatar hiển thị 32-48px mà tải ảnh 2000px là tốn egress vô ích.
 * Ảnh legacy trên Supabase Storage chưa resize được (signed URL không có transform).
 */
export const EmployeeAvatarImg: React.FC<Props> = ({
  hinh_anh,
  ho_va_ten,
  fallbackSize = 64,
  className,
  alt,
  ...rest
}) => {
  const signed = useSignedEmployeeAvatarSrc(hinh_anh);
  const direct = cloudinaryThumbUrl(resolveImageDisplaySrcSync(hinh_anh), fallbackSize * 2);
  const src = direct || signed || getAvatarUrl(ho_va_ten, fallbackSize);

  return <img {...rest} src={src} alt={alt ?? ho_va_ten} className={className} loading="lazy" />;
};
