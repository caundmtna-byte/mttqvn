/**
 * Tồn kho + báo cáo NXT phân thuốc — view v_farm_ton_kho_phan_thuoc + flat view.
 */
import { supabase, fetchAllRows } from '../../../../lib/supabase';
import { getKhoList } from '../../../kho-van/danh-sach-kho/services/kho-service';
import { getAllFarmHangHoa } from '../../hang-hoa-phan-thuoc/services/farm-hang-hoa-service';
import type { Kho } from '../../../kho-van/danh-sach-kho/core/types';
import type { FarmHangHoa } from '../../hang-hoa-phan-thuoc/core/types';
import type { LoaiPhieuKhoPT } from '../../phieu-kho-phan-thuoc/core/types';
import type {
  FarmPhieuKhoPTFlatRow,
  NXTByProductPTRow,
  NXTByWarehousePTRow,
  NXTPTByPeriodResult,
  NXTPTFilters,
  TonKhoPTHangNxHistoryRow,
  TonKhoPTDisplayRow,
  TonKhoPTRecord,
  TonKhoPTSummaryTotals,
} from '../core/types';

const VIEW_TON = 'v_farm_ton_kho_phan_thuoc';
const VIEW_FLAT = 'v_farm_phieu_kho_phan_thuoc_chi_tiet_flat';

const FLAT_SELECT =
  'id_phieu_kho, so_phieu, ngay, loai, kho_id, kho_den_id, trang_thai, id_hang_hoa, so_luong, ma_hang';

const HANG_NX_HISTORY_SELECT =
  'chi_tiet_id, id_phieu_kho, so_phieu, ngay, loai, kho_id, kho_den_id, phieu_tg_tao, ten_kho, ten_kho_den, trang_thai, so_luong, don_vi_tinh';

interface HangNxHistoryDbRow {
  chi_tiet_id: number;
  id_phieu_kho: number;
  so_phieu: string;
  ngay: string;
  loai: string;
  kho_id: number;
  kho_den_id: number | null;
  phieu_tg_tao: string | null;
  ten_kho: string | null;
  ten_kho_den: string | null;
  trang_thai: string;
  so_luong: number | string | null;
  don_vi_tinh: string | null;
}

interface TonKhoViewRow {
  id_kho: number;
  id_hang_hoa: number;
  so_luong: number | string | null;
}

function rowToTonKho(r: TonKhoViewRow): TonKhoPTRecord {
  return {
    id_kho: String(r.id_kho),
    id_hang_hoa: String(r.id_hang_hoa),
    so_luong: Number(r.so_luong) || 0,
  };
}

/** Ma trận tồn từ view (chỉ id kho × hàng + số lượng). */
export async function getTonKhoPTMatrix(): Promise<TonKhoPTRecord[]> {
  const rows = await fetchAllRows<TonKhoViewRow>((from, to) =>
    supabase.from(VIEW_TON).select('id_kho, id_hang_hoa, so_luong').range(from, to)
  );
  return rows.map(rowToTonKho);
}

/** Dòng hiển thị đã join tên kho / hàng. */
export async function getTonKhoPTDisplayRows(): Promise<TonKhoPTDisplayRow[]> {
  const [matrix, khoList, hangList] = await Promise.all([getTonKhoPTMatrix(), getKhoList(), getAllFarmHangHoa()]);
  const khoMap: Record<string, Kho> = {};
  khoList.forEach((k) => {
    khoMap[String(k.id)] = k;
  });
  const hhMap: Record<string, FarmHangHoa> = {};
  hangList.forEach((h) => {
    hhMap[String(h.id)] = h;
  });
  return matrix.map((r) => {
    const k = khoMap[r.id_kho];
    const h = hhMap[r.id_hang_hoa];
    return {
      ...r,
      ma_kho: k?.ma_kho ?? r.id_kho,
      ten_kho: k?.ten_kho ?? r.id_kho,
      ma_hang: h?.ma_hang_hoa ?? h?.ma_hang ?? r.id_hang_hoa,
      ten_hang: h?.ten_hang_hoa ?? h?.ten_hang ?? '—',
      don_vi_tinh: h?.dvt ?? h?.don_vi_tinh ?? '—',
      ten_danh_muc: h?.ten_danh_muc,
      danh_muc_id: h?.danh_muc_id ?? null,
    };
  });
}

/** Lịch sử phiếu kho (NX) của một hàng — từ view flat, mới nhất trước. */
export async function getPhieuKhoPTHangNxHistory(idHangHoa: string): Promise<TonKhoPTHangNxHistoryRow[]> {
  const idNum = Number(idHangHoa);
  if (!idHangHoa?.trim() || Number.isNaN(idNum)) return [];

  const rows = await fetchAllRows<HangNxHistoryDbRow>((from, to) =>
    supabase
      .from(VIEW_FLAT)
      .select(HANG_NX_HISTORY_SELECT)
      .eq('id_hang_hoa', idNum)
      .order('ngay', { ascending: false })
      .order('chi_tiet_id', { ascending: false })
      .range(from, to)
  );

  return rows.map((r) => ({
    chi_tiet_id: r.chi_tiet_id,
    id_phieu_kho: r.id_phieu_kho,
    so_phieu: r.so_phieu ?? '',
    ngay: (r.ngay ?? '').trim().slice(0, 10),
    loai: (r.loai ?? '').trim(),
    kho_id: String(r.kho_id),
    kho_den_id: r.kho_den_id != null ? String(r.kho_den_id) : null,
    phieu_tg_tao: r.phieu_tg_tao ?? null,
    ten_kho: r.ten_kho,
    ten_kho_den: r.ten_kho_den,
    trang_thai: (r.trang_thai ?? '').trim(),
    so_luong: Number(r.so_luong) || 0,
    don_vi_tinh: r.don_vi_tinh,
  }));
}

function isTrangThaiTinhTon(trang_thai: string | null | undefined): boolean {
  return (trang_thai ?? '').trim() !== 'Không duyệt';
}

function normalizeLoai(loai: string | undefined | null): LoaiPhieuKhoPT | null {
  const l = (loai ?? '').trim();
  if (l === 'nhập') return 'nhập';
  if (l === 'xuất') return 'xuất';
  if (l === 'chuyển') return 'chuyển';
  return null;
}

type Mov = { nhap: number; xuat: number };
const zeroMov = (): Mov => ({ nhap: 0, xuat: 0 });
const addMov = (map: Map<string, Mov>, key: string, nhap: number, xuat: number) => {
  const cur = map.get(key) ?? zeroMov();
  cur.nhap += nhap;
  cur.xuat += xuat;
  map.set(key, cur);
};

interface PhieuLite {
  id: string;
  ngay: string;
  loai: LoaiPhieuKhoPT;
  kho_id: string;
  kho_den_id: string | null;
  trang_thai: string;
}

/** Trạng thái trung gian tính NXT (dùng lại cho breakdown theo kho / 1 SP). */
interface NXTPTPeriodState {
  tonKhoList: TonKhoPTRecord[];
  hangHoaMap: Record<string, FarmHangHoa>;
  khoMap: Record<string, Kho>;
  warehouseSet: Set<string> | null;
  productOk: (idHh: string) => boolean;
  currentByKH: Map<string, number>;
  afterByKH: Map<string, Mov>;
  periodByKH: Map<string, Mov>;
  periodByKho: Map<string, Mov>;
  periodByHH: Map<string, Mov>;
  khoIdsForReport: string[];
}

async function computeNXTPTPeriodState(filters: NXTPTFilters): Promise<NXTPTPeriodState> {
  const { dateFrom, dateTo, warehouseIds, loaiPhieu, hangHoaIds, categoryIds } = filters;

  const [tonKhoList, flatRows, khoList, hangHoaList] = await Promise.all([
    getTonKhoPTMatrix(),
    fetchAllRows<FarmPhieuKhoPTFlatRow>((from, to) =>
      supabase.from(VIEW_FLAT).select(FLAT_SELECT).range(from, to)
    ),
    getKhoList(),
    getAllFarmHangHoa(),
  ]);

  const hangHoaMap: Record<string, FarmHangHoa> = {};
  hangHoaList.forEach((h) => {
    hangHoaMap[String(h.id)] = h;
  });
  const khoMap: Record<string, Kho> = {};
  khoList.forEach((k) => {
    khoMap[String(k.id)] = k;
  });

  const phieuMap = new Map<string, PhieuLite>();
  const ctByPhieu = new Map<string, { idHh: string; qty: number }[]>();

  for (const row of flatRows) {
    const pid = String(row.id_phieu_kho);
    if (!phieuMap.has(pid)) {
      const lo = normalizeLoai(row.loai);
      if (!lo) continue;
      phieuMap.set(pid, {
        id: pid,
        ngay: (row.ngay ?? '').trim().slice(0, 10),
        loai: lo,
        kho_id: String(row.kho_id),
        kho_den_id: row.kho_den_id != null ? String(row.kho_den_id) : null,
        trang_thai: row.trang_thai ?? '',
      });
    }
    if (!phieuMap.has(pid)) continue;
    const qty = Number(row.so_luong) || 0;
    if (qty <= 0) continue;
    const arr = ctByPhieu.get(pid);
    const item = { idHh: String(row.id_hang_hoa), qty };
    if (arr) arr.push(item);
    else ctByPhieu.set(pid, [item]);
  }

  const phieuList = [...phieuMap.values()];

  const warehouseSet = warehouseIds?.length ? new Set(warehouseIds.map(String)) : null;
  const loaiSet = loaiPhieu?.length ? new Set(loaiPhieu) : null;
  const hangHoaSet = hangHoaIds?.length ? new Set(hangHoaIds.map(String)) : null;
  const categorySet = categoryIds?.length ? new Set(categoryIds.map(String)) : null;

  const productOk = (idHh: string): boolean => {
    if (hangHoaSet && !hangHoaSet.has(idHh)) return false;
    const h = hangHoaMap[idHh];
    if (categorySet) {
      if (!h?.danh_muc_id || !categorySet.has(h.danh_muc_id)) return false;
    }
    return true;
  };

  const afterByKH = new Map<string, Mov>();
  const periodByKH = new Map<string, Mov>();
  const periodByKho = new Map<string, Mov>();
  const periodByHH = new Map<string, Mov>();

  for (const p of phieuList) {
    if (!isTrangThaiTinhTon(p.trang_thai)) continue;
    const d = p.ngay;
    if (!d) continue;
    const isIn = d >= dateFrom && d <= dateTo;
    const isAfter = d > dateTo;
    if (!isIn && !isAfter) continue;

    const items = ctByPhieu.get(p.id) ?? [];
    const khoId = p.kho_id;
    const khoDenId = p.kho_den_id;

    for (const ct of items) {
      if (ct.qty <= 0) continue;

      if (isAfter) {
        if (p.loai === 'nhập') {
          addMov(afterByKH, `${khoId}|${ct.idHh}`, ct.qty, 0);
        } else if (p.loai === 'xuất') {
          addMov(afterByKH, `${khoId}|${ct.idHh}`, 0, ct.qty);
        } else if (p.loai === 'chuyển' && khoDenId) {
          addMov(afterByKH, `${khoId}|${ct.idHh}`, 0, ct.qty);
          addMov(afterByKH, `${khoDenId}|${ct.idHh}`, ct.qty, 0);
        }
        continue;
      }

      if (!productOk(ct.idHh)) continue;
      if (loaiSet && !loaiSet.has(p.loai)) continue;

      if (p.loai === 'nhập') {
        if (warehouseSet && !warehouseSet.has(khoId)) continue;
        addMov(periodByKH, `${khoId}|${ct.idHh}`, ct.qty, 0);
        addMov(periodByKho, khoId, ct.qty, 0);
        addMov(periodByHH, ct.idHh, ct.qty, 0);
      } else if (p.loai === 'xuất') {
        if (warehouseSet && !warehouseSet.has(khoId)) continue;
        addMov(periodByKH, `${khoId}|${ct.idHh}`, 0, ct.qty);
        addMov(periodByKho, khoId, 0, ct.qty);
        addMov(periodByHH, ct.idHh, 0, ct.qty);
      } else if (p.loai === 'chuyển' && khoDenId) {
        const fromOk = !warehouseSet || warehouseSet.has(khoId);
        const toOk = !warehouseSet || warehouseSet.has(khoDenId);
        if (!fromOk && !toOk) continue;
        if (fromOk) {
          addMov(periodByKH, `${khoId}|${ct.idHh}`, 0, ct.qty);
          addMov(periodByKho, khoId, 0, ct.qty);
        }
        if (toOk) {
          addMov(periodByKH, `${khoDenId}|${ct.idHh}`, ct.qty, 0);
          addMov(periodByKho, khoDenId, ct.qty, 0);
        }
      }
    }
  }

  const currentByKH = new Map<string, number>();
  tonKhoList.forEach((r) => {
    const key = `${r.id_kho}|${r.id_hang_hoa}`;
    currentByKH.set(key, (currentByKH.get(key) ?? 0) + r.so_luong);
  });
  afterByKH.forEach((_, key) => {
    if (!currentByKH.has(key)) currentByKH.set(key, 0);
  });
  periodByKH.forEach((_, key) => {
    if (!currentByKH.has(key)) currentByKH.set(key, 0);
  });

  const khoIdsForReport = warehouseSet
    ? Array.from(warehouseSet)
    : [...new Set([...khoList.map((k) => String(k.id)), ...periodByKho.keys()])];

  return {
    tonKhoList,
    hangHoaMap,
    khoMap,
    warehouseSet,
    productOk,
    currentByKH,
    afterByKH,
    periodByKH,
    periodByKho,
    periodByHH,
    khoIdsForReport,
  };
}

function aggregateNXTByWarehouseRows(state: NXTPTPeriodState): NXTByWarehousePTRow[] {
  const { khoIdsForReport, khoMap, currentByKH, afterByKH, periodByKH, periodByKho, productOk } = state;
  const byWarehouseRows: NXTByWarehousePTRow[] = [];

  for (const idKho of khoIdsForReport) {
    const k = khoMap[idKho];
    const pMov = periodByKho.get(idKho) ?? zeroMov();
    let ton_cuoi_ky = 0;
    let ton_dau_ky = 0;

    currentByKH.forEach((currentQty, key) => {
      const [kho, hh] = key.split('|');
      if (kho !== idKho || !productOk(hh)) return;
      const after = afterByKH.get(key) ?? zeroMov();
      const period = periodByKH.get(key) ?? zeroMov();
      const endQty = currentQty - after.nhap + after.xuat;
      const startQty = endQty - period.nhap + period.xuat;
      ton_cuoi_ky += endQty;
      ton_dau_ky += startQty;
    });

    byWarehouseRows.push({
      id_kho: idKho,
      ma_kho: k?.ma_kho ?? idKho,
      ten_kho: k?.ten_kho ?? idKho,
      ton_dau_ky,
      tong_nhap: pMov.nhap,
      tong_xuat: pMov.xuat,
      ton_cuoi_ky,
    });
  }

  return byWarehouseRows;
}

function aggregateNXTByProductRows(state: NXTPTPeriodState): NXTByProductPTRow[] {
  const { tonKhoList, hangHoaMap, currentByKH, afterByKH, periodByKH, periodByHH, warehouseSet, productOk } = state;
  const byProductRows: NXTByProductPTRow[] = [];
  const hhIdsForReport = new Set<string>();
  periodByHH.forEach((_, id) => hhIdsForReport.add(id));
  tonKhoList.forEach((r) => {
    if (productOk(r.id_hang_hoa)) hhIdsForReport.add(r.id_hang_hoa);
  });

  hhIdsForReport.forEach((idHh) => {
    if (!productOk(idHh)) return;
    const h = hangHoaMap[idHh];
    const pMov = periodByHH.get(idHh) ?? zeroMov();
    let ton_cuoi_ky = 0;
    let ton_dau_ky = 0;

    currentByKH.forEach((currentQty, key) => {
      const [kho, hh] = key.split('|');
      if (hh !== idHh) return;
      if (warehouseSet && !warehouseSet.has(kho)) return;
      const after = afterByKH.get(key) ?? zeroMov();
      const period = periodByKH.get(key) ?? zeroMov();
      const endQty = currentQty - after.nhap + after.xuat;
      const startQty = endQty - period.nhap + period.xuat;
      ton_cuoi_ky += endQty;
      ton_dau_ky += startQty;
    });

    byProductRows.push({
      id_hang_hoa: idHh,
      ma_hang: h?.ma_hang_hoa ?? h?.ma_hang ?? idHh,
      ten_hang: h?.ten_hang_hoa ?? h?.ten_hang ?? '—',
      ten_danh_muc: h?.ten_danh_muc,
      don_vi_tinh: h?.dvt ?? h?.don_vi_tinh ?? '—',
      ton_dau_ky,
      tong_nhap: pMov.nhap,
      tong_xuat: pMov.xuat,
      ton_cuoi_ky,
    });
  });

  return byProductRows;
}

/** NXT trong kỳ theo từng kho cho một hàng (drawer chi tiết). */
function buildNXTProductRowsByWarehouse(state: NXTPTPeriodState, idHangHoa: string): NXTByWarehousePTRow[] {
  const { khoIdsForReport, khoMap, currentByKH, afterByKH, periodByKH, productOk } = state;
  const idHh = String(idHangHoa);
  if (!productOk(idHh)) return [];

  const rows: NXTByWarehousePTRow[] = [];
  for (const idKho of khoIdsForReport) {
    const key = `${idKho}|${idHh}`;
    const period = periodByKH.get(key) ?? zeroMov();
    const currentQty = currentByKH.get(key) ?? 0;
    const after = afterByKH.get(key) ?? zeroMov();
    const endQty = currentQty - after.nhap + after.xuat;
    const startQty = endQty - period.nhap + period.xuat;
    if (startQty === 0 && endQty === 0 && period.nhap === 0 && period.xuat === 0) continue;
    const k = khoMap[idKho];
    rows.push({
      id_kho: idKho,
      ma_kho: k?.ma_kho ?? idKho,
      ten_kho: k?.ten_kho ?? idKho,
      ton_dau_ky: startQty,
      tong_nhap: period.nhap,
      tong_xuat: period.xuat,
      ton_cuoi_ky: endQty,
    });
  }
  rows.sort((a, b) => a.ten_kho.localeCompare(b.ten_kho, 'vi'));
  return rows;
}

/** Lấy breakdown theo kho cho một sản phẩm (cùng bộ lọc kỳ). */
export async function getNXTPTProductWarehouseBreakdown(
  filters: NXTPTFilters,
  idHangHoa: string
): Promise<NXTByWarehousePTRow[]> {
  const state = await computeNXTPTPeriodState(filters);
  return buildNXTProductRowsByWarehouse(state, idHangHoa);
}

/** Báo cáo NXT theo kỳ (client-side, cùng công thức bao-cao-nxt-service). */
export async function getNXTPTByPeriod(filters: NXTPTFilters): Promise<NXTPTByPeriodResult> {
  const state = await computeNXTPTPeriodState(filters);
  return {
    byWarehouse: aggregateNXTByWarehouseRows(state),
    byProduct: aggregateNXTByProductRows(state),
  };
}

export function sumNXTPTSummary(byProduct: NXTByProductPTRow[]): TonKhoPTSummaryTotals {
  return byProduct.reduce(
    (acc, r) => ({
      ton_dau_ky: acc.ton_dau_ky + r.ton_dau_ky,
      tong_nhap: acc.tong_nhap + r.tong_nhap,
      tong_xuat: acc.tong_xuat + r.tong_xuat,
      ton_cuoi_ky: acc.ton_cuoi_ky + r.ton_cuoi_ky,
    }),
    { ton_dau_ky: 0, tong_nhap: 0, tong_xuat: 0, ton_cuoi_ky: 0 }
  );
}
