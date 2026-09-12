import type { User } from '@/types';
import type { ActionType } from '@/features/he-thong/phan-quyen/core/types';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';

/**
 * Hành động gắn với UI (nút, route) — mở rộng theo nghiệp vụ.
 * Khi có policy server-side, vẫn phải kiểm tra lại API.
 */
/**
 * `approve` = quyền **Duyệt** (`phe_duyet` trong ma trận). Tách khỏi `edit` vì
 * "sửa được hồ sơ" không đồng nghĩa với "được ban hành quyết định" — trước đây
 * nút đổi trạng thái chỉ gác bằng `canEdit`, nên người nhập liệu tự ban hành
 * quyết định khen thưởng của chính mình.
 */
export type AppAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'import' | 'approve';

/**
 * Tài nguyên (module) — thêm khi có module mới.
 */
export type AppResource =
  | 'employees'
  | 'departments'
  | 'positions'
  | 'company'
  | 'permissions'
  | 'provinces'
  | 'articleSettings'
  | 'articles'
  | 'articleStats'
  | 'articleCommission'
  | 'matTranThietLapCaiDat'
  | 'matTranOfficerList'
  | 'matTranOfficerStats'
  | 'matTranRewardList'
  | 'matTranTrainingList'
  | 'matTranTerm'
  | 'matTranSession'
  | 'matTranCommitteeMembers'
  | 'matTranCommitteeMemberStats'
  | 'matTranReliefCampaign'
  | 'matTranReliefGoods'
  | 'matTranReliefStockTransactions'
  | 'matTranReliefInventory'
  | 'matTranReliefWarehouseList'
  | 'matTranReliefSupportUnits'
  | 'matTranReliefSupportReport'
  | 'matTranSalaryIncreaseList'
  | 'matTranSalarySetup'
  | 'annualPrograms'
  | 'tasks'
  | 'taskReports'
  | 'otherInfoMttqNews'
  | 'otherInfoZaloOa'
  | 'otherInfoMatTranSo'
  | 'otherInfoQuanLyVanBan'
  | 'otherInfoLichCongTacBanTt'
  | 'otherInfoSoTayDangVien'
  | 'otherInfoThuTucHanhChinhDang'
  | 'phanBienThucHien'
  | 'phanBienThietLapDanhMuc'
  | 'phanBienThongKe'
  | 'danTocCaNhanTieuBieu'
  | 'danTocToChucQuanTrong'
  | 'danTocDipThamHoi'
  | 'danTocThamHoiToChuc'
  | 'danTocThamHoiCaNhan'
  | 'danTocThamHoiThongKe'
  | 'danTocThongKeToChucCaNhan'
  /**
   * Quỹ tiền — **một resource dùng chung cho CẢ HAI quỹ** (Vì người nghèo và
   * Cứu trợ). Lý do: RLS trên Supabase siết quyền ghi theo `module_key` là
   * segment cuối đường dẫn (`so-thu-chi`, `danh-muc-chi-phi`,
   * `danh-muc-tai-khoan`), mà hai quỹ dùng chung ba key đó. Khai báo hai bộ
   * resource riêng ở client chỉ tạo ảo giác tách được quyền, trong khi DB vẫn
   * cho/chặn cả hai như nhau.
   */
  | 'quySoThuChi'
  | 'quyDanhMucKhoan'
  | 'quyDanhMucTaiKhoan'
  | 'quyBaoCaoThongKe'
  | 'nhaDaiDoanKetList'
  | 'nhaDaiDoanKetThongKe'
  | 'profile'
  | 'notifications'
  | '*';

/**
 * Ánh xạ `AppResource` → `module_id` trong Phân quyền (vd. `he-thong/nhan-vien`).
 * Không có trong map → `can()` dùng luật legacy (profile, notifications, *).
 */
export const APP_RESOURCE_TO_MODULE: Partial<Record<AppResource, string>> = {
  employees: 'he-thong/nhan-vien',
  departments: 'he-thong/phong-ban',
  positions: 'he-thong/chuc-vu',
  company: 'he-thong/thong-tin-to-chuc',
  permissions: 'he-thong/phan-quyen',
  provinces: 'he-thong/danh-sach-tinh-thanh',
  articleSettings: 'quan-ly-viet-bai/thiet-lap-bai-viet',
  articles: 'quan-ly-viet-bai/bai-viet',
  articleStats: 'quan-ly-viet-bai/bc-thong-ke-bai-viet',
  articleCommission: 'quan-ly-viet-bai/nhuan-but-viet-bai',
  matTranThietLapCaiDat: 'mat-tran-to-quoc/thiet-lap-khac/thiet-lap-cai-dat',
  matTranOfficerList: 'mat-tran-to-quoc/thiet-lap-khac/danh-sach-can-bo',
  matTranOfficerStats: 'mat-tran-to-quoc/thiet-lap-khac/bao-cao-can-bo',
  matTranRewardList: 'mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong',
  matTranTrainingList: 'mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan',
  matTranTerm: 'mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky',
  matTranSession: 'mat-tran-to-quoc/uy-vien-uy-ban/ky-hop',
  matTranCommitteeMembers: 'mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien',
  matTranCommitteeMemberStats: 'mat-tran-to-quoc/uy-vien-uy-ban/bao-cao-uy-vien',
  matTranReliefCampaign: 'an-sinh-xa-hoi/kho-cuu-tro/dot-cuu-tro',
  /** Hàng hóa cứu trợ — `module_key` DB: `hang-hoa`. Luật `can()`: `cap_bac===1` hoặc `quan_tri`→`admin`/`all` = toàn quyền UI; không thì từng hành động xem/thêm/sửa/xóa theo ma trận. */
  matTranReliefGoods: 'an-sinh-xa-hoi/kho-cuu-tro/hang-hoa',
  matTranReliefStockTransactions: 'an-sinh-xa-hoi/kho-cuu-tro/nhap-xuat-kho',
  matTranReliefInventory: 'an-sinh-xa-hoi/kho-cuu-tro/ton-kho',
  matTranReliefWarehouseList: 'an-sinh-xa-hoi/kho-cuu-tro/danh-sach-kho',
  matTranReliefSupportUnits: 'an-sinh-xa-hoi/kho-cuu-tro/don-vi-cuu-tro',
  matTranReliefSupportReport: 'an-sinh-xa-hoi/kho-cuu-tro/bao-cao-ho-tro',
  /** Danh sách tăng lương — `can()`: `cap_bac===1` hoặc `quan_tri` (`admin`/`all`) hoặc token `xem`/`them`/`sua`/`xoa`. */
  matTranSalaryIncreaseList: 'mat-tran-to-quoc/quan-ly-luong/danh-sach-tang-luong',
  /** Thiết lập lương — cùng luật `can()` như danh sách tăng lương. */
  matTranSalarySetup: 'mat-tran-to-quoc/quan-ly-luong/thiet-lap-luong',
  annualPrograms: 'quan-ly-giao-viec/chuong-trinh-nam',
  tasks: 'quan-ly-giao-viec/cong-viec',
  taskReports: 'quan-ly-giao-viec/bao-cao-cong-viec',
  otherInfoMttqNews: 'trang-thong-tin-khac/tin-tuc-mttq',
  otherInfoZaloOa: 'trang-thong-tin-khac/zalo-oa',
  otherInfoMatTranSo: 'trang-thong-tin-khac/mat-tran-so',
  otherInfoQuanLyVanBan: 'trang-thong-tin-khac/quan-ly-van-ban',
  otherInfoLichCongTacBanTt: 'trang-thong-tin-khac/lich-cong-tac-ban-tt',
  otherInfoSoTayDangVien: 'trang-thong-tin-khac/so-tay-dang-vien',
  otherInfoThuTucHanhChinhDang: 'trang-thong-tin-khac/thu-tuc-hanh-chinh-dang',
  phanBienThucHien: 'phan-bien-xa-hoi/thuc-hien-phan-bien-xa-hoi',
  phanBienThietLapDanhMuc: 'phan-bien-xa-hoi/thiet-lap-danh-muc',
  phanBienThongKe: 'phan-bien-xa-hoi/thong-ke-phan-bien-xa-hoi',
  danTocCaNhanTieuBieu: 'dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu',
  danTocToChucQuanTrong: 'dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong',
  danTocDipThamHoi: 'dan-toc-ton-giao/tham-hoi/dip-tham-hoi',
  danTocThamHoiToChuc: 'dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc',
  danTocThamHoiCaNhan: 'dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan',
  danTocThamHoiThongKe: 'dan-toc-ton-giao/tham-hoi/thong-ke-tham-hoi',
  danTocThongKeToChucCaNhan: 'dan-toc-ton-giao/thong-tin/thong-ke-to-chuc-ca-nhan',
  /**
   * Quỹ tiền — `module_id` cố ý KHÔNG mang tên quỹ nào (`.../quy/...`) vì một
   * dòng phân quyền áp cho cả Quỹ vì người nghèo lẫn Quỹ cứu trợ. Segment cuối
   * chính là `module_key` mà RLS kiểm tra, nên phải giữ nguyên chữ.
   * `bao-cao-thong-ke` không có bảng riêng (chỉ đọc lại sổ) nên không xuất hiện
   * trong RLS, nhưng vẫn cần một dòng phân quyền để ẩn/hiện màn báo cáo.
   */
  quySoThuChi: 'an-sinh-xa-hoi/quy/so-thu-chi',
  quyDanhMucKhoan: 'an-sinh-xa-hoi/quy/danh-muc-chi-phi',
  quyDanhMucTaiKhoan: 'an-sinh-xa-hoi/quy/danh-muc-tai-khoan',
  quyBaoCaoThongKe: 'an-sinh-xa-hoi/quy/bao-cao-thong-ke',
  /**
   * Nhà đại đoàn kết. `module_key` lưu DB là KHÓA NGẮN, và segment cuối ở đây
   * ('danh-sach' / 'thong-ke') quá chung nên hai module này khai `storageKey`
   * tường minh trong `permission-modules-config.ts`:
   * 'nha-dai-doan-ket' và 'thong-ke-nha-dai-doan-ket'. RLS của bảng
   * `nddk_nha_dai_doan_ket` gọi `fn_co_quyen('nha-dai-doan-ket', …)`.
   */
  nhaDaiDoanKetList: 'an-sinh-xa-hoi/nha-dai-doan-ket/danh-sach',
  nhaDaiDoanKetThongKe: 'an-sinh-xa-hoi/nha-dai-doan-ket/thong-ke',
};

/** Module id cũ (Thông tin công ty) — vẫn tính quyền khi ma trận chưa cập nhật. */
const COMPANY_MODULE_ID_LEGACY = 'he-thong/thong-tin-cong-ty';

/** UI dùng `edit`; ma trận phân quyền dùng `update`. */
export function mapAppActionToActionType(action: AppAction): ActionType {
  if (action === 'edit') return 'update';
  return action as ActionType;
}

/**
 * Luật áp dụng khi ma trận quyền CHƯA hydrate (hoặc hydrate thất bại).
 *
 * **Deny-by-default.** Trước đây hàm này có dòng `if (action === 'view') return true;`
 * — cho xem MỌI module. Vì `usePermissionGrantStore` không persist nên `matrixActive`
 * là `false` sau mỗi lần tải lại trang, và nếu truy vấn quyền lỗi thì nó ở lại `false`
 * suốt phiên ⇒ toàn bộ hệ thống mở toang. Cộng với RLS `USING (true)` ở Supabase thì
 * dữ liệu về thật, không chỉ là menu hiện thừa.
 *
 * Chỉ giữ hai ngoại lệ không thuộc nghiệp vụ: hồ sơ cá nhân và thông báo của chính mình.
 *
 * Trong lúc chờ, UI **không được** coi `false` ở đây là "không có quyền" — phải đọc
 * `matrixLoading` (xem `hooks/use-module-access.ts`) và hiện trạng thái tải.
 */
function legacyCan(user: User, action: AppAction, resource: AppResource): boolean {
  void user;
  if (resource === 'profile' && (action === 'edit' || action === 'view')) return true;
  if (resource === 'notifications' && action === 'view') return true;
  return false;
}

function grantsAllow(allowed: readonly string[], need: ReturnType<typeof mapAppActionToActionType>): boolean {
  if (allowed.includes('all') || allowed.includes('admin')) return true;
  return allowed.includes(need);
}

/**
 * `var_chuc_vu.cap_bac === 1` sau khi hydrate — dùng `Number` vì giá trị có thể là bigint/string từ API.
 * Dùng chung `can()` bypass và UI nhúng (vd. detail cán bộ).
 */
export function isChucVuCapBacOne(cap: number | null | undefined): boolean {
  if (cap == null) return false;
  const n = Number(cap);
  return Number.isFinite(n) && n === 1;
}

/** Luật OR Phòng ban: `cap_bac === 1` (chức vụ hydrate) hoặc ma trận `admin`/`all` hoặc đúng token matrix. */
function canDepartmentsWithCapBac(
  user: User,
  action: AppAction,
  grantsByModule: Record<string, ActionType[]>,
  chucVuCapBac: number | null
): boolean {
  void user;
  const moduleId = APP_RESOURCE_TO_MODULE.departments;
  if (!moduleId) return false;
  const capBypassActions: AppAction[] = ['view', 'create', 'edit', 'delete', 'export', 'import', 'approve'];
  if (isChucVuCapBacOne(chucVuCapBac) && capBypassActions.includes(action)) {
    return true;
  }
  const need = mapAppActionToActionType(action);
  const allowed = grantsByModule[moduleId] ?? [];
  // Xem được ⇒ xuất được; nhập thì phải có quyền thêm mới (xem ghi chú ở `can`).
  if (action === 'export' && grantsAllow(allowed, 'view')) {
    return true;
  }
  if (action === 'import') {
    return grantsAllow(allowed, mapAppActionToActionType('create'));
  }
  return grantsAllow(allowed, need);
}

function matrixCan(user: User, action: AppAction, resource: AppResource): boolean {
  void user;
  const moduleId = APP_RESOURCE_TO_MODULE[resource];
  if (moduleId === undefined) {
    return legacyCan(user, action, resource);
  }
  const need = mapAppActionToActionType(action);
  const { grantsByModule } = usePermissionGrantStore.getState();

  if (resource === 'company') {
    const ids = [moduleId, COMPANY_MODULE_ID_LEGACY];
    for (const id of ids) {
      const allowed = grantsByModule[id] ?? [];
      if (grantsAllow(allowed, need)) return true;
    }
    return false;
  }

  const allowed = grantsByModule[moduleId] ?? [];
  return grantsAllow(allowed, need);
}

/**
 * Kiểm tra quyền phía client (UX: ẩn nút). Không thay thế RLS / API.
 *
 * - Mock mode admin (`user.role === 'admin'`): toàn quyền UI (trừ xóa profile).
 * - Supabase mode: mọi user đều `role='user'`, quyền hoàn toàn từ `var_chuc_vu.cap_bac` + `var_phan_quyen`.
 * - Không có `id_chuc_vu` (matrix mode) → deny all.
 * - Khi `matrixActive === true`: đối chiếu `grantsByModule` theo `module_id` + `ActionType`.
 */
export function can(
  user: User | null | undefined,
  action: AppAction,
  resource: AppResource
): boolean {
  if (!user) return false;

  if (user.role === 'admin') {
    if (resource === 'profile' && action === 'delete') return false;
    return true;
  }

  // Không có chức vụ → không có quyền module nghiệp vụ
  if (!user.id_chuc_vu) {
    return false;
  }

  const { matrixActive, grantsByModule, chucVuCapBac } = usePermissionGrantStore.getState();
  if (matrixActive) {
    // cap_bac=1: bypass đủ thao tác UI (kể cả xuất/nhập) cho mọi module có trong APP_RESOURCE_TO_MODULE
    const capBypassActions: AppAction[] = ['view', 'create', 'edit', 'delete', 'export', 'import', 'approve'];
    if (
      isChucVuCapBacOne(chucVuCapBac) &&
      APP_RESOURCE_TO_MODULE[resource] !== undefined &&
      capBypassActions.includes(action)
    ) {
      return true;
    }

    if (resource === 'departments') {
      return canDepartmentsWithCapBac(user, action, grantsByModule, chucVuCapBac);
    }
    // Xem được ⇒ xuất được: dữ liệu đó vốn đã hiện trên màn hình rồi.
    //
    // NHẬP thì KHÔNG: nhập từ Excel là GHI hàng loạt vào cơ sở dữ liệu, nên phải
    // có quyền thêm mới. Trước đây gộp chung hai hành động nên người chỉ được
    // xem vẫn thấy và bấm được nút Nhập.
    if (
      action === 'export' &&
      APP_RESOURCE_TO_MODULE[resource] !== undefined &&
      matrixCan(user, 'view', resource)
    ) {
      return true;
    }
    if (action === 'import') {
      return matrixCan(user, 'create', resource);
    }
    return matrixCan(user, action, resource);
  }

  return legacyCan(user, action, resource);
}
