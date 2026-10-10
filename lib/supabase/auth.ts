import { getSupabase } from '@/lib/supabase/client';
import type { User } from '@/types';
import { loginNameToSupabaseEmail, supabaseEmailToLoginName } from '@/lib/auth-email';
import { messageForAuthError } from '@/lib/supabase/error-messages';
import {
  phanLoaiHoSo,
  phanLoaiLoiSession,
  type KetQuaTraHoSo,
} from '@/lib/supabase/phan-loai-phien';

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

/**
 * Kết quả đối chiếu phiên. Chỉ `mat_phien` mới được đăng xuất người dùng —
 * `chua_xac_dinh` (lỗi mạng tạm thời…) phải giữ nguyên phiên. Xem `phan-loai-phien.ts`.
 */
export type KetQuaDoiChieuPhien =
  | { trang_thai: 'hop_le'; user: User }
  | { trang_thai: 'mat_phien' }
  | { trang_thai: 'chua_xac_dinh' };

export interface AuthService {
  signIn(credentials: SignInCredentials): Promise<{ user: User } | { error: string }>;
  signUp(credentials: SignUpCredentials): Promise<{ user?: User; error?: string }>;
  signOut(): Promise<void>;
  getSession(): Promise<KetQuaDoiChieuPhien>;
  onAuthStateChange(callback: (ketQua: KetQuaDoiChieuPhien) => void): () => void;
}

const VAR_NHAN_VIEN_AUTH_COLUMNS =
  'id, ten_tai_khoan, ho_va_ten, hinh_anh, id_phong_ban, id_bo_phan, id_chuc_vu, don_vi_id, cap_quan_ly, trang_thai';

export interface VarNhanVienAuthRow {
  id: string;
  ten_tai_khoan: string;
  ho_va_ten: string;
  hinh_anh: string | null;
  id_phong_ban: string | null;
  id_bo_phan: string | null;
  id_chuc_vu: string | null;
  don_vi_id?: string | null;
  cap_quan_ly?: string[];
  /** Tên chức vụ sau khi tra `var_chuc_vu` (không có FK embed trên `var_nhan_vien`). */
  ten_chuc_vu?: string | null;
  trang_thai: 'Hoạt động' | 'Khóa';
}

/**
 * Tra cứu nhân viên theo `ten_tai_khoan` (không phân biệt hoa thường).
 * Lỗi truy vấn trả `loi`, KHÔNG gộp vào `khong_co` — gộp lại thì một lần chập mạng
 * bị hiểu là "không còn hồ sơ" và người dùng bị đăng xuất.
 */
export async function getEmployeeByUsername(username: string): Promise<KetQuaTraHoSo<VarNhanVienAuthRow>> {
  const supabase = getSupabase();
  if (!supabase) return { loai: 'loi' };
  const { data, error } = await supabase
    .from('var_nhan_vien')
    .select(VAR_NHAN_VIEN_AUTH_COLUMNS)
    .ilike('ten_tai_khoan', username.trim())
    .maybeSingle();
  if (error) return { loai: 'loi' };
  const row = (data as VarNhanVienAuthRow | null) ?? null;
  if (!row) return { loai: 'khong_co' };
  if (!row.id_chuc_vu) return { loai: 'tim_thay', hoSo: row };
  const { data: cv, error: cvErr } = await supabase
    .from('var_chuc_vu')
    .select('ten_chuc_vu')
    .eq('id', row.id_chuc_vu)
    .maybeSingle();
  if (cvErr || !cv) return { loai: 'tim_thay', hoSo: row };
  const ten = (cv as { ten_chuc_vu?: string }).ten_chuc_vu;
  return { loai: 'tim_thay', hoSo: { ...row, ten_chuc_vu: ten?.trim() ? ten : null } };
}

/**
 * Lấy dòng `var_nhan_vien` khớp tài khoản Auth: phần local của email phải trùng `ten_tai_khoan`
 * và email đăng nhập phải đúng dạng `<ten_tai_khoan>@gmail.com`.
 */
async function resolveNhanVienForAuthEmail(
  authEmail: string | undefined,
): Promise<KetQuaTraHoSo<VarNhanVienAuthRow>> {
  if (!authEmail?.trim()) return { loai: 'khong_co' };
  const normalizedEmail = authEmail.trim().toLowerCase();
  const login = supabaseEmailToLoginName(authEmail);
  if (!login) return { loai: 'khong_co' };
  const ketQua = await getEmployeeByUsername(login);
  if (ketQua.loai !== 'tim_thay') return ketQua;
  if (loginNameToSupabaseEmail(ketQua.hoSo.ten_tai_khoan).toLowerCase() !== normalizedEmail) {
    return { loai: 'khong_co' };
  }
  return ketQua;
}

/** Ghép kết quả tra hồ sơ thành kết quả đối chiếu phiên. */
function doiChieuHoSo(
  authUser: Parameters<typeof buildAppUser>[0],
  ketQua: KetQuaTraHoSo<VarNhanVienAuthRow>,
): KetQuaDoiChieuPhien {
  const trangThai = phanLoaiHoSo(ketQua);
  if (trangThai === 'hop_le' && ketQua.loai === 'tim_thay') {
    return { trang_thai: 'hop_le', user: buildAppUser(authUser, ketQua.hoSo) };
  }
  return { trang_thai: trangThai === 'mat_phien' ? 'mat_phien' : 'chua_xac_dinh' };
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
    cap_quan_ly: Array.isArray(nhanVien?.cap_quan_ly) ? nhanVien.cap_quan_ly : [],
    trang_thai: nhanVien?.trang_thai,
  };
}

const authService: AuthService = {
  async signIn(credentials) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase chưa được cấu hình' };
    const { data, error } = await supabase.auth.signInWithPassword(credentials);
    // GoTrue chỉ trả tiếng Anh ("Invalid login credentials") mà `pages/Login.tsx`
    // đổ thẳng ra toast, nên phải dịch ngay tại đây.
    if (error) {
      return {
        error: messageForAuthError(error.message) ?? 'Đăng nhập không thành công. Vui lòng thử lại.',
      };
    }
    if (!data.user?.email) return { error: 'Đăng nhập thất bại' };

    const ketQua = await resolveNhanVienForAuthEmail(data.user.email);
    if (ketQua.loai === 'loi') {
      await supabase.auth.signOut({ scope: 'local' });
      return { error: 'Không kết nối được máy chủ. Vui lòng thử lại.' };
    }
    if (ketQua.loai === 'khong_co') {
      await supabase.auth.signOut({ scope: 'local' });
      return { error: 'Không tìm thấy hồ sơ nhân viên trùng tên đăng nhập. Liên hệ quản trị viên.' };
    }
    if (ketQua.hoSo.trang_thai === 'Khóa') {
      await supabase.auth.signOut({ scope: 'local' });
      return { error: 'Tài khoản đã bị khoá. Liên hệ quản trị viên.' };
    }
    return { user: buildAppUser(data.user, ketQua.hoSo) };
  },

  async signUp({ email, password, fullName }) {
    const supabase = getSupabase();
    if (!supabase) return { error: 'Supabase chưa được cấu hình' };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      return {
        error: messageForAuthError(error.message) ?? 'Không tạo được tài khoản đăng nhập. Vui lòng thử lại.',
      };
    }
    if (data.user?.email) {
      const ketQua = await resolveNhanVienForAuthEmail(data.user.email);
      return { user: buildAppUser(data.user, ketQua.loai === 'tim_thay' ? ketQua.hoSo : null) };
    }
    return {};
  },

  async signOut() {
    const supabase = getSupabase();
    // `scope: 'local'`: chỉ thu hồi phiên của máy này. Mặc định của supabase-js là
    // 'global' — đăng xuất (kể cả tự động) ở một máy sẽ đá MỌI máy cùng tài khoản.
    if (supabase) await supabase.auth.signOut({ scope: 'local' });
  },

  async getSession() {
    const supabase = getSupabase();
    if (!supabase) return { trang_thai: 'mat_phien' };
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    // Làm mới token gặp lỗi mạng: supabase-js trả session null kèm lỗi nhưng vẫn giữ token.
    if (error) {
      return phanLoaiLoiSession(error) === 'mat_phien'
        ? { trang_thai: 'mat_phien' }
        : { trang_thai: 'chua_xac_dinh' };
    }
    if (!session?.user?.email) return { trang_thai: 'mat_phien' };
    // Khoá tài khoản phải có hiệu lực với cả phiên ĐANG mở, không chỉ lúc đăng nhập.
    // Trước đây chỉ `signIn` kiểm `trang_thai`, nên khoá một người đang online thì
    // họ dùng tiếp đến khi tự đăng xuất (bật "Ghi nhớ đăng nhập" có thể là hàng tuần).
    return doiChieuHoSo(session.user, await resolveNhanVienForAuthEmail(session.user.email));
  },

  onAuthStateChange(callback) {
    const supabase = getSupabase();
    if (!supabase) return () => {};
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user?.email) {
        // Chỉ SIGNED_OUT mới là mất phiên thật; sự kiện khác không có session thì bỏ qua.
        if (event === 'SIGNED_OUT') callback({ trang_thai: 'mat_phien' });
        return;
      }
      const email = session.user.email;
      const authUser = session.user;
      // QUAN TRỌNG: KHÔNG gọi Supabase bên trong callback này.
      // supabase-js giữ khoá auth trong suốt lúc callback chạy; một truy vấn ở đây
      // sẽ chờ khoá đó và khoá đó chờ callback kết thúc ⇒ khoá chết, MỌI truy vấn
      // của app treo vĩnh viễn mà không phát request nào.
      // `setTimeout(…, 0)` đẩy phần tra cứu hồ sơ ra ngoài phạm vi khoá.
      setTimeout(() => {
        void (async () => {
          // Không còn hồ sơ / bị khoá ⇒ mất phiên; lỗi tra cứu ⇒ chưa xác định, giữ phiên.
          callback(doiChieuHoSo(authUser, await resolveNhanVienForAuthEmail(email)));
        })();
      }, 0);
    });
    return () => subscription.unsubscribe();
  },
};

export function getAuthService(): AuthService {
  return authService;
}
