import { getSupabase } from '@/lib/supabase/client';
import { isSupabase } from '@/lib/data/config';
import type { User } from '@/types';
import { loginNameToSupabaseEmail, supabaseEmailToLoginName } from '@/lib/auth-email';

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface SignUpCredentials {
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthSession {
  user: User;
}

export interface AuthService {
  signIn(credentials: SignInCredentials): Promise<{ user: User } | { error: string }>;
  signUp(credentials: SignUpCredentials): Promise<{ user?: User; error?: string }>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void;
}

const VAR_NHAN_VIEN_AUTH_COLUMNS =
  'id, ten_tai_khoan, ho_va_ten, hinh_anh, id_phong_ban, id_bo_phan, id_chuc_vu, don_vi_id, trang_thai';

export interface VarNhanVienAuthRow {
  id: string;
  ten_tai_khoan: string;
  ho_va_ten: string;
  hinh_anh: string | null;
  id_phong_ban: string | null;
  id_bo_phan: string | null;
  id_chuc_vu: string | null;
  don_vi_id?: string | null;
  /** Tên chức vụ sau khi tra `var_chuc_vu` (không có FK embed trên `var_nhan_vien`). */
  ten_chuc_vu?: string | null;
  trang_thai: 'Hoạt động' | 'Khóa';
}

/** Tra cứu nhân viên theo `ten_tai_khoan` (không phân biệt hoa thường). */
export async function getEmployeeByUsername(username: string): Promise<VarNhanVienAuthRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('var_nhan_vien')
    .select(VAR_NHAN_VIEN_AUTH_COLUMNS)
    .ilike('ten_tai_khoan', username.trim())
    .maybeSingle();
  if (error) return null;
  const row = (data as VarNhanVienAuthRow | null) ?? null;
  if (!row?.id_chuc_vu) return row;
  const { data: cv, error: cvErr } = await supabase
    .from('var_chuc_vu')
    .select('ten_chuc_vu')
    .eq('id', row.id_chuc_vu)
    .maybeSingle();
  if (cvErr || !cv) return row;
  const ten = (cv as { ten_chuc_vu?: string }).ten_chuc_vu;
  return { ...row, ten_chuc_vu: ten?.trim() ? ten : null };
}

/**
 * Lấy dòng `var_nhan_vien` khớp tài khoản Auth: phần local của email phải trùng `ten_tai_khoan`
 * và email đăng nhập phải đúng dạng `<ten_tai_khoan>@gmail.com`.
 */
async function resolveNhanVienForAuthEmail(authEmail: string | undefined): Promise<VarNhanVienAuthRow | null> {
  if (!authEmail?.trim()) return null;
  const normalizedEmail = authEmail.trim().toLowerCase();
  const login = supabaseEmailToLoginName(authEmail);
  if (!login) return null;
  const row = await getEmployeeByUsername(login);
  if (!row) return null;
  if (loginNameToSupabaseEmail(row.ten_tai_khoan).toLowerCase() !== normalizedEmail) return null;
  return row;
}

function buildAppUser(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown>; created_at?: string }, nhanVien: VarNhanVienAuthRow | null): User {
  const meta = authUser.user_metadata ?? {};
  void meta;
  const role: 'admin' | 'user' = 'user';
  return {
    id: authUser.id,
    nhan_vien_id: nhanVien?.id,
    username: nhanVien?.ten_tai_khoan,
    email: authUser.email ?? '',
    full_name: nhanVien?.ho_va_ten ?? (meta.full_name as string | undefined),
    avatar_url: nhanVien?.hinh_anh ?? (meta.avatar_url as string | undefined),
    role,
    created_at: authUser.created_at ?? new Date().toISOString(),
    id_phong_ban: nhanVien?.id_phong_ban ?? null,
    id_bo_phan: nhanVien?.id_bo_phan ?? null,
    id_chuc_vu: nhanVien?.id_chuc_vu ?? null,
    ten_chuc_vu: nhanVien?.ten_chuc_vu ?? null,
    don_vi_id:
      nhanVien?.don_vi_id != null && String(nhanVien.don_vi_id).trim() !== ''
        ? String(nhanVien.don_vi_id).trim()
        : null,
    trang_thai: nhanVien?.trang_thai,
  };
}

const mockUser: User = {
  id: 'emp-000',
  username: 'admin',
  email: 'admin@gmail.com',
  full_name: 'Quản trị viên',
  role: 'admin',
  created_at: new Date().toISOString(),
  id_phong_ban: null,
  id_bo_phan: null,
  id_chuc_vu: null,
  ten_chuc_vu: null,
  don_vi_id: null,
  trang_thai: 'Hoạt động',
};

const mockAuthService: AuthService = {
  async signIn({ email, password }) {
    await new Promise((r) => setTimeout(r, 600));
    if (password.length < 6) return { error: 'Mật khẩu không hợp lệ' };
    return {
      user: {
        ...mockUser,
        email,
        username: email.split('@')[0],
        full_name: email === 'admin@gmail.com' ? mockUser.full_name : email.split('@')[0],
      },
    };
  },

  async signUp() {
    await new Promise((r) => setTimeout(r, 800));
    return {};
  },

  async signOut() {
    await new Promise((r) => setTimeout(r, 100));
  },

  async getSession() {
    return null;
  },

  onAuthStateChange() {
    return () => {};
  },
};

const supabaseAuthService: AuthService = {
  async signIn(credentials) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase chưa được cấu hình' };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    if (error) return { error: error.message };
    if (!data.user?.email) return { error: 'Đăng nhập thất bại' };

    const nhanVien = await resolveNhanVienForAuthEmail(data.user.email);
    if (!nhanVien) {
      await supabase.auth.signOut();
      return { error: 'Không tìm thấy hồ sơ nhân viên trùng tên đăng nhập. Liên hệ quản trị viên.' };
    }
    if (nhanVien.trang_thai === 'Khóa') {
      await supabase.auth.signOut();
      return { error: 'Tài khoản đã bị khoá. Liên hệ quản trị viên.' };
    }
    return { user: buildAppUser(data.user, nhanVien) };
  },

  async signUp({ email, password, fullName }) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase chưa được cấu hình' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.user?.email) {
      const nhanVien = await resolveNhanVienForAuthEmail(data.user.email);
      return { user: buildAppUser(data.user, nhanVien) };
    }
    return {};
  },

  async signOut() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
  },

  async getSession() {
    const supabase = getSupabase();
    if (!supabase) return null;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user?.email) return null;
    const nhanVien = await resolveNhanVienForAuthEmail(session.user.email);
    return { user: buildAppUser(session.user, nhanVien) };
  },

  onAuthStateChange(callback) {
    const supabase = getSupabase();
    if (!supabase) return () => {};
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user?.email) {
        callback(null);
        return;
      }
      const nhanVien = await resolveNhanVienForAuthEmail(session.user.email);
      callback({ user: buildAppUser(session.user, nhanVien) });
    });
    return () => subscription.unsubscribe();
  },
};

export function getAuthService(): AuthService {
  return isSupabase() ? supabaseAuthService : mockAuthService;
}
