/**
 * Số liệu bài viết GỘP NHÓM ở máy chủ (RPC `get_bai_viet_thong_ke_nhom`) — dùng
 * chung cho BC thống kê bài viết và trang Nhuận bút.
 *
 * Trước đây hai trang kéo cả bảng `bai_viet_danh_sach` (12k+ dòng, ~10 MB) rồi cộng
 * ở client. Nay máy chủ gộp theo kỳ × thể loại × nguồn × trang × người tạo (vài
 * trăm–vài nghìn nhóm, vài chục KB). Mỗi nhóm giữ ĐÚNG tên trường của
 * `BaiVietDanhSach` nên các hàm tổng hợp chỉ cần cộng `so_bai` / `so_tien` thay
 * cho đếm dòng.
 */
import type { BaiVietRpcScope } from '../services/bai-viet-danh-sach-service';

export interface BaiVietThongKeNhom {
  /** Khoá kỳ: `YYYY-MM-DD` (bucket ngày) hoặc `YYYY-MM` (bucket tháng); '' khi bài không có ngày. */
  ky: string;
  id_the_loai: string;
  ten_the_loai: string | null;
  id_nguon_dang: string;
  ten_nguon_dang: string | null;
  id_trang_dang: string;
  ten_trang_dang: string | null;
  id_nguoi_tao: string;
  ho_va_ten_nguoi_tao: string | null;
  ten_tai_khoan_nguoi_tao: string | null;
  /** Đơn vị (xã/phường) của người tạo; null khi người tạo chưa gắn đơn vị. */
  id_don_vi_nguoi_tao: string | null;
  so_bai: number;
  so_tien: number;
}

export interface BaiVietThongKeNhomResult {
  nhom: BaiVietThongKeNhom[];
  /** Ngày nhỏ / lớn nhất trong phạm vi đã lọc — dựng trục biểu đồ cho preset "Tất cả". */
  ngayMin: string;
  ngayMax: string;
}

export type BaiVietTrucNgay = 'tg_tao' | 'ngay_dang';
export type BaiVietThongKeBucket = 'day' | 'month';

export interface BaiVietThongKeArgs {
  trucNgay: BaiVietTrucNgay;
  /** `YYYY-MM-DD`; null = không chặn đầu đó. */
  tuNgay: string | null;
  denNgay: string | null;
  bucket: BaiVietThongKeBucket;
  scope: BaiVietRpcScope;
  viewerNhanVienId: string | null;
  viewerDonViId: string | null;
}

function toBigint(id: string | null | undefined): number | null {
  if (id == null || String(id).trim() === '') return null;
  const n = Number(String(id).trim());
  return Number.isFinite(n) ? n : null;
}

export function toBaiVietThongKeRpcParams(a: BaiVietThongKeArgs): Record<string, unknown> {
  return {
    p_truc_ngay: a.trucNgay,
    p_tu_ngay: a.tuNgay || null,
    p_den_ngay: a.denNgay || null,
    p_bucket: a.bucket,
    p_scope: a.scope,
    p_viewer_nhan_vien_id: toBigint(a.viewerNhanVienId),
    p_viewer_don_vi_id: toBigint(a.viewerDonViId),
  };
}

function idStr(v: unknown): string {
  return v == null ? '' : String(v);
}

function textOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** `numeric` của Postgres có thể về dạng chuỗi — cộng thẳng sẽ thành nối chuỗi. */
function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Đọc jsonb của RPC. Mỗi nhóm là mảng vị trí
 * `[ky, the_loai, nguon, trang, nguoi_tao, don_vi, so_bai, so_tien]` (xem migration
 * `20261004180000_thong_ke_gop_nhom.sql`); tên tra từ các từ điển đi kèm.
 */
export function parseBaiVietThongKeNhom(raw: unknown): BaiVietThongKeNhomResult {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const tenTheLoai = (obj.the_loai ?? {}) as Record<string, unknown>;
  const tenKhac = (obj.khac ?? {}) as Record<string, unknown>;
  const nguoiTao = (obj.nguoi_tao ?? {}) as Record<string, unknown>;
  const list = Array.isArray(obj.nhom) ? (obj.nhom as unknown[]) : [];

  const nhom = list.map((e): BaiVietThongKeNhom => {
    const [ky, tl, ng, tr, nt, dv, soBai, soTien] = (Array.isArray(e) ? e : []) as unknown[];
    const idTl = idStr(tl);
    const idNg = idStr(ng);
    const idTr = idStr(tr);
    const idNt = idStr(nt);
    const nv = nguoiTao[idNt];
    const [hoTen, taiKhoan] = (Array.isArray(nv) ? nv : []) as unknown[];
    return {
      ky: idStr(ky),
      id_the_loai: idTl,
      ten_the_loai: textOrNull(tenTheLoai[idTl]),
      id_nguon_dang: idNg,
      ten_nguon_dang: textOrNull(tenKhac[idNg]),
      id_trang_dang: idTr,
      ten_trang_dang: textOrNull(tenKhac[idTr]),
      id_nguoi_tao: idNt,
      ho_va_ten_nguoi_tao: textOrNull(hoTen),
      ten_tai_khoan_nguoi_tao: textOrNull(taiKhoan),
      id_don_vi_nguoi_tao: textOrNull(dv),
      so_bai: num(soBai),
      so_tien: num(soTien),
    };
  });

  return {
    nhom,
    ngayMin: idStr(obj.ngay_min).slice(0, 10),
    ngayMax: idStr(obj.ngay_max).slice(0, 10),
  };
}

/**
 * Tách bộ lọc đơn vị của UI thành tham số RPC: khoá "chưa gắn đơn vị" không phải
 * id thật nên đi qua cờ riêng, nếu không bài của tài khoản chưa gắn đơn vị sẽ
 * biến mất khỏi bảng tra cứu / file xuất.
 */
export function splitDonViFilter(
  keys: readonly string[],
  unknownKey: string,
): { donViIds: string[]; donViIncludeNull: boolean } {
  return {
    donViIds: keys.filter((k) => k !== unknownKey),
    donViIncludeNull: keys.includes(unknownKey),
  };
}
