import type { HoNgheoThongKeRow } from '../core/types';

/**
 * Tổng hợp cho tab Thống kê — hàm thuần, không gọi mạng.
 *
 * Mỗi dòng là một NHÓM hộ đã gộp ở máy chủ, nên mọi phép đếm là cộng `so_ho`.
 *
 * Hộ nghèo là sổ hộ theo HIỆN TRẠNG, nên không có trục thời gian: lọc theo
 * `tg_tao` sẽ ra "số hộ nhập trong kỳ", rất dễ bị đọc nhầm là "số hộ nghèo trong kỳ".
 */

export interface HnghThongKeDimensionFilters {
  xa_phuong: string[];
  doi_tuong: string[];
  trang_thai: string[];
  ton_giao: string[];
  dan_toc: string[];
}

export const HNGH_THONG_KE_INITIAL_DIMS: HnghThongKeDimensionFilters = {
  xa_phuong: [],
  doi_tuong: [],
  trang_thai: [],
  ton_giao: [],
  dan_toc: [],
};

/** `null` / rỗng khi lọc theo giá trị rời rạc — gom về một khoá riêng. */
export const HNGH_KHONG_XAC_DINH = '__none__';

function matches(selected: readonly string[], value: string | null | undefined): boolean {
  if (selected.length === 0) return true;
  const v = value?.toString().trim();
  if (!v) return selected.includes(HNGH_KHONG_XAC_DINH);
  return selected.includes(v);
}

export function filterRowsForHnghThongKe(
  rows: readonly HoNgheoThongKeRow[],
  dims: HnghThongKeDimensionFilters,
): HoNgheoThongKeRow[] {
  return rows.filter(
    (r) =>
      matches(dims.xa_phuong, r.xa_phuong_id) &&
      matches(dims.doi_tuong, r.doi_tuong) &&
      matches(dims.trang_thai, r.trang_thai) &&
      matches(dims.ton_giao, r.ton_giao) &&
      matches(dims.dan_toc, r.dan_toc_id),
  );
}

export interface HnghKpis {
  tongSoHo: number;
  dangKhoKhan: number;
  hetKhoKhan: number;
  /** 0–100, làm tròn. Không có hộ nào ⇒ 0. */
  tyLeHetKhoKhan: number;
  coTonGiao: number;
}

export function computeHnghKpis(rows: readonly HoNgheoThongKeRow[]): HnghKpis {
  let dangKhoKhan = 0;
  let hetKhoKhan = 0;
  let coTonGiao = 0;
  let tongSoHo = 0;
  for (const r of rows) {
    tongSoHo += r.so_ho;
    if (r.trang_thai === 'Đang khó khăn') dangKhoKhan += r.so_ho;
    else if (r.trang_thai === 'Hết khó khăn') hetKhoKhan += r.so_ho;
    if (r.ton_giao === 'Có') coTonGiao += r.so_ho;
  }
  return {
    tongSoHo,
    dangKhoKhan,
    hetKhoKhan,
    tyLeHetKhoKhan: tongSoHo > 0 ? Math.round((hetKhoKhan / tongSoHo) * 100) : 0,
    coTonGiao,
  };
}

export interface HnghBarPoint {
  label: string;
  soHo: number;
}

type HnghCategoryKey = 'doi_tuong' | 'trang_thai' | 'ton_giao';

/**
 * Gom theo một cột phân loại, giữ ĐÚNG thứ tự của `values` (thứ tự nghiệp vụ)
 * và luôn trả đủ mọi giá trị — cột 0 vẫn hiện để người đọc thấy "nhóm này không
 * có hộ nào". Hộ bỏ trống cột đó gom vào `labelKhongXacDinh` (chỉ thêm khi có),
 * để tổng các cột luôn bằng KPI tổng số hộ.
 */
export function buildHnghBarData(
  rows: readonly HoNgheoThongKeRow[],
  key: HnghCategoryKey,
  values: readonly string[],
  labelKhongXacDinh: string,
): HnghBarPoint[] {
  const byLabel = new Map<string, HnghBarPoint>();
  for (const v of values) byLabel.set(v, { label: v, soHo: 0 });
  let khongXacDinh = 0;

  for (const r of rows) {
    const label = r[key]?.toString().trim();
    if (!label) {
      khongXacDinh += r.so_ho;
      continue;
    }
    const cur = byLabel.get(label) ?? { label, soHo: 0 };
    cur.soHo += r.so_ho;
    byLabel.set(label, cur);
  }
  const out = [...byLabel.values()];
  if (khongXacDinh > 0) out.push({ label: labelKhongXacDinh, soHo: khongXacDinh });
  return out;
}

/** Theo dân tộc — nhiều hộ nhất trước; hộ chưa ghi dân tộc gom một cột cuối. */
export function buildHnghDanTocBarData(
  rows: readonly HoNgheoThongKeRow[],
  labelKhongXacDinh: string,
): HnghBarPoint[] {
  const byId = new Map<string, HnghBarPoint>();
  let khongXacDinh = 0;
  for (const r of rows) {
    const id = r.dan_toc_id?.toString().trim();
    if (!id) {
      khongXacDinh += r.so_ho;
      continue;
    }
    const cur = byId.get(id) ?? { label: r.ten_dan_toc?.trim() || id, soHo: 0 };
    cur.soHo += r.so_ho;
    byId.set(id, cur);
  }
  const out = [...byId.values()].sort(
    (a, b) => b.soHo - a.soHo || a.label.localeCompare(b.label, 'vi'),
  );
  if (khongXacDinh > 0) out.push({ label: labelKhongXacDinh, soHo: khongXacDinh });
  return out;
}

export interface HnghXaPhuongRow {
  id: string;
  label: string;
  tongSoHo: number;
  dangKhoKhan: number;
  hetKhoKhan: number;
  hoNgheo: number;
  canNgheo: number;
  khoKhan: number;
  treMoCoi: number;
  khuyetTat: number;
  nanNhanCddc: number;
}

/**
 * Gom theo xã/phường. Hộ chưa gán xã gom vào một dòng riêng chứ không bị bỏ —
 * bỏ đi thì tổng của bảng lệch với KPI mà không ai thấy.
 */
export function aggregateHnghByXaPhuong(
  rows: readonly HoNgheoThongKeRow[],
  labelKhongGan: string,
): HnghXaPhuongRow[] {
  const byXa = new Map<string, HnghXaPhuongRow>();
  for (const r of rows) {
    const id = r.xa_phuong_id?.toString().trim() || HNGH_KHONG_XAC_DINH;
    const label = r.ten_xa_phuong?.toString().trim() || labelKhongGan;
    const cur = byXa.get(id) ?? {
      id,
      label,
      tongSoHo: 0,
      dangKhoKhan: 0,
      hetKhoKhan: 0,
      hoNgheo: 0,
      canNgheo: 0,
      khoKhan: 0,
      treMoCoi: 0,
      khuyetTat: 0,
      nanNhanCddc: 0,
    };
    const n = r.so_ho;
    cur.tongSoHo += n;
    if (r.trang_thai === 'Đang khó khăn') cur.dangKhoKhan += n;
    else if (r.trang_thai === 'Hết khó khăn') cur.hetKhoKhan += n;
    if (r.doi_tuong === 'Hộ nghèo') cur.hoNgheo += n;
    else if (r.doi_tuong === 'Cận nghèo') cur.canNgheo += n;
    else if (r.doi_tuong === 'Khó khăn') cur.khoKhan += n;
    else if (r.doi_tuong === 'Trẻ mồ côi') cur.treMoCoi += n;
    else if (r.doi_tuong === 'Khuyết tật') cur.khuyetTat += n;
    else if (r.doi_tuong === 'Nạn nhân CĐDC') cur.nanNhanCddc += n;
    byXa.set(id, cur);
  }
  return [...byXa.values()].sort(
    (a, b) => b.tongSoHo - a.tongSoHo || a.label.localeCompare(b.label, 'vi'),
  );
}
