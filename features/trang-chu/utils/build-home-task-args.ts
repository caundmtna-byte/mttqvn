/**
 * Dựng tham số cho RPC `cong_viec_bao_cao_kpi` phục vụ 3 thẻ công việc ở Trang chủ.
 *
 * **Vì sao không dùng viewer của trang Báo cáo công việc:** ở Trang chủ mọi con số đều
 * là "của tôi", nên phạm vi hẹp nhất có thể là đủ — và hẹp nhất cũng là an toàn nhất.
 * Ta luôn gửi `p_view_all = false`, `p_viewer_don_vi_id = null`, `p_viewer_phong_ban_id = null`
 * và chỉ để lại `p_viewer_id = <chính mình>`. RPC ghép các tiêu chí phạm vi bằng `OR`,
 * nên gửi thừa một tiêu chí là nới quyền; gửi đúng một tiêu chí thì dù cán bộ ở cấp nào
 * cũng không thể đếm nhầm sang dòng của người khác. Điều này quan trọng vì RLS trên
 * Supabase vẫn là `USING (true)` — chặn dữ liệu đang nằm hoàn toàn ở phía client.
 *
 * Kết quả: mệnh đề phạm vi rút gọn còn đúng phần giao với bộ lọc "của tôi":
 * - `p_id_trach_nhiem = [tôi]` ⇒ chỉ việc tôi phụ trách.
 * - `p_id_nguoi_tao   = [tôi]` ⇒ chỉ việc tôi giao.
 */
import type { TaskReportRpcArgs } from '@/features/quan-ly-giao-viec/bao-cao-cong-viec/core/types';
import { TASK_REPORT_ALL_RANGE_START } from '@/features/quan-ly-giao-viec/bao-cao-cong-viec/utils/build-rpc-args';
import type { CongViecTrangThai } from '@/features/quan-ly-giao-viec/cong-viec/core/constants';

/** Trạng thái coi là "chưa xong" — dùng cho thẻ "Việc tôi giao chưa xong". */
export const HOME_TRANG_THAI_CHUA_XONG: CongViecTrangThai[] = ['Mới', 'Đang thực hiện', 'Tạm dừng'];

/** Ngày hôm nay dạng YYYY-MM-DD theo lịch địa phương (không dùng UTC để khỏi lệch múi giờ). */
export function homeTodayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function baseArgs(viewerId: number, today: string): TaskReportRpcArgs {
  return {
    p_start: TASK_REPORT_ALL_RANGE_START,
    p_end: today,
    p_id_trach_nhiem: null,
    p_id_nguoi_tao: null,
    p_trang_thai: null,
    p_muc_do: null,
    p_overdue_only: false,
    p_viewer_id: viewerId,
    p_viewer_don_vi_id: null,
    p_viewer_phong_ban_id: null,
    p_view_all: false,
  };
}

/** Việc **tôi phụ trách** — lấy `qua_han` và `sap_het_han` từ 1 lần gọi RPC. */
export function buildMyTasksKpiArgs(viewerId: number, now: Date = new Date()): TaskReportRpcArgs {
  return { ...baseArgs(viewerId, homeTodayIso(now)), p_id_trach_nhiem: [viewerId] };
}

/** Việc **tôi giao** và chưa xong — lấy `total` từ 1 lần gọi RPC. */
export function buildMyAssignedOpenKpiArgs(
  viewerId: number,
  now: Date = new Date(),
): TaskReportRpcArgs {
  return {
    ...baseArgs(viewerId, homeTodayIso(now)),
    p_id_nguoi_tao: [viewerId],
    p_trang_thai: HOME_TRANG_THAI_CHUA_XONG,
  };
}

/** `var_nhan_vien.id` của người đang đăng nhập, hoặc null nếu tài khoản chưa gắn hồ sơ nhân viên. */
export function resolveHomeViewerId(nhanVienId: string | number | null | undefined): number | null {
  if (nhanVienId == null) return null;
  const raw = String(nhanVienId).trim();
  if (raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}
