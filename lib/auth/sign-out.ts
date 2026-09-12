import type { QueryClient } from '@tanstack/react-query';
import { getAuthService } from '@/lib/supabase/auth';
import { useAuthStore } from '@/store/useStore';
import { RQ_PERSIST_STORAGE_KEY } from '@/lib/supabase/query-config';

/**
 * Đăng xuất đầy đủ. Dùng hàm này thay vì gọi thẳng `useAuthStore.logout()` —
 * chỉ xoá state zustand là **chưa đủ**:
 *
 * 1. `supabase.auth.signOut()` thu hồi session; không gọi thì access/refresh token
 *    trong `sb-*-auth-token` vẫn còn hiệu lực và gọi REST API được.
 * 2. Cache TanStack Query được persist xuống localStorage — không xoá thì dữ liệu
 *    nhân sự / lương / bài viết của người dùng trước còn nguyên trên máy dùng chung.
 *
 * Lỗi mạng ở bước 1 không được chặn đăng xuất phía client — vẫn dọn sạch local.
 */
export async function signOutCompletely(queryClient: QueryClient): Promise<void> {
  try {
    await getAuthService().signOut();
  } catch {
    // Mất mạng / Supabase lỗi: vẫn phải dọn phiên cục bộ.
  }

  queryClient.clear();
  try {
    window.localStorage.removeItem(RQ_PERSIST_STORAGE_KEY);
  } catch {
    // Trình duyệt chặn storage — bỏ qua, cache RAM đã xoá ở trên.
  }
  // Lưu ý: `PersistQueryClientProvider` sẽ ghi lại key ngay sau đó, nhưng là một
  // cache RỖNG (đã xác minh: 0 query). Dữ liệu người dùng cũ không còn.

  useAuthStore.getState().logout();
}
