/**
 * Tổng hợp BC thống kê bài viết trên các NHÓM máy chủ đã gộp sẵn
 * (`BaiVietThongKeNhom`, RPC `get_bai_viet_thong_ke_nhom`) — mỗi nhóm mang
 * `so_bai` / `so_tien`, nên mọi phép đếm ở đây là CỘNG trọng số, không đếm dòng.
 * Khoảng ngày đã lọc ở máy chủ; ở đây chỉ còn lọc theo chiều (thể loại, nguồn…).
 */
import dayjs from 'dayjs';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';
import type { BaiVietThongKeNhom } from '../../bai-viet/utils/thong-ke-nhom';
import {
  resolveStandardDateRange,
  STANDARD_DATE_RANGE_PRESET_IDS,
  type StandardResolvedDateRange,
} from '@/lib/date-range-presets';

export interface ArticleStatsDimensionFilters {
  idTheLoai: string[];
  idNguonDang: string[];
  idTrangDang: string[];
  idNguoiTao: string[];
  /** Đơn vị (xã/phường) của người tạo — xem khối "Tổng hợp theo xã/phường" cuối file. */
  idDonVi: string[];
}

/** Khoá nhóm cho bài của người tạo chưa gắn đơn vị. */
export const ARTICLE_STATS_DON_VI_UNKNOWN = '__khong_xac_dinh__';

/**
 * Bài viết không có cột đơn vị riêng: đơn vị của bài = `don_vi_id` của NGƯỜI TẠO.
 * Người tạo chưa gắn đơn vị gom về một nhóm riêng thay vì bị loại khỏi báo cáo.
 */
export function getArticleDonViKey(item: Pick<BaiVietDanhSach, 'id_don_vi_nguoi_tao'>): string {
  const raw = item.id_don_vi_nguoi_tao;
  return raw != null && String(raw).trim() !== '' ? String(raw).trim() : ARTICLE_STATS_DON_VI_UNKNOWN;
}

export function getArticleDonViLabel(
  key: string,
  tenDonViById: ReadonlyMap<string, string>,
  unknownLabel: string,
): string {
  return key === ARTICLE_STATS_DON_VI_UNKNOWN ? unknownLabel : tenDonViById.get(key)?.trim() || key;
}

export type ResolvedDateRange = StandardResolvedDateRange;

export const ARTICLE_STATS_PRESET_IDS = STANDARD_DATE_RANGE_PRESET_IDS;

export type ArticleStatsPresetId = (typeof ARTICLE_STATS_PRESET_IDS)[number];

/** Khoảng ngày đóng [start, end] YYYY-MM-DD theo preset (custom lấy từ form). */
export function resolveArticleStatsDateRange(
  preset: string,
  customStart: string,
  customEnd: string,
  now: Date = new Date(),
): ResolvedDateRange {
  return resolveStandardDateRange(preset, customStart, customEnd, now);
}

/** Lọc nhóm theo các chiều đang chọn. Khoảng ngày đã lọc ở máy chủ. */
export function filterArticlesForStats(
  items: BaiVietThongKeNhom[],
  dims: ArticleStatsDimensionFilters,
): BaiVietThongKeNhom[] {
  const has = (vals: string[], v: string) => vals.length === 0 || vals.includes(v);
  return items.filter(
    (item) =>
      has(dims.idTheLoai, item.id_the_loai) &&
      has(dims.idNguonDang, item.id_nguon_dang) &&
      has(dims.idTrangDang, item.id_trang_dang) &&
      has(dims.idNguoiTao, item.id_nguoi_tao) &&
      has(dims.idDonVi, getArticleDonViKey(item)),
  );
}

/** Tổng số bài của các nhóm. */
export function sumSoBai(items: readonly BaiVietThongKeNhom[]): number {
  let n = 0;
  for (const r of items) n += r.so_bai;
  return n;
}

/**
 * KPI của trang báo cáo — CỐ Ý KHÔNG có chỉ tiêu tiền nào.
 * Cơ quan không có ngân sách trả nhuận bút, nên số tiền trên trang thống kê
 * khiến cán bộ hiểu nhầm là khoản sẽ được nhận. Tiền chỉ còn ở trang Nhuận bút.
 */
export function computeArticleStatsKpis(filtered: BaiVietThongKeNhom[]): {
  totalCount: number;
  distinctTheLoai: number;
  distinctNguoiTao: number;
  /** Số đơn vị THẬT có bài — không đếm nhóm "chưa xác định". */
  distinctDonVi: number;
  /** Số bài thuộc các đơn vị thật. */
  soBaiCoDonVi: number;
  /** Trung bình số bài mỗi đơn vị. Mẫu số loại nhóm "chưa xác định" để
   *  bài của tài khoản chưa gắn đơn vị không kéo lệch con số này. */
  avgBaiMoiDonVi: number;
} {
  let totalCount = 0;
  const theLoai = new Set<string>();
  const nguoi = new Set<string>();
  const donVi = new Set<string>();
  let soBaiCoDonVi = 0;
  for (const r of filtered) {
    totalCount += r.so_bai;
    theLoai.add(r.id_the_loai);
    nguoi.add(r.id_nguoi_tao);
    const key = getArticleDonViKey(r);
    if (key !== ARTICLE_STATS_DON_VI_UNKNOWN) {
      donVi.add(key);
      soBaiCoDonVi += r.so_bai;
    }
  }
  return {
    totalCount,
    distinctTheLoai: theLoai.size,
    distinctNguoiTao: nguoi.size,
    distinctDonVi: donVi.size,
    soBaiCoDonVi,
    avgBaiMoiDonVi: donVi.size > 0 ? soBaiCoDonVi / donVi.size : 0,
  };
}

export type TrendBucket = 'day' | 'month';

export function pickTrendBucket(start: string, end: string): TrendBucket {
  if (!start || !end) return 'month';
  const a = dayjs(start.slice(0, 10));
  const b = dayjs(end.slice(0, 10));
  const days = b.diff(a, 'day');
  return !Number.isFinite(days) || days > 62 ? 'month' : 'day';
}

export interface TrendPoint {
  key: string;
  label: string;
  count: number;
  /** Tổng nhuận bút của kỳ — chỉ dùng cho file xuất, KPI trên trang vẫn không có tiền. */
  soTien: number;
}

/**
 * Chuỗi bucket liên tục trong [start,end] (ngày hoặc tháng YYYY-MM). Nhóm máy chủ
 * đã mang khoá kỳ đúng bucket nên chỉ việc cộng vào; kỳ không có bài vẫn hiện 0.
 * `range` rỗng (preset "Tất cả") phải truyền khoảng ngày thật từ `ngayMin/ngayMax`
 * — vòng lặp dayjs trên ngày rỗng sẽ không bao giờ dừng, nên có guard `isValid`.
 */
export function buildTrendSeries(
  filtered: BaiVietThongKeNhom[],
  range: { start: string; end: string },
  bucket: TrendBucket,
): TrendPoint[] {
  const start = dayjs(range.start.slice(0, 10));
  const end = dayjs(range.end.slice(0, 10));
  if (!range.start || !range.end || !start.isValid() || !end.isValid()) return [];
  const keys: string[] = [];
  if (bucket === 'day') {
    for (let cur = start; !cur.isAfter(end, 'day'); cur = cur.add(1, 'day')) {
      keys.push(cur.format('YYYY-MM-DD'));
    }
  } else {
    for (let cur = start.startOf('month'); !cur.isAfter(end, 'month'); cur = cur.add(1, 'month')) {
      keys.push(cur.format('YYYY-MM'));
    }
  }

  const map = new Map<string, { count: number; soTien: number }>();
  for (const k of keys) {
    map.set(k, { count: 0, soTien: 0 });
  }

  for (const item of filtered) {
    const cur = map.get(item.ky);
    if (!cur) continue;
    cur.count += item.so_bai;
    cur.soTien += item.so_tien;
  }

  return keys.map((key) => {
    const label =
      bucket === 'day' ? dayjs(key).format('DD/MM') : dayjs(key + '-01').format('MM/YYYY');
    const v = map.get(key);
    return { key, label, count: v?.count ?? 0, soTien: v?.soTien ?? 0 };
  });
}

export interface LabelCountRow {
  id: string;
  label: string;
  value: number;
  /** Tổng nhuận bút của nhóm — chỉ dùng cho file xuất. */
  soTien: number;
}

/** `topN` bỏ trống = lấy đủ mọi nhóm (file xuất không được cắt top như giao diện). */
export function aggregateTopCounts(
  filtered: BaiVietThongKeNhom[],
  mode: 'the_loai' | 'nguon' | 'trang' | 'nguoi_tao',
  topN: number = Number.POSITIVE_INFINITY,
): LabelCountRow[] {
  const tally = new Map<string, { label: string; count: number; soTien: number }>();
  for (const item of filtered) {
    let id: string;
    let label: string;
    switch (mode) {
      case 'the_loai':
        id = String(item.id_the_loai);
        label = item.ten_the_loai?.trim() || id;
        break;
      case 'nguon':
        id = String(item.id_nguon_dang);
        label = item.ten_nguon_dang?.trim() || id;
        break;
      case 'trang':
        id = String(item.id_trang_dang);
        label = item.ten_trang_dang?.trim() || id;
        break;
      case 'nguoi_tao':
        id = String(item.id_nguoi_tao);
        label =
          item.ho_va_ten_nguoi_tao?.trim() ||
          item.ten_tai_khoan_nguoi_tao?.trim() ||
          id;
        break;
      default:
        id = '';
        label = '';
    }
    const prev = tally.get(id);
    if (prev) {
      prev.count += item.so_bai;
      prev.soTien += item.so_tien;
    } else {
      tally.set(id, { label, count: item.so_bai, soTien: item.so_tien });
    }
  }
  const rows = [...tally.entries()]
    .map(([id, v]) => ({ id, label: v.label, value: v.count, soTien: v.soTien }))
    .sort((a, b) => b.value - a.value);
  return rows.slice(0, topN);
}

/* ------------------------------------------------------------------ *
 * Tổng hợp theo xã/phường (đơn vị)
 *
 * Bài viết không có cột đơn vị riêng: đơn vị của bài = đơn vị (`don_vi_id`)
 * của NGƯỜI TẠO, lấy qua embed `nguoi_tao` (xem `getArticleDonViKey` đầu file).
 * Tên xã tra từ danh mục `var_ssn_xa_phuong` (cache 24h) thay vì embed thêm vào
 * từng dòng bài viết — embed lồng sẽ lặp lại tên xã cho hàng nghìn dòng, tốn
 * egress vô ích.
 * ------------------------------------------------------------------ */

export interface DonViStatsRow {
  /** Id xã/phường, hoặc `ARTICLE_STATS_DON_VI_UNKNOWN` khi người tạo chưa gắn đơn vị. */
  id: string;
  label: string;
  soBai: number;
  /** Tỷ trọng số bài trên tổng số bài đã lọc, đơn vị % (0 khi không có bài nào). */
  tyTrongSoBai: number;
}

/**
 * Gộp bài viết theo xã/phường của người tạo.
 * Sắp giảm dần theo số bài → tên; nhóm "chưa xác định" luôn ở cuối để không
 * chen giữa các xã thật trong bảng báo cáo.
 */
export function aggregateByDonVi(
  filtered: BaiVietThongKeNhom[],
  tenDonViById: ReadonlyMap<string, string>,
  unknownLabel: string,
): DonViStatsRow[] {
  const tally = new Map<string, { label: string; soBai: number }>();

  for (const item of filtered) {
    const id = getArticleDonViKey(item);
    const prev = tally.get(id);
    if (prev) {
      prev.soBai += item.so_bai;
    } else {
      tally.set(id, { label: getArticleDonViLabel(id, tenDonViById, unknownLabel), soBai: item.so_bai });
    }
  }

  const tongSoBai = sumSoBai(filtered);
  const rows = [...tally.entries()].map(([id, v]) => ({
    id,
    label: v.label,
    soBai: v.soBai,
    tyTrongSoBai: tongSoBai > 0 ? (v.soBai * 100) / tongSoBai : 0,
  }));

  rows.sort(compareDonViRow);
  return rows;
}

function compareDonViRow(
  a: { id: string; label: string; soBai: number },
  b: { id: string; label: string; soBai: number },
): number {
  const aUnknown = a.id === ARTICLE_STATS_DON_VI_UNKNOWN;
  const bUnknown = b.id === ARTICLE_STATS_DON_VI_UNKNOWN;
  if (aUnknown !== bUnknown) return aUnknown ? 1 : -1;
  if (b.soBai !== a.soBai) return b.soBai - a.soBai;
  return a.label.localeCompare(b.label, 'vi');
}

/* ------------------------------------------------------------------ *
 * Bảng chéo Đơn vị × Thể loại — dành cho file xuất
 * ------------------------------------------------------------------ */

export interface DonViTheLoaiMatrixRow {
  id: string;
  label: string;
  soBai: number;
  tyTrongSoBai: number;
  /** Tổng nhuận bút của đơn vị — chỉ dùng cho file xuất. */
  soTien: number;
  /** Số bài của đơn vị này theo từng `id_the_loai`; thể loại không có bài thì khuyết. */
  theoTheLoai: Record<string, number>;
}

export interface DonViTheLoaiMatrix {
  /** Cột thể loại, sắp giảm dần theo tổng số bài toàn báo cáo. */
  theLoaiCols: { id: string; label: string }[];
  rows: DonViTheLoaiMatrixRow[];
  /** Dòng tổng cộng: tổng số bài, tổng tiền và tổng theo từng thể loại. */
  totals: { soBai: number; soTien: number; theoTheLoai: Record<string, number> };
}

/**
 * Gộp hai chiều đơn vị × thể loại cho sheet "Theo don vi" của file xuất —
 * đúng thứ người dùng cần: mỗi đơn vị một dòng, tổng bài và tổng từng thể loại.
 * Tổng các dòng, tổng các cột và `totals.soBai` luôn bằng tổng `so_bai` đã lọc.
 */
export function aggregateDonViTheLoaiMatrix(
  filtered: BaiVietThongKeNhom[],
  tenDonViById: ReadonlyMap<string, string>,
  unknownLabel: string,
): DonViTheLoaiMatrix {
  const theLoaiTally = new Map<string, { label: string; soBai: number }>();
  const donViTally = new Map<
    string,
    { label: string; soBai: number; soTien: number; theoTheLoai: Map<string, number> }
  >();
  let tongSoTien = 0;

  for (const item of filtered) {
    const theLoaiId = String(item.id_the_loai);
    const theLoaiLabel = item.ten_the_loai?.trim() || theLoaiId;
    const tl = theLoaiTally.get(theLoaiId);
    if (tl) tl.soBai += item.so_bai;
    else theLoaiTally.set(theLoaiId, { label: theLoaiLabel, soBai: item.so_bai });

    const soTien = item.so_tien;
    tongSoTien += soTien;

    const donViId = getArticleDonViKey(item);
    let dv = donViTally.get(donViId);
    if (!dv) {
      dv = {
        label: getArticleDonViLabel(donViId, tenDonViById, unknownLabel),
        soBai: 0,
        soTien: 0,
        theoTheLoai: new Map<string, number>(),
      };
      donViTally.set(donViId, dv);
    }
    dv.soBai += item.so_bai;
    dv.soTien += soTien;
    dv.theoTheLoai.set(theLoaiId, (dv.theoTheLoai.get(theLoaiId) ?? 0) + item.so_bai);
  }

  const theLoaiCols = [...theLoaiTally.entries()]
    .sort((a, b) => b[1].soBai - a[1].soBai || a[1].label.localeCompare(b[1].label, 'vi'))
    .map(([id, v]) => ({ id, label: v.label }));

  const tongSoBai = sumSoBai(filtered);
  const rows = [...donViTally.entries()]
    .map(([id, v]) => ({
      id,
      label: v.label,
      soBai: v.soBai,
      tyTrongSoBai: tongSoBai > 0 ? (v.soBai * 100) / tongSoBai : 0,
      soTien: v.soTien,
      theoTheLoai: Object.fromEntries(v.theoTheLoai),
    }))
    .sort(compareDonViRow);

  const totals: DonViTheLoaiMatrix['totals'] = {
    soBai: tongSoBai,
    soTien: tongSoTien,
    theoTheLoai: Object.fromEntries([...theLoaiTally.entries()].map(([id, v]) => [id, v.soBai])),
  };

  return { theLoaiCols, rows, totals };
}

/* ------------------------------------------------------------------ *
 * Tổng hợp theo người tạo (kèm đơn vị) — dành cho file xuất
 * ------------------------------------------------------------------ */

export interface NguoiTaoStatsRow {
  id: string;
  label: string;
  /** Đơn vị của người tạo; người thuộc nhiều đơn vị là chuyện không xảy ra vì
   *  đơn vị lấy trực tiếp từ hồ sơ nhân viên. */
  tenDonVi: string;
  soBai: number;
  /** Tổng nhuận bút của người này — chỉ dùng cho file xuất. */
  soTien: number;
}

export function aggregateByNguoiTao(
  filtered: BaiVietThongKeNhom[],
  tenDonViById: ReadonlyMap<string, string>,
  unknownLabel: string,
): NguoiTaoStatsRow[] {
  const tally = new Map<string, NguoiTaoStatsRow>();
  for (const item of filtered) {
    const id = item.id_nguoi_tao;
    const prev = tally.get(id);
    if (prev) {
      prev.soBai += item.so_bai;
      prev.soTien += item.so_tien;
      continue;
    }
    tally.set(id, {
      id,
      label: item.ho_va_ten_nguoi_tao?.trim() || item.ten_tai_khoan_nguoi_tao?.trim() || id,
      tenDonVi: getArticleDonViLabel(getArticleDonViKey(item), tenDonViById, unknownLabel),
      soBai: item.so_bai,
      soTien: item.so_tien,
    });
  }
  return [...tally.values()].sort(
    (a, b) => b.soBai - a.soBai || a.label.localeCompare(b.label, 'vi'),
  );
}
