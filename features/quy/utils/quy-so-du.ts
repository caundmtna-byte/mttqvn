/**
 * Cộng dồn số dư quỹ.
 *
 * Quy ước một chiều: mọi số tiền trong sổ đều **dương**, hướng nằm ở cột `loai`
 * (`'thu'` / `'chi'`). Vì vậy số dư luôn là `tổng thu − tổng chi`, không bao giờ
 * là phép cộng thẳng cột tiền. Đây là chỗ sai một dòng là sai sổ sách nên tách
 * hàm thuần để test được.
 *
 * Lưu ý: `quy_so_du_view` chưa có **tồn đầu kỳ** — số dư ở đây là số dư luỹ kế
 * từ dòng đầu tiên của sổ. Khi nào làm chốt sổ theo kỳ thì phải cộng thêm tồn
 * đầu kỳ vào `soDu`.
 */

export interface QuySoDuTaiKhoanRow {
  tai_khoan_id: string;
  ten_tai_khoan: string;
  tong_thu: number;
  tong_chi: number;
  so_du: number;
}

export interface QuyTongHopSoDu {
  tongThu: number;
  tongChi: number;
  soDu: number;
}

function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Chuẩn hoá một dòng của `quy_so_du_view`.
 *
 * `numeric` của Postgres về client là **chuỗi** (supabase-js giữ nguyên để khỏi
 * mất chữ số). Cộng chuỗi bằng `+` sẽ nối chuỗi chứ không cộng số — nên mọi cột
 * tiền đều phải đi qua đây. `so_du` tính lại từ thu/chi thay vì tin cột sẵn có,
 * để một dòng lỗi ở view không lặng lẽ thành số dư sai trên màn hình.
 */
export function normalizeSoDuRow(raw: Record<string, unknown>): QuySoDuTaiKhoanRow {
  const tongThu = toNumber(raw.tong_thu);
  const tongChi = toNumber(raw.tong_chi);
  return {
    tai_khoan_id: String(raw.tai_khoan_id ?? ''),
    ten_tai_khoan: String(raw.ten_tai_khoan ?? ''),
    tong_thu: tongThu,
    tong_chi: tongChi,
    so_du: tongThu - tongChi,
  };
}

/** Tổng của cả quỹ = cộng dồn mọi tài khoản. */
export function tongHopSoDu(rows: readonly QuySoDuTaiKhoanRow[]): QuyTongHopSoDu {
  let tongThu = 0;
  let tongChi = 0;
  for (const r of rows) {
    tongThu += toNumber(r.tong_thu);
    tongChi += toNumber(r.tong_chi);
  }
  return { tongThu, tongChi, soDu: tongThu - tongChi };
}

/** Dòng sổ tối thiểu cần có để cộng dồn. */
export interface QuyDongSoToiThieu {
  loai: string;
  so_tien: number | string;
}

/** Cộng dồn trực tiếp từ các dòng sổ (dùng cho báo cáo theo kỳ, nơi view không lọc được). */
export function tongHopTuDongSo(rows: readonly QuyDongSoToiThieu[]): QuyTongHopSoDu {
  let tongThu = 0;
  let tongChi = 0;
  for (const r of rows) {
    const tien = toNumber(r.so_tien);
    if (r.loai === 'thu') tongThu += tien;
    else if (r.loai === 'chi') tongChi += tien;
  }
  return { tongThu, tongChi, soDu: tongThu - tongChi };
}
