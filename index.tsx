import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import './index.css';
import App from './App';
import { QueryCache, QueryClient, defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { toast } from 'sonner';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { QueryDevtoolsPanel } from './components/dev/QueryDevtoolsPanel';
import { SERVER_GC_TIME_MS, SERVER_STALE_TIME_MS } from './lib/supabase/query-config';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn && typeof sentryDsn === 'string' && sentryDsn.trim() !== '') {
  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      environment: import.meta.env.MODE || 'production',
      enabled: true,
    });
  });
}

// PWA: đăng ký SW + toast cập nhật/offline trong App (PwaRegister)

function queryErrorToast(error: unknown) {
  const msg =
    error instanceof Error ? error.message : typeof error === 'string' ? error : 'Đã xảy ra lỗi';
  toast.error(msg);
}

function isRetryableError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /network|timeout|ECONNREFUSED|ETIMEDOUT|Failed to fetch|fetch/i.test(msg);
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: queryErrorToast,
  }),
  defaultOptions: {
    queries: {
      // `staleTime` đã đủ bảo vệ chống refetch dày đặc; bỏ refetch tự động khi
      // window focus/reconnect/remount để tiết kiệm egress (free-tier 5GB/tháng).
      // Mỗi feature có thể opt-in lại nếu thực sự cần.
      staleTime: SERVER_STALE_TIME_MS,
      gcTime: SERVER_GC_TIME_MS,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      retry: (failureCount, error) => {
        if (failureCount >= 2) return false;
        return isRetryableError(error);
      },
    },
    mutations: {
      onError: queryErrorToast,
    },
  },
});

/**
 * Persist React Query cache to localStorage so page reloads within the gcTime
 * window (30 min) restore data instantly without re-fetching from Supabase.
 * buster is incremented whenever the cache schema changes to avoid stale shapes.
 * v2: invalidate persisted RQ sau khi thêm cột / shape danh sách chức vụ (vd. cap_quan_ly).
 * v3: danh sách nhân viên thêm `don_vi_id` / `ten_don_vi`.
 * v4: không persist `['employees','list',…]` và `['employee', id]` — tránh danh sách/chi tiết
 *     cũ sau khi bản ghi đã xóa khỏi DB (reload vẫn thấy nhân viên “ảo”).
 * v5: không persist query key bắt đầu `kho-` (danh sách/chi tiết kho cứu trợ) — tránh cache localStorage
 *     lệch với Supabase khi sửa ngoài app / SQL.
 * v6: không persist `['roles']` — ma trận phân quyền sau lưu reload không bị khôi phục cache cũ
 *     (invalidate trước refetch + staleTime 30 phút).
 */
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'mttq-rq-cache',
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Router>
      <ErrorBoundary>
        <PersistQueryClientProvider
          client={queryClient}
          persistOptions={{
            persister: localStoragePersister,
            maxAge: SERVER_GC_TIME_MS,
            buster: '6',
            dehydrateOptions: {
              shouldDehydrateQuery: (query) => {
                const k = query.queryKey;
                if (!Array.isArray(k)) return defaultShouldDehydrateQuery(query);
                if (k[0] === 'employees' && k[1] === 'list') return false;
                if (k[0] === 'employee') return false;
                if (k[0] === 'roles') return false;
                if (typeof k[0] === 'string' && k[0].startsWith('kho-')) return false;
                return defaultShouldDehydrateQuery(query);
              },
            },
          }}
        >
          <App />
          <QueryDevtoolsPanel />
        </PersistQueryClientProvider>
      </ErrorBoundary>
    </Router>
  </React.StrictMode>
);