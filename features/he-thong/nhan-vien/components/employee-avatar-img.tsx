import React from 'react';
import { getAvatarUrl } from '@/lib/utils';
import { useSignedEmployeeAvatarSrc } from '@/features/he-thong/nhan-vien/hooks/use-signed-employee-avatar-src';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
  hinh_anh: string | null | undefined;
  ho_va_ten: string;
  /** Kích thước ảnh chữ (DiceBear) khi không có ảnh — mặc định 64. */
  fallbackSize?: number;
}

/**
 * Avatar nhân viên: bucket Storage **private** → ký URL tạm thời; data URL / URL ngoài giữ nguyên.
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
  const s = hinh_anh?.trim() ?? '';
  const direct =
    s.startsWith('data:image/') || (s.startsWith('http') && !s.includes('.supabase.co')) ? s : '';
  const src = direct || signed || getAvatarUrl(ho_va_ten, fallbackSize);

  return <img {...rest} src={src} alt={alt ?? ho_va_ten} className={className} loading="lazy" />;
};
