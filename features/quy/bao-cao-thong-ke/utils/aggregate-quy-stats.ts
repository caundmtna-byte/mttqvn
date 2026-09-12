import dayjs from 'dayjs';
import type { StandardResolvedDateRange } from '@/lib/date-range-presets';
import type { QuySoThuChiListRow } from '../../so-thu-chi/core/types';

/**
 * Gom số liệu cho màn Báo cáo thống kê quỹ.
 *
 * Toàn bộ là hàm thuần, không chạm React và không chạm mạng — đây là chỗ sai
 * một dòng là sai con số đem đi công khai, nên phải test được.
 */

export interface QuyNhomRow {
  id: string;
  label: string;
  thu: number;
  chi: number;
  soDu: number;
  soPhieu: number;
}

export interface QuyStats {
  tongThu: number;
  tongChi: number;
  soDu: number;
  soPhieu: number;
  soPhieuThu: number;
  soPhieuChi: number;
  /** Khoản THU, sắp giảm dần theo số tiền. */
  theoKhoanThu: QuyNhomRow[];
  /** Khoản CHI, sắp giảm dần theo số tiền. */
  theoKhoanChi: QuyNhomRow[];
  theoTaiKhoan: QuyNhomRow[];
  theoDonVi: QuyNhomRow[];
  /** Theo tháng `YYYY-MM`, tăng dần theo thời gian. */
  theoKy: QuyNhomRow[];
}

export const QUY_STATS_RONG: QuyStats = {
  tongThu: 0,
  tongChi: 0,
  soDu: 0,
  soPhieu: 0,
  soPhieuThu: 0,
  soPhieuChi: 0,
  theoKhoanThu: [],
  theoKhoanChi: [],
  theoTaiKhoan: [],
  theoDonVi: [],
  theoKy: [],
};

const KHONG_XAC_DINH = 'Không xác định';

/** Khóa tháng hợp lệ: `YYYY-MM`. */
const LA_THANG_ISO = /^\d{4}-\d{2}$/;

function toNumber(v: unknown): number {
  if (v == null || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

type Bucket = { id: string; label: string; thu: number; chi: number; soPhieu: number };

function themVaoNhom(
  map: Map<string, Bucket>,
  id: string,
  label: string,
  loai: string,
  tien: number,
): void {
  const cur = map.get(id) ?? { id, label, thu: 0, chi: 0, soPhieu: 0 };
  if (loai === 'thu') cur.thu += tien;
  else if (loai === 'chi') cur.chi += tien;
  cur.soPhieu += 1;
  // Nhãn có thể trống ở dòng đầu rồi có ở dòng sau (tên vừa được đặt) — giữ nhãn
  // đầu tiên đọc được thay vì để "Không xác định" đè lên tên thật.
  if (cur.label === KHONG_XAC_DINH && label !== KHONG_XAC_DINH) cur.label = label;
  map.set(id, cur);
}

function nhomRaMang(map: Map<string, Bucket>): QuyNhomRow[] {
  return [...map.values()].map((b) => ({
    id: b.id,
    label: b.label,
    thu: b.thu,
    chi: b.chi,
    soDu: b.thu - b.chi,
    soPhieu: b.soPhieu,
  }));
}

function sapGiamDanTheoTien(rows: QuyNhomRow[], cot: 'thu' | 'chi'): QuyNhomRow[] {
  return [...rows].sort((a, b) => {
    if (b[cot] !== a[cot]) return b[cot] - a[cot];
    return a.label.localeCompare(b.label, 'vi');
  });
}

/** Gom toàn bộ số liệu từ các dòng sổ đã lọc. */
export function aggregateQuyStats(rows: readonly QuySoThuChiListRow[]): QuyStats {
  if (rows.length === 0) return QUY_STATS_RONG;

  let tongThu = 0;
  let tongChi = 0;
  let soPhieuThu = 0;
  let soPhieuChi = 0;

  const khoanThu = new Map<string, Bucket>();
  const khoanChi = new Map<string, Bucket>();
  const taiKhoan = new Map<string, Bucket>();
  const donVi = new Map<string, Bucket>();
  const ky = new Map<string, Bucket>();

  for (const r of rows) {
    const tien = toNumber(r.so_tien);
    if (r.loai === 'thu') {
      tongThu += tien;
      soPhieuThu += 1;
    } else if (r.loai === 'chi') {
      tongChi += tien;
      soPhieuChi += 1;
    } else {
      // Dòng có `loai` lạ không được cộng vào đâu cả — thà thiếu còn hơn sai.
      continue;
    }

    const khoanLabel = r.ten_khoan?.trim() || KHONG_XAC_DINH;
    themVaoNhom(
      r.loai === 'thu' ? khoanThu : khoanChi,
      r.khoan_id || KHONG_XAC_DINH,
      khoanLabel,
      r.loai,
      tien,
    );

    themVaoNhom(
      taiKhoan,
      r.tai_khoan_id || KHONG_XAC_DINH,
      r.ten_tai_khoan?.trim() || KHONG_XAC_DINH,
      r.loai,
      tien,
    );

    themVaoNhom(
      donVi,
      r.don_vi_id ?? KHONG_XAC_DINH,
      r.ten_don_vi?.trim() || KHONG_XAC_DINH,
      r.loai,
      tien,
    );

    const thang = (r.ngay_chung_tu ?? '').slice(0, 7);
    if (thang) themVaoNhom(ky, thang, thang, r.loai, tien);
  }

  return {
    tongThu,
    tongChi,
    soDu: tongThu - tongChi,
    soPhieu: soPhieuThu + soPhieuChi,
    soPhieuThu,
    soPhieuChi,
    theoKhoanThu: sapGiamDanTheoTien(nhomRaMang(khoanThu), 'thu'),
    theoKhoanChi: sapGiamDanTheoTien(nhomRaMang(khoanChi), 'chi'),
    theoTaiKhoan: sapGiamDanTheoTien(nhomRaMang(taiKhoan), 'thu'),
    theoDonVi: sapGiamDanTheoTien(nhomRaMang(donVi), 'thu'),
    theoKy: nhomRaMang(ky).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export interface QuyTrendPoint {
  thang: string;
  /** Nhãn hiển thị `MM/YYYY`. */
  label: string;
  thu: number;
  chi: number;
  soDu: number;
}

/**
 * Chuỗi điểm cho biểu đồ xu hướng theo THÁNG, lấp đủ cả tháng không có phiếu.
 *
 * ⚠️ Preset «Tất cả» trả `start`/`end` RỖNG. Đưa thẳng vào vòng lặp `dayjs` là
 * treo trình duyệt vĩnh viễn: `dayjs('')` là Invalid Date và
 * `Invalid.isAfter(Invalid)` luôn `false` nên điều kiện dừng không bao giờ đúng
 * (xem "Bẫy đã biết" trong CLAUDE.md). Vì vậy hàm này **tự suy khoảng từ dữ
 * liệu** khi khoảng ngày rỗng, và còn chặn thêm một lớp `isValid()` nữa.
 */
export function buildQuyTrendSeries(
  rows: readonly QuySoThuChiListRow[],
  range: StandardResolvedDateRange,
): QuyTrendPoint[] {
  const theoThang = new Map<string, { thu: number; chi: number }>();
  let minThang = '';
  let maxThang = '';

  for (const r of rows) {
    const thang = (r.ngay_chung_tu ?? '').slice(0, 7);
    if (!thang) continue;
    if (!minThang || thang < minThang) minThang = thang;
    if (!maxThang || thang > maxThang) maxThang = thang;
    const cur = theoThang.get(thang) ?? { thu: 0, chi: 0 };
    const tien = toNumber(r.so_tien);
    if (r.loai === 'thu') cur.thu += tien;
    else if (r.loai === 'chi') cur.chi += tien;
    theoThang.set(thang, cur);
  }

  // Khoảng vẽ: ưu tiên khoảng người dùng chọn; «Tất cả» thì lấy min–max thực tế.
  let dauKy = range.allTime ? '' : (range.start ?? '').slice(0, 7);
  let cuoiKy = range.allTime ? '' : (range.end ?? '').slice(0, 7);
  if (!dauKy || !cuoiKy) {
    dauKy = minThang;
    cuoiKy = maxThang;
  }
  if (!dauKy || !cuoiKy) return [];

  // Lớp chắn thứ hai: phải đúng dạng `YYYY-MM` mới đi tiếp.
  //
  // Chỉ dựa vào `dayjs().isValid()` là KHÔNG đủ: dayjs rơi về `new Date()` của
  // trình duyệt, và `new Date('khong-p-01')` ra ngày 01/2001 hợp lệ — tức một
  // chuỗi rác vẫn lọt qua và vẽ ra biểu đồ sai.
  if (!LA_THANG_ISO.test(dauKy) || !LA_THANG_ISO.test(cuoiKy)) return [];

  let moc = dayjs(`${dauKy}-01`);
  const het = dayjs(`${cuoiKy}-01`);
  if (!moc.isValid() || !het.isValid() || moc.isAfter(het)) return [];

  const out: QuyTrendPoint[] = [];
  // Trần cứng 600 tháng (50 năm): kể cả khi có dữ liệu rác với ngày năm 1900,
  // vòng lặp vẫn phải kết thúc — trang thống kê không được phép treo.
  for (let i = 0; i < 600 && !moc.isAfter(het); i += 1) {
    const key = moc.format('YYYY-MM');
    const v = theoThang.get(key) ?? { thu: 0, chi: 0 };
    out.push({
      thang: key,
      label: moc.format('MM/YYYY'),
      thu: v.thu,
      chi: v.chi,
      soDu: v.thu - v.chi,
    });
    moc = moc.add(1, 'month');
  }
  return out;
}
