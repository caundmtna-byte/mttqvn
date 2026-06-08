import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';
import ConfirmDialog from './components/shared/ConfirmDialog';
import PwaRegister from './components/shared/PwaRegister';

const Login = lazy(() => import('./pages/Login'));
const Profile = lazy(() => import('./pages/Profile'));
const Home = lazy(() => import('./pages/Home'));
const MatTranToQuocDashboard = lazy(() => import('./pages/dashboards/MatTranToQuocDashboard'));
const QuanLyGiaoViecDashboard = lazy(() => import('./pages/dashboards/QuanLyGiaoViecDashboard'));
const LicenseInfo = lazy(() => import('./pages/LicenseInfo'));
const NotificationPage = lazy(() => import('./pages/NotificationPage'));
const SystemDashboard = lazy(() => import('./pages/dashboards/SystemDashboard'));
const QuanLyVietBaiDashboard = lazy(() => import('./pages/dashboards/QuanLyVietBaiDashboard'));
const TrangThongTinKhacDashboard = lazy(() => import('./pages/dashboards/TrangThongTinKhacDashboard'));
const PhanBienXaHoiDashboard = lazy(() => import('./pages/dashboards/PhanBienXaHoiDashboard'));
const DanTocTonGiaoDashboard = lazy(() => import('./pages/dashboards/DanTocTonGiaoDashboard'));
const MatTranToQuocModulePlaceholder = lazy(() => import('./pages/mat-tran-to-quoc/MatTranToQuocModulePlaceholder'));
const ThietLapBaiVietPage = lazy(() => import('./features/quan-ly-viet-bai/thiet-lap-bai-viet/index'));
const BaiVietDanhSachPage = lazy(() => import('./features/quan-ly-viet-bai/bai-viet/index'));
const HoaHongVietBaiPage = lazy(() => import('./features/quan-ly-viet-bai/hoa-hong-viet-bai/index'));
const BcThongKeBaiVietPage = lazy(() => import('./features/quan-ly-viet-bai/bc-thong-ke-bai-viet/index'));
const ChuongTrinhNamPage = lazy(() => import('./features/quan-ly-giao-viec/chuong-trinh-nam/index'));
const CongViecPage = lazy(() => import('./features/quan-ly-giao-viec/cong-viec/index'));
const BaoCaoCongViecPage = lazy(() => import('./features/quan-ly-giao-viec/bao-cao-cong-viec/index'));
const ThietLapCaiDatPage = lazy(() => import('./features/mat-tran-to-quoc/thiet-lap-cai-dat/index'));
const DanhSachCanBoPage = lazy(() => import('./features/mat-tran-to-quoc/danh-sach-can-bo/index'));
const BaoCaoCanBoPage = lazy(() => import('./features/mat-tran-to-quoc/bao-cao-can-bo/index'));
const DanhSachKhenThuongPage = lazy(() => import('./features/mat-tran-to-quoc/danh-sach-khen-thuong/index'));
const NhiemKyPage = lazy(() => import('./features/mat-tran-to-quoc/nhiem-ky/index'));
const NhiemKyDiemDanhMatrixPage = lazy(() => import('./features/mat-tran-to-quoc/nhiem-ky/pages/mttq-nhiem-ky-diem-danh-matrix-page'));
const UyVienUyBanPage = lazy(() => import('./features/mat-tran-to-quoc/uy-vien-uy-ban/index'));
const BaoCaoUyVienPage = lazy(() => import('./features/mat-tran-to-quoc/bao-cao-uy-vien/index'));
const KyHopPage = lazy(() => import('./features/mat-tran-to-quoc/ky-hop/index'));
const DanhSachTapHuanPage = lazy(() => import('./features/mat-tran-to-quoc/danh-sach-tap-huan/index'));
const MttqLopTapHuanInDanhSachPage = lazy(
  () => import('./features/mat-tran-to-quoc/danh-sach-tap-huan/pages/mttq-lop-tap-huan-in-danh-sach-page'),
);
const KhoDanhSachKhoPage = lazy(() => import('./features/mat-tran-to-quoc/danh-sach-kho/index'));
const KhoDonViCuuTroPage = lazy(() => import('./features/mat-tran-to-quoc/don-vi-cuu-tro/index'));
const KhoDotCuuTroPage = lazy(() => import('./features/mat-tran-to-quoc/dot-cuu-tro/index'));
const HangHoaPage = lazy(() => import('./features/mat-tran-to-quoc/hang-hoa/index'));
const NhapXuatKhoPage = lazy(() => import('./features/mat-tran-to-quoc/nhap-xuat-kho/index'));
const KhoNhapXuatKhoInPhieuPage = lazy(
  () => import('./features/mat-tran-to-quoc/nhap-xuat-kho/pages/kho-nhap-xuat-kho-in-phieu-page'),
);
const TonKhoPage = lazy(() => import('./features/mat-tran-to-quoc/ton-kho/index'));
const KhoBaoCaoHoTroPage = lazy(() => import('./features/mat-tran-to-quoc/bao-cao-ho-tro/index'));
const ThietLapLuongPage = lazy(() => import('./features/mat-tran-to-quoc/thiet-lap-luong/index'));
const DanhSachTangLuongPage = lazy(() => import('./features/mat-tran-to-quoc/danh-sach-tang-luong/index'));
const DtTgThamHoiToChucPage = lazy(() => import('./features/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc/index'));
const DtTgThamHoiCaNhanPage = lazy(() => import('./features/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan/index'));
const DtTgThongTinToChucQuanTrongPage = lazy(() => import('./features/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong/index'));
const DtTgThongTinCaNhanTieuBieuPage = lazy(() => import('./features/dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu/index'));

import { ProtectedRoute } from './components/auth/ProtectedRoute';
import {
  ThemeSynchronizer,
  MetadataSynchronizer,
  LanguageSynchronizer,
  ThongTinToChucSynchronizer,
  useResolvedTheme,
} from './lib/app-sync';
import { PermissionMatrixSynchronizer } from './components/auth/PermissionMatrixSynchronizer';
import { AuthSessionSynchronizer } from './components/auth/AuthSessionSynchronizer';

const EmployeePage = lazy(() => import('./features/he-thong/nhan-vien/index'));
const ThongTinToChucPage = lazy(() => import('./features/he-thong/thong-tin-to-chuc/index'));
const SecurityPage = lazy(() => import('./features/he-thong/phan-quyen/index'));
const DanhSachTinhThanhPage = lazy(() => import('./features/he-thong/danh-sach-tinh-thanh/index'));
const DepartmentPage = lazy(() => import('./features/he-thong/phong-ban/index'));
const PositionPage = lazy(() => import('./features/he-thong/chuc-vu/index'));

const PageFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[40vh]" aria-busy="true" aria-label="Đang mở trang">
    <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

/** Layout + bảo vệ đăng nhập — dùng Outlet thay vì Routes lồng trong `path="/*"` để các path tuyệt đối khớp đúng (RR 6/7). */
const AppShell = () => (
  <ProtectedRoute>
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Outlet />
      </Suspense>
    </Layout>
  </ProtectedRoute>
);

const App = () => {
  const resolvedTheme = useResolvedTheme();
  return (
    <>
      <ThemeSynchronizer />
      <MetadataSynchronizer />
      <ThongTinToChucSynchronizer />
      <LanguageSynchronizer />
      <PermissionMatrixSynchronizer />
      <AuthSessionSynchronizer />
      <ConfirmDialog />
      <PwaRegister />
      <Toaster position="top-right" richColors theme={resolvedTheme} />
      <Routes>
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/login" element={<Navigate to="/dang-nhap" replace />} />
        <Route path="/dang-ky" element={<Navigate to="/dang-nhap" replace />} />
        <Route path="/register" element={<Navigate to="/dang-nhap" replace />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<Home />} />
          <Route path="/mat-tran-to-quoc" element={<MatTranToQuocDashboard />} />
          <Route path="/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan" element={<DanhSachTapHuanPage />} />
          <Route
            path="/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan/:lopId/in-danh-sach"
            element={<MttqLopTapHuanInDanhSachPage />}
          />
          <Route path="/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong" element={<DanhSachKhenThuongPage />} />
          <Route path="/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky" element={<NhiemKyPage />} />
          <Route path="/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky/diem-danh/:nhiemKyId" element={<NhiemKyDiemDanhMatrixPage />} />
          <Route path="/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop" element={<KyHopPage />} />
          <Route path="/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien" element={<UyVienUyBanPage />} />
          <Route path="/mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien" element={<BaoCaoUyVienPage />} />
          <Route path="/mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro" element={<KhoDotCuuTroPage />} />
          <Route path="/mat-tran-to-quoc/kho-cuu-tro/hang-hoa" element={<HangHoaPage />} />
          <Route path="/mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho" element={<NhapXuatKhoPage />} />
          <Route
            path="/mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho/:phieuId/in-phieu"
            element={<KhoNhapXuatKhoInPhieuPage />}
          />
          <Route path="/mat-tran-to-quoc/kho-cuu-tro/ton-kho" element={<TonKhoPage />} />
          <Route path="/mat-tran-to-quoc/kho-cuu-tro/danh-sach-kho" element={<KhoDanhSachKhoPage />} />
          <Route
            path="/mat-tran-to-quoc/kho-cuu-tro/don-vi-ho-tro"
            element={<Navigate to="/mat-tran-to-quoc/kho-cuu-tro/don-vi-cuu-tro" replace />}
          />
          <Route path="/mat-tran-to-quoc/kho-cuu-tro/don-vi-cuu-tro" element={<KhoDonViCuuTroPage />} />
          <Route path="/mat-tran-to-quoc/kho-cuu-tro/bao-cao-ho-tro" element={<KhoBaoCaoHoTroPage />} />
          <Route path="/mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo" element={<DanhSachCanBoPage />} />
          <Route path="/mat-tran-to-quoc/thiet-lap-khac/bao-cao-can-bo" element={<BaoCaoCanBoPage />} />
          <Route path="/mat-tran-to-quoc/thiet-lap-khac/thiet-lap-cai-dat" element={<ThietLapCaiDatPage />} />
          <Route path="/mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong" element={<DanhSachTangLuongPage />} />
          <Route path="/mat-tran-to-quoc/quan-ly-luong/thiet-lap-luong" element={<ThietLapLuongPage />} />
          <Route path="/quan-ly-viet-bai" element={<QuanLyVietBaiDashboard />} />
          <Route path="/quan-ly-viet-bai/bai-viet" element={<BaiVietDanhSachPage />} />
          <Route
            path="/quan-ly-viet-bai/hoa-hong-viet-bai"
            element={<Navigate to="/quan-ly-viet-bai/nhuan-but-viet-bai" replace />}
          />
          <Route path="/quan-ly-viet-bai/nhuan-but-viet-bai" element={<HoaHongVietBaiPage />} />
          <Route path="/quan-ly-viet-bai/bc-thong-ke-bai-viet" element={<BcThongKeBaiVietPage />} />
          <Route path="/quan-ly-viet-bai/thiet-lap-bai-viet" element={<ThietLapBaiVietPage />} />
          <Route path="/quan-ly-giao-viec" element={<QuanLyGiaoViecDashboard />} />
          <Route path="/quan-ly-giao-viec/chuong-trinh-nam" element={<ChuongTrinhNamPage />} />
          <Route path="/quan-ly-giao-viec/cong-viec" element={<CongViecPage />} />
          <Route path="/quan-ly-giao-viec/bao-cao-cong-viec" element={<BaoCaoCongViecPage />} />
          <Route path="/phan-bien-xa-hoi" element={<PhanBienXaHoiDashboard />} />
          <Route path="/dan-toc-ton-giao" element={<DanTocTonGiaoDashboard />} />
          <Route path="/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc" element={<DtTgThamHoiToChucPage />} />
          <Route path="/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan" element={<DtTgThamHoiCaNhanPage />} />
          <Route path="/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong" element={<DtTgThongTinToChucQuanTrongPage />} />
          <Route path="/dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu" element={<DtTgThongTinCaNhanTieuBieuPage />} />
          <Route path="/trang-thong-tin-khac" element={<TrangThongTinKhacDashboard />} />
          <Route path="/thong-tin-ban-quyen" element={<LicenseInfo />} />

          <Route path="/he-thong" element={<SystemDashboard />} />
          <Route path="/he-thong/nhan-vien" element={<EmployeePage />} />
          <Route path="/he-thong/phong-ban" element={<DepartmentPage />} />
          <Route path="/he-thong/chuc-vu" element={<PositionPage />} />
          <Route path="/he-thong/thong-tin-to-chuc" element={<ThongTinToChucPage />} />
          <Route path="/he-thong/thong-tin-cong-ty" element={<Navigate to="/he-thong/thong-tin-to-chuc" replace />} />
          <Route path="/he-thong/phan-quyen" element={<SecurityPage />} />
          <Route path="/he-thong/danh-sach-tinh-thanh" element={<DanhSachTinhThanhPage />} />

          <Route path="/nhan-vien" element={<Navigate to="/he-thong/nhan-vien" replace />} />
          <Route path="/phong-ban" element={<Navigate to="/he-thong/phong-ban" replace />} />
          <Route path="/chuc-vu" element={<Navigate to="/he-thong/chuc-vu" replace />} />
          <Route path="/thong-tin-cong-ty" element={<Navigate to="/he-thong/thong-tin-to-chuc" replace />} />
          <Route path="/phan-quyen" element={<Navigate to="/he-thong/phan-quyen" replace />} />

          <Route path="/ho-so" element={<Profile />} />
          <Route path="/thong-bao" element={<NotificationPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
};

export default App;
