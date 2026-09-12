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
import { getErrorMessage } from './lib/utils';
import { SupabaseAppError } from './lib/supabase/errors';
import { RQ_PERSIST_STORAGE_KEY, SERVER_GC_TIME_MS, SERVER_STALE_TIME_MS } from './lib/supabase/query-config';
import { captureAppError, initSentry } from './lib/observability/sentry';

initSentry();

// PWA: đăng ký SW + toast cập nhật/offline trong App (PwaRegister)

/**
 * Lỗi phiên hết hạn / JWT không hợp lệ — PostgREST trả `PGRST301`, GoTrue trả 401.
 * Không có nhánh này thì người dùng chỉ thấy một chuỗi tiếng Anh khó hiểu và ngồi
 * lại trên màn hình chết, vì `ProtectedRoute` chỉ đọc cờ trong localStorage.
 */
function isAuthExpiredError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  const code = e?.code ?? '';
  if (code === 'PGRST301' || code === '401') return true;
  const msg = (e?.message ?? String(error)).toLowerCase();
  return (
    msg.includes('jwt expired') ||
    msg.includes('invalid jwt') ||
    msg.includes('jwt is expired') ||
    msg.includes('refresh_token_not_found') ||
    msg.includes('invalid refresh token')
  );
}

function queryErrorToast(error: unknown) {
  if (isAuthExpiredError(error)) {
    // Đăng xuất do `AuthSessionSynchronizer` đảm nhiệm (nó có router + queryClient).
    // Ở đây chỉ báo một lần, không đổ chồng toast cho từng query đang lỗi.
    toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', {
      id: 'auth-expired',
      duration: Infinity,
      closeButton: true,
    });
    return;
  }
  // Trước đây lỗi truy vấn / ghi dữ liệu chỉ hiện toast rồi biến mất — tức là
  // phần lớn sự cố thật không để lại dấu vết nào để dò sau.
  captureAppError(error, { nguon: 'tanstack-query' });

  // `getErrorMessage` dịch mã lỗi Postgres / tên ràng buộc sang tiếng Việt.
  const message = getErrorMessage(error);
  const retryable = error instanceof SupabaseAppError && error.retryable;

  toast.error(message, {
    // Gộp theo nội dung: bấm Lưu 3 lần lúc mất mạng thì thay thế, không chất đống.
    id: `query-error:${message}`,
    duration: Infinity,
    closeButton: true,
    // Lỗi mạng/tạm thời thì cho thử lại ngay trên toast, khỏi phải thao tác lại.
    action: retryable
      ? {
          label: 'Thử lại',
          onClick: () => void queryClient.refetchQueries({ type: 'active' }),
        }
      : undefined,
  });
}

function isRetryableError(error: unknown): boolean {
  // `SupabaseAppError` đã tính sẵn `retryable` từ mã lỗi Postgres — chính xác hơn
  // nhiều so với dò chuỗi (trước đây regex `/fetch/` khớp cả lỗi nghiệp vụ có chữ "fetch").
  if (error instanceof SupabaseAppError) return error.retryable;
  const msg = error instanceof Error ? error.message : String(error);
  return /network|timeout|ECONNREFUSED|ETIMEDOUT|Failed to fetch/i.test(msg);
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
  key: RQ_PERSIST_STORAGE_KEY,
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