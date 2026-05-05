export interface User {
  /** ID của Supabase Auth (auth.users.id) */
  id: string;
  /** ID dòng tương ứng trong bảng `var_nhan_vien` */
  nhan_vien_id?: string;
  /** Tên tài khoản (`var_nhan_vien.ten_tai_khoan`) — định danh nghiệp vụ */
  username?: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'user';
  created_at: string;
  /** Id phòng ban (để tự chọn phòng trong Chức năng nhiệm vụ, v.v.) */
  id_phong_ban?: string | null;
  /** Id bộ phận (phòng ban con) */
  id_bo_phan?: string | null;
  /** Id chức vụ — module mới: 1 chức vụ; hỗ trợ array ở các module cũ. */
  id_chuc_vu?: string | string[] | null;
  /** Trạng thái tài khoản trong `var_nhan_vien` (tiếng Việt có dấu) */
  trang_thai?: 'Hoạt động' | 'Khóa';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** Chỉ dùng nội bộ: true khi đã đọc xong state từ localStorage/sessionStorage (tránh redirect về login khi reload). */
  _hasHydrated?: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isLoading?: boolean;
}

export interface ProfileFormValues {
  fullName: string;
  email: string;
  bio?: string;
}

/** In-app notification (bell dropdown list) */
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type?: NotificationType;
  read: boolean;
  createdAt: string; // ISO
  link?: string; // optional route or URL
}

export * from './crud';