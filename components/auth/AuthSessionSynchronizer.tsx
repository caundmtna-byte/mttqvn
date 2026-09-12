import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useStore';
import { getAuthService } from '@/lib/supabase/auth';
import { signOutCompletely } from '@/lib/auth/sign-out';
import { txt } from '@/lib/text';

/**
 * Giữ trạng thái đăng nhập của app khớp với phiên Supabase.
 *
 * Trước đây chỉ làm mới hồ sơ user một lần sau hydrate. Cờ `isAuthenticated` nằm
 * trong localStorage (zustand persist) và `ProtectedRoute` chỉ đọc cờ đó, nên khi
 * refresh token hết hạn / bị thu hồi / tài khoản bị khoá thì app vẫn render đầy đủ
 * giao diện, mọi truy vấn lỗi, và **không có gì đưa người dùng về trang đăng nhập**.
 *
 * Nay xử lý ba việc:
 * 1. Đối chiếu một lần sau hydrate — phiên đã chết thì dọn và đưa về đăng nhập.
 * 2. Lắng nghe `onAuthStateChange` — bao gồm cả sự kiện từ **tab khác** (supabase-js
 *    phát qua storage event), nên đăng xuất ở một tab sẽ đẩy mọi tab còn lại ra.
 * 3. Tài khoản bị khoá giữa phiên → `getSession()` trả null → đăng xuất.
 * 4. Đối chiếu lại mỗi khi người dùng quay lại tab. Không có bước này thì khoá
 *    một tài khoản đang online chỉ có tác dụng ở lần tải trang kế tiếp — bật
 *    "Ghi nhớ đăng nhập" thì có thể là hàng tuần sau. Có khoảng cách tối thiểu
 *    giữa hai lần kiểm để không bắn truy vấn mỗi lần chuyển cửa sổ.
 */

/** Khoảng cách tối thiểu giữa hai lần đối chiếu phiên khi quay lại tab. */
const KHOANG_CACH_DOI_CHIEU_MS = 60_000;
export function AuthSessionSynchronizer() {
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = useAuthStore((s) => s.user?.id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  /** Chặn đăng xuất lặp khi nhiều nguồn cùng báo mất phiên. */
  const signingOut = useRef(false);
  /** Mốc lần đối chiếu phiên gần nhất — tránh bắn truy vấn mỗi lần chuyển tab. */
  const lastCheckedAt = useRef(0);

  useEffect(() => {
    if (!hasHydrated || !isAuthenticated) return;

    let alive = true;

    const handleSessionLost = async () => {
      if (!alive || signingOut.current) return;
      signingOut.current = true;
      await signOutCompletely(queryClient);
      toast.error(txt('shared.error.unauthorized'));
      navigate('/dang-nhap', { replace: true });
    };

    // 1) Đối chiếu ngay sau hydrate
    void (async () => {
      const session = await getAuthService().getSession();
      if (!alive) return;
      if (!session?.user) {
        void handleSessionLost();
        return;
      }
      useAuthStore.getState().login(session.user);
    })();

    // 2) + 3) Theo dõi thay đổi phiên (kể cả từ tab khác)
    const unsubscribe = getAuthService().onAuthStateChange((session) => {
      if (!alive) return;
      if (!session?.user) {
        void handleSessionLost();
        return;
      }
      signingOut.current = false;
      useAuthStore.getState().login(session.user);
    });

    // Bước 1 ở trên vừa đối chiếu xong, tính từ đây mới đếm khoảng cách.
    lastCheckedAt.current = Date.now();

    // 4) Quay lại tab thì đối chiếu lại — bắt được trường hợp tài khoản vừa bị khoá.
    const handleVisible = () => {
      if (!alive || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastCheckedAt.current < KHOANG_CACH_DOI_CHIEU_MS) return;
      lastCheckedAt.current = now;
      void (async () => {
        const session = await getAuthService().getSession();
        if (!alive) return;
        if (!session?.user) void handleSessionLost();
      })();
    };
    document.addEventListener('visibilitychange', handleVisible);

    return () => {
      alive = false;
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisible);
    };
  }, [hasHydrated, isAuthenticated, userId, navigate, queryClient]);

  return null;
}
