import type { QueryClient, QueryKey } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type {
  MttqDiemDanhMatrixRow,
  MttqDiemDanhTrangThai,
  MttqDiemDanhUyVien,
  MttqKyHop,
  MttqKyHopListRow,
} from '../core/types';
import type { MttqUyVienUyBanListRow } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';

/**
 * Logic cập nhật cache điểm danh — tách RA KHỎI hook để test được.
 *
 * Tick điểm danh là thao tác lặp N lần liên tiếp (một kỳ họp có hàng trăm ủy viên),
 * nên phải hiện kết quả NGAY khi bấm (optimistic) rồi mới gửi lên máy chủ.
 * Sai một dòng ở đây là sai con số hiển thị trên bảng kỳ họp và bảng ủy viên,
 * nên toàn bộ phần tính toán nằm trong các hàm thuần dưới đây và có test đi kèm.
 */

/** Chênh lệch cần cộng vào 3 ô đếm: có mặt / vắng mặt / chưa điểm danh. */
export interface DiemDanhDelta {
  coMat: number;
  vangMat: number;
  chua: number;
}

export const DIEM_DANH_DELTA_KHONG: DiemDanhDelta = { coMat: 0, vangMat: 0, chua: 0 };

/**
 * Tính chênh lệch khi một ủy viên đổi trạng thái điểm danh.
 *
 * - Chưa điểm danh → Có mặt/Vắng mặt: ô "chưa" giảm 1, ô tương ứng tăng 1.
 * - Đổi qua lại giữa Có mặt ↔ Vắng mặt: ô "chưa" không đổi.
 * - Bấm lại đúng trạng thái đang có: không đổi gì.
 */
export function tinhDeltaDiemDanh(
  trangThaiCu: MttqDiemDanhTrangThai | null | undefined,
  trangThaiMoi: MttqDiemDanhTrangThai,
): DiemDanhDelta {
  if (!trangThaiCu) {
    return trangThaiMoi === 'Có mặt'
      ? { coMat: 1, vangMat: 0, chua: -1 }
      : { coMat: 0, vangMat: 1, chua: -1 };
  }
  if (trangThaiCu === trangThaiMoi) return { ...DIEM_DANH_DELTA_KHONG };
  return trangThaiMoi === 'Có mặt'
    ? { coMat: 1, vangMat: -1, chua: 0 }
    : { coMat: -1, vangMat: 1, chua: 0 };
}

export function deltaKhacKhong(delta: DiemDanhDelta): boolean {
  return delta.coMat !== 0 || delta.vangMat !== 0 || delta.chua !== 0;
}

/** Ba ô đếm điểm danh có mặt trên cả dòng kỳ họp lẫn dòng ủy viên. */
export interface DiemDanhCounters {
  diem_danh_co_mat?: number | null;
  diem_danh_vang_mat?: number | null;
  diem_danh_chua?: number | null;
}

/** Cộng delta vào 3 ô đếm; không cho âm (dữ liệu cũ có thể lệch). */
export function patchDiemDanhCounters<T extends DiemDanhCounters>(row: T, delta: DiemDanhDelta): T {
  return {
    ...row,
    diem_danh_co_mat: Math.max(0, (row.diem_danh_co_mat ?? 0) + delta.coMat),
    diem_danh_vang_mat: Math.max(0, (row.diem_danh_vang_mat ?? 0) + delta.vangMat),
    diem_danh_chua: Math.max(0, (row.diem_danh_chua ?? 0) + delta.chua),
  };
}

/** Trạng thái đang lưu trong danh sách điểm danh của một kỳ họp. */
export function timTrangThaiHienTai(
  rows: readonly { ky_hop_id?: string; uy_vien_id: string; trang_thai: MttqDiemDanhTrangThai }[] | undefined,
  kyHopId: string,
  uyVienId: string,
): MttqDiemDanhTrangThai | null {
  if (!rows) return null;
  const found = rows.find(
    (r) => r.uy_vien_id === uyVienId && (r.ky_hop_id === undefined || r.ky_hop_id === kyHopId),
  );
  return found?.trang_thai ?? null;
}

/**
 * Cache danh sách điểm danh theo kỳ họp: sửa đúng dòng, hoặc thêm dòng mới.
 * Dòng mới dùng `id` rỗng — id thật về sau lần đồng bộ kế tiếp.
 */
export function patchDiemDanhKyHopRows(
  rows: MttqDiemDanhUyVien[] | undefined,
  kyHopId: string,
  uyVienId: string,
  trangThai: MttqDiemDanhTrangThai,
): MttqDiemDanhUyVien[] | undefined {
  if (!rows) return rows;
  const idx = rows.findIndex((r) => r.uy_vien_id === uyVienId && r.ky_hop_id === kyHopId);
  if (idx === -1) {
    return [...rows, { id: '', ky_hop_id: kyHopId, uy_vien_id: uyVienId, trang_thai: trangThai, ghi_chu: null }];
  }
  const next = rows.slice();
  next[idx] = { ...next[idx], trang_thai: trangThai };
  return next;
}

/** Cache ma trận điểm danh theo nhiệm kỳ (chỉ 3 cột, không có `id`). */
export function patchDiemDanhNhiemKyRows(
  rows: MttqDiemDanhMatrixRow[] | undefined,
  kyHopId: string,
  uyVienId: string,
  trangThai: MttqDiemDanhTrangThai,
): MttqDiemDanhMatrixRow[] | undefined {
  if (!rows) return rows;
  const idx = rows.findIndex((r) => r.uy_vien_id === uyVienId && r.ky_hop_id === kyHopId);
  if (idx === -1) return [...rows, { ky_hop_id: kyHopId, uy_vien_id: uyVienId, trang_thai: trangThai }];
  const next = rows.slice();
  next[idx] = { ...next[idx], trang_thai: trangThai };
  return next;
}

export interface DiemDanhPatchArgs {
  kyHopId: string;
  uyVienId: string;
  trangThai: MttqDiemDanhTrangThai;
  /** Khi có — patch luôn ma trận điểm danh của nhiệm kỳ. */
  nhiemKyId?: string;
}

/** Ảnh chụp cache trước khi patch, dùng để hoàn nguyên khi lưu thất bại. */
export interface DiemDanhSnapshot {
  entries: [QueryKey, unknown][];
}

/** Gom mọi nhánh cache mà một lần tick điểm danh có thể chạm tới. */
function thuThapCacheLienQuan(queryClient: QueryClient, args: DiemDanhPatchArgs): [QueryKey, unknown][] {
  const nhiemKy = args.nhiemKyId?.trim();
  const entries: [QueryKey, unknown][] = [
    ...queryClient.getQueriesData({ queryKey: queryKeys.mttqDiemDanhUyVien.byKyHop(args.kyHopId) }),
    ...queryClient.getQueriesData({ queryKey: queryKeys.mttqUyVienUyBan.all }),
    ...queryClient.getQueriesData({ queryKey: queryKeys.mttqKyHop.all }),
  ];
  if (nhiemKy) {
    entries.push(
      ...queryClient.getQueriesData({ queryKey: queryKeys.mttqDiemDanhUyVien.byNhiemKy(nhiemKy) }),
    );
  }
  return entries;
}

/**
 * Ghi ngay kết quả tick vào cache (optimistic) và trả về ảnh chụp để hoàn nguyên.
 *
 * Chạm 4 nhánh cache:
 *  1. Danh sách điểm danh của kỳ họp (tab Điểm danh trong chi tiết kỳ họp).
 *  2. Ma trận điểm danh của nhiệm kỳ (trang Ma trận + tab điểm danh của ủy viên).
 *  3. Ô đếm trên danh sách ủy viên.
 *  4. Ô đếm trên danh sách/chi tiết kỳ họp.
 */
export function apDungPatchDiemDanh(
  queryClient: QueryClient,
  args: DiemDanhPatchArgs,
): DiemDanhSnapshot {
  const { kyHopId, uyVienId, trangThai } = args;
  const nhiemKy = args.nhiemKyId?.trim();
  const snapshot: DiemDanhSnapshot = { entries: thuThapCacheLienQuan(queryClient, args) };

  const kyHopKey = queryKeys.mttqDiemDanhUyVien.byKyHop(kyHopId);
  const trangThaiCuKyHop = timTrangThaiHienTai(
    queryClient.getQueryData<MttqDiemDanhUyVien[]>(kyHopKey),
    kyHopId,
    uyVienId,
  );
  queryClient.setQueryData<MttqDiemDanhUyVien[]>(kyHopKey, (cur) =>
    patchDiemDanhKyHopRows(cur, kyHopId, uyVienId, trangThai),
  );

  let trangThaiCuNhiemKy: MttqDiemDanhTrangThai | null = null;
  if (nhiemKy) {
    const nhiemKyKey = queryKeys.mttqDiemDanhUyVien.byNhiemKy(nhiemKy);
    trangThaiCuNhiemKy = timTrangThaiHienTai(
      queryClient.getQueryData<MttqDiemDanhMatrixRow[]>(nhiemKyKey),
      kyHopId,
      uyVienId,
    );
    queryClient.setQueryData<MttqDiemDanhMatrixRow[]>(nhiemKyKey, (cur) =>
      patchDiemDanhNhiemKyRows(cur, kyHopId, uyVienId, trangThai),
    );
  }

  // Trạng thái cũ lấy từ nhánh nào có dữ liệu: mở thẳng trang Ma trận thì cache
  // theo kỳ họp rỗng, và ngược lại.
  const trangThaiCu = trangThaiCuKyHop ?? trangThaiCuNhiemKy;
  const delta = tinhDeltaDiemDanh(trangThaiCu, trangThai);
  if (!deltaKhacKhong(delta)) return snapshot;

  for (const [key, list] of queryClient.getQueriesData<MttqUyVienUyBanListRow[]>({
    queryKey: queryKeys.mttqUyVienUyBan.all,
  })) {
    if (!Array.isArray(list)) continue;
    queryClient.setQueryData(
      key,
      list.map((row) => (row.id === uyVienId ? patchDiemDanhCounters(row, delta) : row)),
    );
  }

  for (const [key, value] of queryClient.getQueriesData<MttqKyHopListRow[] | MttqKyHop>({
    queryKey: queryKeys.mttqKyHop.all,
  })) {
    if (Array.isArray(value)) {
      queryClient.setQueryData(
        key,
        value.map((row) => (row.id === kyHopId ? patchDiemDanhCounters(row, delta) : row)),
      );
    } else if (value && typeof value === 'object' && (value as MttqKyHop).id === kyHopId) {
      queryClient.setQueryData(key, patchDiemDanhCounters(value as MttqKyHop, delta));
    }
  }

  return snapshot;
}

/** Trả cache về đúng trạng thái trước khi tick — dùng khi lưu thất bại. */
export function hoanNguyenPatchDiemDanh(queryClient: QueryClient, snapshot: DiemDanhSnapshot | undefined): void {
  if (!snapshot) return;
  for (const [key, value] of snapshot.entries) {
    queryClient.setQueryData(key, value);
  }
}
