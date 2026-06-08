import dayjs from 'dayjs';
import type { TaskReportFilters, TaskReportRpcArgs, ResolvedDateRange } from '../core/types';
import {
  isStandardDateRangeNonDefault,
  resolveStandardDateRange,
  STANDARD_DATE_RANGE_PRESET_IDS,
  type StandardDateRangePresetId,
} from '@/lib/date-range-presets';

/** Ngày bắt đầu preset "Tất cả" — đủ sớm để gom mọi `tg_tao` trong DB. */
export const TASK_REPORT_ALL_RANGE_START = '1970-01-01';

export const TASK_REPORT_PRESET_IDS = STANDARD_DATE_RANGE_PRESET_IDS;

export type TaskReportPresetId = StandardDateRangePresetId;

function isKnownTaskReportPreset(preset: string): boolean {
  return preset === 'custom' || TASK_REPORT_PRESET_IDS.includes(preset as TaskReportPresetId);
}

/** Giải khoảng ngày YYYY-MM-DD cho preset (mặc định UI: `all`). */
export function resolveTaskReportDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): ResolvedDateRange {
  const end = dayjs(now).format('YYYY-MM-DD');
  if (!isKnownTaskReportPreset(preset)) {
    return { start: TASK_REPORT_ALL_RANGE_START, end };
  }
  const r = resolveStandardDateRange(preset, customStart, customEnd, now);
  if (r.allTime) {
    return { start: TASK_REPORT_ALL_RANGE_START, end: r.end || end };
  }
  return { start: r.start, end: r.end };
}

/** Mảng rỗng → null để Postgres bỏ qua filter (NULL OR ... = TRUE). */
function nullIfEmpty<T>(arr: T[]): T[] | null {
  return arr.length === 0 ? null : arr;
}

/** Quy đổi id string (bigint JSON) → number. Bỏ qua mục không hợp lệ. */
function toBigintArray(ids: string[]): number[] | null {
  if (ids.length === 0) return null;
  const out: number[] = [];
  for (const id of ids) {
    const n = Number(id);
    if (Number.isFinite(n)) out.push(n);
  }
  return out.length === 0 ? null : out;
}

/** Chuyển TaskReportFilters → object args dùng cho mọi RPC `cong_viec_bao_cao_*`. */
export function buildTaskReportRpcArgs(filters: TaskReportFilters): TaskReportRpcArgs {
  return {
    p_start: filters.range.start,
    p_end: filters.range.end,
    p_id_trach_nhiem: toBigintArray(filters.idTrachNhiem),
    p_id_nguoi_tao: toBigintArray(filters.idNguoiTao),
    p_trang_thai: nullIfEmpty(filters.trangThai),
    p_muc_do: nullIfEmpty(filters.mucDo),
    p_overdue_only: filters.overdueOnly,
    p_viewer_id: filters.viewerId,
    p_viewer_don_vi_id: filters.viewerDonViId,
    p_viewer_phong_ban_id: filters.viewerPhongBanId,
    p_view_all: filters.viewAll,
  };
}

/** True khi date range khác preset mặc định (`all`) — dùng cho activeFilterCount. */
export function isNonDefaultTaskReportDateRange(value: {
  preset: string;
  customStart: string;
  customEnd: string;
}): boolean {
  return isStandardDateRangeNonDefault(value, 'all');
}

/** Khóa cache ổn định cho TanStack Query (không sort khoá). */
export function taskReportArgsCacheKey(args: TaskReportRpcArgs): TaskReportRpcArgs {
  return args;
}
