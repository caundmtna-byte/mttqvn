/**
 * Dịch lỗi Postgres/PostgREST sang câu tiếng Việt mà cán bộ hiểu được.
 *
 * Người dùng cuối là cán bộ cấp tỉnh và cấp xã/phường, không biết tiếng Anh và
 * không biết thuật ngữ kỹ thuật. Trước đây ~140 điểm `toast.error` đổ thẳng
 * `error.message`, nên khi trùng dữ liệu họ nhìn thấy nguyên văn:
 *
 *     duplicate key value violates unique constraint "uq_var_phong_ban_ten_lower"
 *
 * Thứ tự tra: **tên ràng buộc → mã lỗi → dấu hiệu trong chuỗi → câu mặc định**.
 * Ràng buộc cho câu cụ thể nhất ("Cán bộ này đã là uỷ viên của nhiệm kỳ này rồi"),
 * mã lỗi là lưới an toàn, và **không bao giờ để lọt chuỗi tiếng Anh ra người dùng**.
 */

/** Câu theo TÊN RÀNG BUỘC — cụ thể nhất, ưu tiên cao nhất. */
const BY_CONSTRAINT: Record<string, string> = {
  // --- UNIQUE: trùng dữ liệu (mã 23505) ---
  uq_mttq_uy_vien_uy_ban_nhiem_ky_can_bo: 'Cán bộ này đã là uỷ viên của nhiệm kỳ đã chọn.',
  uq_mttq_uy_vien_uy_ban_nhiem_ky_ma_uv:
    'Mã uỷ viên này đã có người dùng trong nhiệm kỳ. Vui lòng đặt mã khác.',
  uq_mttq_diem_danh_ky_hop_uy_vien: 'Uỷ viên này đã được điểm danh trong kỳ họp.',
  uq_mttq_lop_tap_huan_ct_lop_can_bo: 'Cán bộ này đã có trong danh sách lớp tập huấn.',
  uq_mttq_thiet_lap_loai_ten_lower: 'Tên này đã tồn tại trong danh mục. Vui lòng đặt tên khác.',
  uq_kho_nhap_xuat_kho_so_phieu: 'Số phiếu này đã được dùng. Vui lòng nhập số phiếu khác.',
  uq_kho_danh_muc_hang_hoa_ten_lower: 'Danh mục hàng hoá này đã có. Vui lòng đặt tên khác.',
  uq_kho_danh_sach_hang_hoa_dm_ten_lower: 'Hàng hoá này đã có trong danh mục đã chọn.',
  uq_bai_viet_danh_sach_link_lower: 'Đường dẫn bài viết này đã được nhập trước đó.',
  uq_bai_viet_danh_sach_ten_bai_lower: 'Tên bài viết này đã được nhập trước đó.',
  uq_bai_viet_thiet_lap_the_loai_ten_lower: 'Thể loại này đã tồn tại.',
  uq_bai_viet_thiet_lap_khac_loai_ten_lower: 'Tên này đã tồn tại trong thiết lập. Vui lòng đặt tên khác.',
  uq_pbxh_thiet_lap_loai_ten_lower: 'Tên này đã có trong danh mục phản biện xã hội.',
  idx_dttg_dip_tham_hoi_ten_lower: 'Dịp thăm hỏi này đã tồn tại.',
  uq_var_ssn_tinh_thanh_ten_lower: 'Tỉnh/thành này đã có trong danh sách.',
  uq_var_ssn_xa_phuong_ten_lower_per_tinh: 'Xã/phường này đã có trong tỉnh đã chọn.',
  uq_var_chuc_vu_ten_lower: 'Chức vụ này đã tồn tại.',
  uq_var_phong_ban_ten_lower: 'Phòng ban này đã tồn tại.',
  uq_var_phong_ban_ma: 'Mã phòng ban này đã được dùng.',
  uq_var_phan_quyen_chuc_vu_module: 'Chức vụ này đã được phân quyền cho phần này rồi.',
  uq_luong_thiet_lap_ngach_luong_ten_lower: 'Ngạch lương này đã tồn tại.',
  uq_luong_thiet_lap_ngach_luong_ma_lower: 'Mã ngạch lương này đã được dùng.',
  luong_thiet_lap_bac_luong_ngach_ma_uq: 'Bậc lương này đã có trong ngạch đã chọn.',
  uq_mttq_tang_luong_can_bo_ngay:
    'Cán bộ này đã có một lần nâng lương đúng ngày đã chọn. Kiểm tra lại ngày nâng lương.',

  // --- CHECK: dữ liệu không hợp lệ theo nghiệp vụ (mã 23514) ---
  chk_chuong_trinh_nam_dates: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.',
  chk_kho_nxk_consistency:
    'Thông tin phiếu chưa khớp với loại phiếu. Kiểm tra lại kho nhập, kho xuất, đơn vị cứu trợ và đợt cứu trợ.',
  mttq_nhiem_ky_tu_den_nam_chk: 'Năm kết thúc nhiệm kỳ phải bằng hoặc sau năm bắt đầu.',
  mttq_tang_luong_luong_chk: 'Mức lương không được là số âm.',
  mttq_tang_luong_truoc_han_thang_chk:
    'Số tháng rút ngắn chưa khớp với loại kỳ nâng lương (đúng hạn thì để trống; trước hạn chọn 6, 9 hoặc 12 tháng).',
  mttq_tang_luong_loai_ky_chk: 'Loại kỳ nâng lương chưa hợp lệ.',
  mttq_tang_luong_so_thang_chk: 'Số tháng nhập chưa hợp lệ.',
  mttq_can_bo_cap_quan_ly_check: 'Cấp quản lý chưa hợp lệ. Vui lòng chọn lại trong danh sách.',
  mttq_diem_danh_uy_vien_trang_thai_check: 'Trạng thái điểm danh chưa hợp lệ.',
  mttq_lop_tap_huan_cap_tap_huan_check: 'Cấp tập huấn chưa hợp lệ.',
  mttq_thiet_lap_loai_check: 'Loại thiết lập chưa hợp lệ.',
  kho_don_vi_cuu_tro_loai_chk: 'Loại đối tượng chưa hợp lệ. Vui lòng chọn lại trong danh sách.',
  kho_don_vi_cuu_tro_so_nguoi_chk: 'Số người phải là số nguyên không âm.',
  kho_don_vi_cuu_tro_dv_gioi_thieu_chk:
    'Đơn vị giới thiệu chưa hợp lệ: chọn "MTTQ tỉnh" hoặc một xã/phường cụ thể.',
  kho_don_vi_cuu_tro_don_vi_gioi_thieu_id_fkey:
    'Xã/phường giới thiệu không còn tồn tại hoặc đang được đơn vị hỗ trợ tham chiếu. Vui lòng chọn lại.',
  luong_thiet_lap_bac_luong_he_so_chk: 'Hệ số lương chưa hợp lệ.',
  luong_thiet_lap_bac_luong_ma_bac_chk: 'Mã bậc lương chưa hợp lệ.',
  var_chuc_vu_cap_quan_ly_check: 'Cấp quản lý của chức vụ chưa hợp lệ.',
  var_nhan_vien_cap_quan_ly_check: 'Cấp quản lý của nhân viên chưa hợp lệ.',
  luong_thiet_lap_cau_hinh_singleton_chk: 'Chỉ có một bản cấu hình lương, không thể tạo thêm.',
  var_thong_tin_to_chuc_singleton: 'Chỉ có một bản thông tin tổ chức, không thể tạo thêm.',
  chk_pbxh_thuc_hien_ngay: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.',

  // --- FK: câu riêng, cụ thể hơn câu chung của `messageForForeignKey` ---
  var_nhan_vien_id_chuc_vu_fkey:
    'Còn nhân viên đang giữ chức vụ này nên không xoá được. Hãy chuyển họ sang chức vụ khác trước.',
  var_nhan_vien_id_phong_ban_fkey:
    'Phòng ban đã chọn không còn tồn tại. Vui lòng tải lại trang rồi chọn lại.',
};

/**
 * Câu theo MÃ LỖI NGHIỆP VỤ do RPC plpgsql ném ra dạng `MA_LOI: chi tiết`.
 *
 * PostgREST bọc `RAISE EXCEPTION 'MA_LOI: …'` thành lỗi mã `P0001`, message giữ
 * nguyên chuỗi tiếng Việt. Tra bảng này TRƯỚC tên ràng buộc và mã lỗi để câu
 * hiển thị bám đúng nghiệp vụ thay vì rơi xuống câu chung chung.
 */
const BY_RPC_CODE: Record<string, string> = {
  KHEN_THUONG_CHI_TIET_RONG: 'Quyết định khen thưởng phải có ít nhất 1 cán bộ được khen.',
  KHEN_THUONG_KHONG_TON_TAI:
    'Không tìm thấy quyết định khen thưởng. Có thể bản ghi đã bị người khác xoá.',
  KHEN_THUONG_DONG_LA:
    'Danh sách khen thưởng đã thay đổi ở nơi khác. Vui lòng tải lại trang rồi sửa lại.',
  TAP_HUAN_CHI_TIET_RONG: 'Lớp tập huấn phải có ít nhất 1 cán bộ tham gia.',
  TAP_HUAN_KHONG_TON_TAI: 'Không tìm thấy lớp tập huấn. Có thể bản ghi đã bị người khác xoá.',
  TAP_HUAN_DONG_LA:
    'Danh sách cán bộ của lớp đã thay đổi ở nơi khác. Vui lòng tải lại trang rồi sửa lại.',
  PHAN_QUYEN_MODULE_RONG: 'Chưa xác định được phần cần phân quyền. Vui lòng tải lại trang.',
  PHAN_QUYEN_KHONG_CO_CHUC_VU: 'Chưa chọn chức vụ nào để phân quyền.',
  // Lưới an toàn cho nhóm kho: module Nhập xuất kho tự bóc tiền tố để hiện câu
  // chi tiết (tên kho, tên hàng, thiếu bao nhiêu); hai câu dưới chỉ dùng khi lỗi
  // đi đường khác và còn nguyên mã.
  TON_KHO_KHONG_DU:
    'Tồn kho không đủ — thao tác này sẽ làm tồn kho âm. Kiểm tra lại số lượng hoặc các phiếu xuất liên quan.',
  LOAI_PHIEU_KHONG_DOI_DUOC:
    'Phiếu đã phát hành số nên không đổi được loại phiếu. Hãy xoá phiếu lập sai rồi lập phiếu mới đúng loại.',
  // Khoá kỳ (nhiệm kỳ / kỳ họp). Trigger nêu rõ khoá ở cấp nào và phải mở khoá
  // ở đâu; hai câu dưới là lưới an toàn khi lỗi đi đường khác và còn nguyên mã.
  KY_DA_KHOA:
    'Kỳ này đã khoá sổ nên không ghi thêm được. Hãy mở khoá nhiệm kỳ (hoặc kỳ họp) trước khi sửa.',
  KHOA_KY_KHONG_DU_QUYEN:
    'Bạn không có quyền khoá sổ hoặc mở khoá kỳ. Hãy liên hệ quản trị hệ thống.',
  // Luật chuyển trạng thái. Câu chi tiết do chính trigger nêu (kèm trạng thái cụ
  // thể); câu dưới chỉ là lưới an toàn khi lỗi đi đường khác và còn nguyên mã.
  TRANG_THAI_KHONG_HOP_LE:
    'Không chuyển sang trạng thái đó được từ trạng thái hiện tại. Hãy tải lại trang để xem trạng thái mới nhất.',
  // Nhà đại đoàn kết: đưa hồ sơ vào "Đã phê duyệt" đòi quyền Duyệt (`phe_duyet`),
  // tách khỏi quyền Sửa — xem `20260913103000_nddk_quyen_phe_duyet.sql`.
  PHE_DUYET_KHONG_DU_QUYEN:
    'Bạn không có quyền Duyệt hồ sơ này. Hãy chuyển cho người có quyền phê duyệt, hoặc liên hệ quản trị hệ thống.',
};

/** Câu theo MÃ LỖI — lưới an toàn khi không nhận ra tên ràng buộc. */
const BY_CODE: Record<string, string> = {
  '23505': 'Dữ liệu này đã tồn tại. Vui lòng kiểm tra lại.',
  '23503': 'Dữ liệu đang được sử dụng ở nơi khác nên không thể xoá hoặc thay đổi.',
  '23514': 'Dữ liệu không hợp lệ theo quy định nghiệp vụ.',
  '23502': 'Còn trường bắt buộc chưa nhập.',
  '22P02': 'Sai định dạng dữ liệu. Kiểm tra lại ô ngày tháng hoặc ô số.',
  '22001': 'Nội dung nhập quá dài.',
  '42501': 'Bạn không có quyền thực hiện thao tác này.',
  PGRST116: 'Không tìm thấy bản ghi. Có thể bản ghi đã bị người khác xoá.',
  PGRST301: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  PGRST204: 'Dữ liệu gửi lên không khớp với cấu trúc bảng. Vui lòng tải lại trang.',
};

const FALLBACK = 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';

/** Trích tên ràng buộc từ message/details của PostgREST. */
export function extractConstraintName(text: string): string | undefined {
  return /constraint "([^"]+)"/.exec(text)?.[1];
}

/**
 * Mã mà câu chi tiết do trigger tự nêu đã CỤ THỂ HƠN câu chung trong bảng —
 * nêu đúng khoá ở cấp nào và phải mở khoá ở đâu ("Nhiệm kỳ đã khoá sổ, không
 * sửa được uỷ viên…" so với "Kỳ này đã khoá sổ…"). Với những mã này thì bóc
 * tiền tố và giữ nguyên câu của trigger; câu trong `BY_RPC_CODE` chỉ còn là
 * lưới an toàn khi lỗi đi đường khác và mất phần chi tiết.
 */
const GIU_CAU_CHI_TIET = new Set(['KY_DA_KHOA', 'KHOA_KY_KHONG_DU_QUYEN']);

/**
 * Câu tiếng Việt cho mã lỗi nghiệp vụ `MA_LOI: chi tiết` do RPC ném ra.
 * Trả `undefined` nếu chuỗi không chứa mã nào đã biết.
 */
export function messageForRpcErrorCode(text: string | null | undefined): string | undefined {
  const s = String(text ?? '');
  if (!s) return undefined;
  for (const code of Object.keys(BY_RPC_CODE)) {
    const at = s.indexOf(code);
    if (at < 0) continue;
    if (GIU_CAU_CHI_TIET.has(code)) {
      const chiTiet = s.slice(at + code.length).replace(/^\s*:\s*/, '').trim();
      if (chiTiet) return chiTiet;
    }
    return BY_RPC_CODE[code];
  }
  return undefined;
}

/** Suy ra loại thao tác từ tên FK `<bảng>_<cột>_fkey` — 63 FK đều theo mẫu này. */
function messageForForeignKey(constraint: string): string | undefined {
  if (!constraint.endsWith('_fkey')) return undefined;
  if (constraint.includes('id_nguoi_tao')) {
    return 'Không xoá được vì người này đã tạo dữ liệu trong hệ thống. Hãy chuyển sang trạng thái Khoá thay vì xoá.';
  }
  return 'Dữ liệu này đang được sử dụng ở nơi khác nên không thể xoá. Hãy gỡ khỏi nơi đang dùng trước.';
}

/**
 * Câu theo MESSAGE CỦA GOTRUE (đăng nhập, đổi mật khẩu, tạo tài khoản).
 *
 * GoTrue luôn trả tiếng Anh và không có mã lỗi ổn định để tra, nên khớp theo
 * chuỗi con đã chuyển chữ thường. Trước đây `signIn` trả thẳng `error.message`
 * nên người dùng nhập sai mật khẩu thì thấy `Invalid login credentials`.
 */
const BY_AUTH_MESSAGE: Array<[RegExp, string]> = [
  [/invalid login credentials|invalid credentials/, 'Tên đăng nhập hoặc mật khẩu không đúng.'],
  [/email not confirmed/, 'Tài khoản chưa được kích hoạt. Liên hệ quản trị hệ thống.'],
  [/email logins are disabled|signups not allowed/, 'Chức năng đăng nhập đang tạm tắt. Liên hệ quản trị hệ thống.'],
  [
    /too many requests|rate limit|you can only request this after/,
    'Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.',
  ],
  [/user already registered|user already exists/, 'Tên đăng nhập này đã có tài khoản.'],
  [
    /new password should be different/,
    'Mật khẩu mới phải khác mật khẩu hiện tại.',
  ],
  [/password should be at least/, 'Mật khẩu quá ngắn. Vui lòng đặt mật khẩu dài hơn.'],
  [/unable to validate email address|invalid email/, 'Tên đăng nhập không hợp lệ.'],
  [/auth session missing|session not found/, 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'],
  [/user not found/, 'Không tìm thấy tài khoản đăng nhập tương ứng.'],
];

/**
 * Câu tiếng Việt cho message của GoTrue. Trả `undefined` nếu không nhận ra —
 * nơi gọi tự quyết câu mặc định theo ngữ cảnh (đăng nhập / đổi mật khẩu / tạo
 * tài khoản), vì câu chung chung ở đây sẽ kém hữu ích hơn.
 */
export function messageForAuthError(text: string | null | undefined): string | undefined {
  const m = String(text ?? '').toLowerCase();
  if (!m) return undefined;
  for (const [re, cau] of BY_AUTH_MESSAGE) {
    if (re.test(m)) return cau;
  }
  return undefined;
}

/** Dấu hiệu trong chuỗi — dùng khi không có mã (lỗi mạng, lỗi fetch của trình duyệt). */
function messageForText(text: string): string | undefined {
  const m = text.toLowerCase();
  if (/failed to fetch|networkerror|network error|err_internet|ecconnrefused|econnrefused/.test(m)) {
    return 'Không có kết nối tới máy chủ. Kiểm tra mạng rồi thử lại.';
  }
  if (/timeout|timed out|etimedout/.test(m)) return 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.';
  if (/jwt|refresh token|session|unauthorized|401/.test(m)) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }
  if (/forbidden|403|row-level security|violates row-level/.test(m)) {
    return 'Bạn không có quyền thực hiện thao tác này.';
  }
  if (/duplicate key|already exists/.test(m)) return BY_CODE['23505']!;
  if (/foreign key|still referenced/.test(m)) return BY_CODE['23503']!;
  if (/violates check constraint/.test(m)) return BY_CODE['23514']!;
  if (/null value in column/.test(m)) return BY_CODE['23502']!;
  if (/invalid input syntax/.test(m)) return BY_CODE['22P02']!;
  if (/5\d\d|internal server|bad gateway/.test(m)) return 'Lỗi máy chủ. Vui lòng thử lại sau.';
  return undefined;
}

export interface SupabaseErrorContext {
  code?: string;
  constraint?: string;
  message?: string;
}

/**
 * Trả về câu tiếng Việt cho một lỗi Supabase. **Luôn** trả tiếng Việt —
 * không bao giờ trả lại chuỗi gốc tiếng Anh.
 */
export function mapSupabaseErrorToVietnamese(ctx: SupabaseErrorContext): string {
  const raw = ctx.message ?? '';

  // Lỗi nghiệp vụ do RPC tự ném — cụ thể hơn mọi thứ còn lại.
  const byRpc = messageForRpcErrorCode(raw);
  if (byRpc) return byRpc;

  // Lỗi GoTrue không có mã lẫn tên ràng buộc nên phải tra trước khi rơi xuống
  // `messageForText` — nơi mọi chuỗi chứa "session" đều thành "hết phiên".
  const byAuth = messageForAuthError(raw);
  if (byAuth) return byAuth;

  const constraint = ctx.constraint ?? extractConstraintName(raw);

  if (constraint) {
    const byName = BY_CONSTRAINT[constraint];
    if (byName) return byName;
    const byFk = messageForForeignKey(constraint);
    if (byFk) return byFk;
  }
  if (ctx.code && BY_CODE[ctx.code]) return BY_CODE[ctx.code]!;
  const byText = messageForText(raw);
  if (byText) return byText;
  return FALLBACK;
}

/** Dành cho test và cho màn Phân quyền khi cần liệt kê. */
export const __ERROR_MESSAGE_TABLES = {
  BY_CONSTRAINT,
  BY_CODE,
  BY_RPC_CODE,
  BY_AUTH_MESSAGE,
  FALLBACK,
};
