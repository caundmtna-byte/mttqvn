import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { chuyenDuongDanCu } from '@/lib/duong-dan-nghia-tinh';

/**
 * Đặt ở route wildcard của tiền tố cũ (`/nghia-tinh-dong-lam/*`, `/an-sinh-xa-hoi/*`, `/mat-tran-to-quoc/kho-cuu-tro/*`):
 * chuyển sang đường dẫn mới, giữ id / trang in / query. Không khớp ⇒ về trang chủ.
 */
const ChuyenDuongDanCu: React.FC = () => {
  const { pathname, search } = useLocation();
  const moi = chuyenDuongDanCu(`${pathname}${search}`);
  return <Navigate to={moi ?? '/'} replace />;
};

export default ChuyenDuongDanCu;
