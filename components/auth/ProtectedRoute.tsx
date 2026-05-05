import React, { useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/useStore';

export const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const location = useLocation();
  const fallbackDone = useRef(false);

  useEffect(() => {
    if (hasHydrated) return;
    const t = setTimeout(() => {
      if (fallbackDone.current) return;
      fallbackDone.current = true;
      useAuthStore.setState({ _hasHydrated: true });
    }, 400);
    return () => clearTimeout(t);
  }, [hasHydrated]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" aria-busy="true" aria-label="Đang tải">
        <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/dang-nhap" state={{ from: location }} replace />;
  return <>{children}</>;
};
