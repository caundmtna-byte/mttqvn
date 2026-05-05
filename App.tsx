import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ConfirmDialog from './components/shared/ConfirmDialog';
import PwaRegister from './components/shared/PwaRegister';

import Home from './pages/Home';
import LicenseInfo from './pages/LicenseInfo';
import NotificationPage from './pages/NotificationPage';
import SystemDashboard from './pages/dashboards/SystemDashboard';

import { ProtectedRoute } from './components/auth/ProtectedRoute';
import {
  ThemeSynchronizer,
  MetadataSynchronizer,
  LanguageSynchronizer,
  useResolvedTheme,
} from './lib/app-sync';
import { PermissionMatrixSynchronizer } from './components/auth/PermissionMatrixSynchronizer';

const EmployeePage = lazy(() => import('./features/he-thong/nhan-vien/index'));
const CompanyInfoPage = lazy(() => import('./features/he-thong/thong-tin-cong-ty/index'));
const SecurityPage = lazy(() => import('./features/he-thong/phan-quyen/index'));
const DepartmentPage = lazy(() => import('./features/he-thong/phong-ban/index'));
const PositionPage = lazy(() => import('./features/he-thong/chuc-vu/index'));
const EmployeeProfilePreviewPage = lazy(
  () => import('./features/he-thong/nhan-vien/EmployeeProfilePreviewPage')
);

const PageFallback = () => (
  <div className="flex flex-col items-center justify-center min-h-[40vh]" aria-busy="true" aria-label="Đang mở trang">
    <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
  </div>
);

const WithPageSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<PageFallback />}>{children}</Suspense>
);

const App = () => {
  const resolvedTheme = useResolvedTheme();
  return (
    <>
      <ThemeSynchronizer />
      <MetadataSynchronizer />
      <LanguageSynchronizer />
      <PermissionMatrixSynchronizer />
      <ConfirmDialog />
      <PwaRegister />
      <Toaster position="top-right" richColors theme={resolvedTheme} />
      <Routes>
        <Route path="/dang-nhap" element={<Login />} />
        <Route path="/dang-ky" element={<Register />} />
        <Route path="/login" element={<Navigate to="/dang-nhap" replace />} />
        <Route path="/register" element={<Navigate to="/dang-ky" replace />} />
        <Route
          path="/ho-so-nhan-vien/:id"
          element={
            <ProtectedRoute>
              <WithPageSuspense>
                <EmployeeProfilePreviewPage />
              </WithPageSuspense>
            </ProtectedRoute>
          }
        />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Suspense fallback={<PageFallback />}>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/thong-tin-ban-quyen" element={<LicenseInfo />} />

                    <Route path="/he-thong" element={<SystemDashboard />} />
                    <Route path="/he-thong/nhan-vien" element={<EmployeePage />} />
                    <Route path="/he-thong/phong-ban" element={<DepartmentPage />} />
                    <Route path="/he-thong/chuc-vu" element={<PositionPage />} />
                    <Route path="/he-thong/thong-tin-cong-ty" element={<CompanyInfoPage />} />
                    <Route path="/he-thong/phan-quyen" element={<SecurityPage />} />

                    <Route path="/nhan-vien" element={<Navigate to="/he-thong/nhan-vien" replace />} />
                    <Route path="/phong-ban" element={<Navigate to="/he-thong/phong-ban" replace />} />
                    <Route path="/chuc-vu" element={<Navigate to="/he-thong/chuc-vu" replace />} />
                    <Route path="/thong-tin-cong-ty" element={<Navigate to="/he-thong/thong-tin-cong-ty" replace />} />
                    <Route path="/phan-quyen" element={<Navigate to="/he-thong/phan-quyen" replace />} />

                    <Route path="/ho-so" element={<Profile />} />
                    <Route path="/thong-bao" element={<NotificationPage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Suspense>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
};

export default App;
