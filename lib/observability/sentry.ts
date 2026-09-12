import type { User } from '@/types';

/**
 * Lớp mỏng bọc Sentry.
 *
 * Trước bản này, chỉ **lỗi render React** được gửi đi (`ErrorBoundary`), còn lỗi
 * truy vấn / ghi dữ liệu — tức là phần lớn sự cố thực tế — thì biến mất, và
 * không sự kiện nào biết là của cán bộ nào, đơn vị nào. Hệ quả: có báo lỗi cũng
 * không gọi hỗ trợ ngược được.
 *
 * Toàn bộ hàm ở đây đều **không làm gì** khi chưa cấu hình `VITE_SENTRY_DSN`,
 * nên chạy local hay môi trường chưa bật giám sát đều an toàn.
 */

type SentryModule = typeof import('@sentry/react');

let sentryPromise: Promise<SentryModule> | null = null;

function dsn(): string {
  const raw = import.meta.env.VITE_SENTRY_DSN;
  return typeof raw === 'string' ? raw.trim() : '';
}

export function isSentryEnabled(): boolean {
  return dsn() !== '';
}

/** Tỉ lệ lấy mẫu hiệu năng; mặc định 10% để không đốt quota. */
function tracesSampleRate(): number {
  const raw = Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 0.1;
  return raw;
}

function loadSentry(): Promise<SentryModule> | null {
  if (!isSentryEnabled()) return null;
  sentryPromise ??= import('@sentry/react');
  return sentryPromise;
}

/** Gọi một lần lúc khởi động ứng dụng. */
export function initSentry(): void {
  const mod = loadSentry();
  if (!mod) return;
  void mod.then((Sentry) => {
    Sentry.init({
      dsn: dsn(),
      environment: import.meta.env.MODE || 'production',
      enabled: true,
      // Có `release` thì stack trace mới ghép được với source map; thiếu nó thì
      // stack trace sản phẩm là mã đã nén, đọc không ra gì.
      release: import.meta.env.VITE_APP_VERSION || undefined,
      tracesSampleRate: tracesSampleRate(),
      beforeSend: scrubEvent,
    });
  });
}

/**
 * Lọc dữ liệu cá nhân trước khi gửi.
 *
 * Đây là hệ thống của cơ quan nhà nước, dữ liệu gồm hồ sơ cán bộ và bảng lương —
 * không được để chuỗi truy vấn hay URL mang theo nội dung bản ghi ra ngoài.
 */
export function scrubEvent<T extends { request?: { url?: string }; user?: Record<string, unknown> }>(
  event: T,
): T {
  if (event.request?.url) {
    try {
      const url = new URL(event.request.url);
      // Giữ đường dẫn để biết màn hình nào lỗi, bỏ toàn bộ query string.
      event.request.url = `${url.origin}${url.pathname}`;
    } catch {
      // URL không phân tích được thì bỏ hẳn còn hơn gửi nguyên.
      delete event.request.url;
    }
  }
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
    delete event.user.full_name;
  }
  return event;
}

/**
 * Gắn danh tính người dùng vào mọi sự kiện sau đó.
 *
 * Chỉ gửi định danh nội bộ (id, tên tài khoản, đơn vị) — đủ để bộ phận hỗ trợ
 * tìm đúng người, không kèm họ tên hay email.
 */
export function setSentryUser(user: User | null): void {
  const mod = loadSentry();
  if (!mod) return;
  void mod.then((Sentry) => {
    if (!user) {
      Sentry.setUser(null);
      return;
    }
    Sentry.setUser({
      id: user.nhan_vien_id ?? user.id,
      username: user.username ?? undefined,
    });
    Sentry.setTag('don_vi_id', user.don_vi_id != null ? String(user.don_vi_id) : 'khong_ro');
    Sentry.setTag('chuc_vu', user.ten_chuc_vu ?? 'khong_ro');
  });
}

export function clearSentryUser(): void {
  setSentryUser(null);
}

/**
 * Gửi một lỗi kèm ngữ cảnh. Dùng cho lỗi truy vấn / ghi dữ liệu, nơi trước đây
 * chỉ hiện toast rồi thôi.
 */
export function captureAppError(error: unknown, context?: Record<string, unknown>): void {
  const mod = loadSentry();
  if (!mod) return;
  void mod.then((Sentry) => {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  });
}
