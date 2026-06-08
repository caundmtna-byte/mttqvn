/**
 * Tồn kho + báo cáo NXT — `kho_ton_kho_view` + flat chi tiết phiếu nhập xuất.
 */
import { isSupabase } from '@/lib/data/config';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { NhapXuatKhoCtFlatRow } from '../../nhap-xuat-kho/core/types';
import type { NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';
import {
  getNhapXuatKhoCtFlatList,
} from '../../nhap-xuat-kho/services/kho-nhap-xuat-kho-service';
import { getKhoDanhSachKhoList } from '../../danh-sach-kho/services/kho-danh-sach-kho-service';
import { getKhoDanhSachHangHoaList } from '../../hang-hoa/services/kho-danh-sach-hang-hoa-service';
import type { KhoDanhSachHangHoaListRow } from '../../hang-hoa/core/types';
import type { KhoDanhSachKhoListRow } from '../../danh-sach-kho/core/types';
import type {
  NXTByPeriodResult,
  NXTByProductRow,
  NXTByWarehouseRow,
  NXTFilters,
  TonKhoDisplayRow,
  TonKhoHangNxHistoryRow,
  TonKhoRecord,
  TonKhoSummaryTotals,
} from '../core/types';

const VIEW_TON = 'kho_ton_kho_view';
const PAGE_SIZE = 1000;

interface TonKhoViewRow {
  kho_id: number | string;
  hang_hoa_id: number | string;
  ton_kho: number | string | null;
}

async function fetchAllPages<T>(fetchPage: (from: number, to: number) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const to = from + PAGE_SIZE - 1;
    const chunk = await fetchPage(from, to);
    out.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

function rowToTonKho(r: TonKhoViewRow): TonKhoRecord {
  return {
    kho_id: String(r.kho_id),
    hang_hoa_id: String(r.hang_hoa_id),
    ton_kho: Number(r.ton_kho) || 0,
  };
}

/** Ma trận tồn từ view. */
export async function getTonKhoMatrix(): Promise<TonKhoRecord[]> {
  if (!isSupabase()) {
    const flat = await getNhapXuatKhoCtFlatList();
    const map = new Map<string, number>();
    for (const line of flat) {
      const qty = line.so_luong;
      if (line.kho_nhap_id) {
        const k = `${line.kho_nhap_id}|${line.hang_hoa_id}`;
        map.set(k, (map.get(k) ?? 0) + qty);
      }
      if (line.kho_xuat_id) {
        const k = `${line.kho_xuat_id}|${line.hang_hoa_id}`;
        map.set(k, (map.get(k) ?? 0) - qty);
      }
    }
    return [...map.entries()].map(([key, ton_kho]) => {
      const [kho_id, hang_hoa_id] = key.split('|');
      return { kho_id, hang_hoa_id, ton_kho };
    });
  }
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<TonKhoViewRow>((from, to) =>
    Promise.resolve(
      supabase
        .from(VIEW_TON)
        .select('kho_id,hang_hoa_id,ton_kho')
        .range(from, to)
        .then(({ data, error }) => {
          if (error) handleSupabaseError(error);
          return (data ?? []) as TonKhoViewRow[];
        }),
    )
  );
  return rows.map(rowToTonKho).filter((r) => r.ton_kho !== 0);
}

/** Dòng hiển thị đã join tên kho / hàng. */
export async function getTonKhoDisplayRows(): Promise<TonKhoDisplayRow[]> {
  const [matrix, khoList, hangList] = await Promise.all([
    getTonKhoMatrix(),
    getKhoDanhSachKhoList(),
    getKhoDanhSachHangHoaList(),
  ]);
  const khoMap: Record<string, KhoDanhSachKhoListRow> = {};
  (khoList ?? []).forEach((k) => {
    khoMap[String(k.id)] = k;
  });
  const hhMap: Record<string, KhoDanhSachHangHoaListRow> = {};
  (hangList ?? []).forEach((h) => {
    hhMap[String(h.id)] = h;
  });
  return matrix.map((r) => {
    const k = khoMap[r.kho_id];
    const h = hhMap[r.hang_hoa_id];
    return {
      ...r,
      ten_kho: k?.ten_kho ?? r.kho_id,
      ten_hang_hoa: h?.ten_hang_hoa ?? r.hang_hoa_id,
      don_vi_tinh: h?.don_vi_tinh ?? '—',
      ten_danh_muc: h?.ten_danh_muc_nhom,
      id_danh_muc: h?.id_danh_muc ?? null,
    };
  });
}

/** Lịch sử phiếu kho (NX) của một hàng — mới nhất trước. */
export async function getHangNxHistory(hangHoaId: string): Promise<TonKhoHangNxHistoryRow[]> {
  const id = hangHoaId.trim();
  if (!id) return [];
  const flat = await getNhapXuatKhoCtFlatList();
  return flat
    .filter((r) => String(r.hang_hoa_id) === id)
    .map(flatToHistoryRow)
    .sort((a, b) => {
      const d = b.ngay_phieu.localeCompare(a.ngay_phieu);
      if (d !== 0) return d;
      return b.chi_tiet_id.localeCompare(a.chi_tiet_id, undefined, { numeric: true });
    });
}

function flatToHistoryRow(r: NhapXuatKhoCtFlatRow): TonKhoHangNxHistoryRow {
  return {
    chi_tiet_id: r.id,
    phieu_id: r.phieu_id,
    so_phieu: r.so_phieu,
    ngay_phieu: r.ngay_phieu,
    loai_phieu: r.loai_phieu,
    kho_xuat_id: r.kho_xuat_id,
    kho_nhap_id: r.kho_nhap_id,
    ten_kho_xuat: r.ten_kho_xuat,
    ten_kho_nhap: r.ten_kho_nhap,
    so_luong: r.so_luong,
    don_vi_tinh: r.don_vi_tinh,
  };
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
  loai: NhapXuatKhoLoaiPhieu;
  kho_xuat_id: string | null;
  kho_nhap_id: string | null;
}

interface NXTPeriodState {
  tonKhoList: TonKhoRecord[];
  hangHoaMap: Record<string, KhoDanhSachHangHoaListRow>;
  khoMap: Record<string, KhoDanhSachKhoListRow>;
  warehouseSet: Set<string> | null;
  productOk: (idHh: string) => boolean;
  currentByKH: Map<string, number>;
  afterByKH: Map<string, Mov>;
  periodByKH: Map<string, Mov>;
  periodByKho: Map<string, Mov>;
  periodByHH: Map<string, Mov>;
  khoIdsForReport: string[];
}

async function computeNXTPeriodState(filters: NXTFilters): Promise<NXTPeriodState> {
  const { dateFrom, dateTo, warehouseIds, loaiPhieu, hangHoaIds, categoryIds } = filters;

  const [tonKhoList, flatRows, khoList, hangHoaList] = await Promise.all([
    getTonKhoMatrix(),
    getNhapXuatKhoCtFlatList(),
    getKhoDanhSachKhoList(),
    getKhoDanhSachHangHoaList(),
  ]);

  const hangHoaMap: Record<string, KhoDanhSachHangHoaListRow> = {};
  (hangHoaList ?? []).forEach((h) => {
    hangHoaMap[String(h.id)] = h;
  });
  const khoMap: Record<string, KhoDanhSachKhoListRow> = {};
  (khoList ?? []).forEach((k) => {
    khoMap[String(k.id)] = k;
  });

  const phieuMap = new Map<string, PhieuLite>();
  const ctByPhieu = new Map<string, { idHh: string; qty: number }[]>();

  for (const row of flatRows ?? []) {
    const pid = String(row.phieu_id);
    if (!phieuMap.has(pid)) {
      phieuMap.set(pid, {
        id: pid,
        ngay: (row.ngay_phieu ?? '').trim().slice(0, 10),
        loai: row.loai_phieu,
        kho_xuat_id: row.kho_xuat_id,
        kho_nhap_id: row.kho_nhap_id,
      });
    }
    const qty = Number(row.so_luong) || 0;
    if (qty <= 0) continue;
    const arr = ctByPhieu.get(pid);
    const item = { idHh: String(row.hang_hoa_id), qty };
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
      if (!h?.id_danh_muc || !categorySet.has(h.id_danh_muc)) return false;
    }
    return true;
  };

  const afterByKH = new Map<string, Mov>();
  const periodByKH = new Map<string, Mov>();
  const periodByKho = new Map<string, Mov>();
  const periodByHH = new Map<string, Mov>();

  for (const p of phieuList) {
    const d = p.ngay;
    if (!d) continue;
    const isIn = d >= dateFrom && d <= dateTo;
    const isAfter = d > dateTo;
    if (!isIn && !isAfter) continue;

    const items = ctByPhieu.get(p.id) ?? [];
    const khoXuat = p.kho_xuat_id;
    const khoNhap = p.kho_nhap_id;

    for (const ct of items) {
      if (ct.qty <= 0) continue;

      if (isAfter) {
        if (p.loai === 'nhap_ngoai' && khoNhap) {
          addMov(afterByKH, `${khoNhap}|${ct.idHh}`, ct.qty, 0);
        } else if (p.loai === 'xuat_ngoai' && khoXuat) {
          addMov(afterByKH, `${khoXuat}|${ct.idHh}`, 0, ct.qty);
        } else if (p.loai === 'chuyen_kho' && khoXuat && khoNhap) {
          addMov(afterByKH, `${khoXuat}|${ct.idHh}`, 0, ct.qty);
          addMov(afterByKH, `${khoNhap}|${ct.idHh}`, ct.qty, 0);
        }
        continue;
      }

      if (!productOk(ct.idHh)) continue;
      if (loaiSet && !loaiSet.has(p.loai)) continue;

      if (p.loai === 'nhap_ngoai' && khoNhap) {
        if (warehouseSet && !warehouseSet.has(khoNhap)) continue;
        addMov(periodByKH, `${khoNhap}|${ct.idHh}`, ct.qty, 0);
        addMov(periodByKho, khoNhap, ct.qty, 0);
        addMov(periodByHH, ct.idHh, ct.qty, 0);
      } else if (p.loai === 'xuat_ngoai' && khoXuat) {
        if (warehouseSet && !warehouseSet.has(khoXuat)) continue;
        addMov(periodByKH, `${khoXuat}|${ct.idHh}`, 0, ct.qty);
        addMov(periodByKho, khoXuat, 0, ct.qty);
        addMov(periodByHH, ct.idHh, 0, ct.qty);
      } else if (p.loai === 'chuyen_kho' && khoXuat && khoNhap) {
        const fromOk = !warehouseSet || warehouseSet.has(khoXuat);
        const toOk = !warehouseSet || warehouseSet.has(khoNhap);
        if (!fromOk && !toOk) continue;
        if (fromOk) {
          addMov(periodByKH, `${khoXuat}|${ct.idHh}`, 0, ct.qty);
          addMov(periodByKho, khoXuat, 0, ct.qty);
        }
        if (toOk) {
          addMov(periodByKH, `${khoNhap}|${ct.idHh}`, ct.qty, 0);
          addMov(periodByKho, khoNhap, ct.qty, 0);
        }
      }
    }
  }

  const currentByKH = new Map<string, number>();
  tonKhoList.forEach((r) => {
    const key = `${r.kho_id}|${r.hang_hoa_id}`;
    currentByKH.set(key, (currentByKH.get(key) ?? 0) + r.ton_kho);
  });
  afterByKH.forEach((_, key) => {
    if (!currentByKH.has(key)) currentByKH.set(key, 0);
  });
  periodByKH.forEach((_, key) => {
    if (!currentByKH.has(key)) currentByKH.set(key, 0);
  });

  const khoIdsForReport = warehouseSet
    ? Array.from(warehouseSet)
    : [...new Set([...(khoList ?? []).map((k) => String(k.id)), ...periodByKho.keys()])];

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

function aggregateNXTByWarehouseRows(state: NXTPeriodState): NXTByWarehouseRow[] {
  const { khoIdsForReport, khoMap, currentByKH, afterByKH, periodByKH, periodByKho, productOk } = state;
  const byWarehouseRows: NXTByWarehouseRow[] = [];

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
      kho_id: idKho,
      ten_kho: k?.ten_kho ?? idKho,
      ton_dau_ky,
      tong_nhap: pMov.nhap,
      tong_xuat: pMov.xuat,
      ton_cuoi_ky,
    });
  }

  return byWarehouseRows;
}

function aggregateNXTByProductRows(state: NXTPeriodState): NXTByProductRow[] {
  const { tonKhoList, hangHoaMap, currentByKH, afterByKH, periodByKH, periodByHH, warehouseSet, productOk } =
    state;
  const byProductRows: NXTByProductRow[] = [];
  const hhIdsForReport = new Set<string>();
  periodByHH.forEach((_, id) => hhIdsForReport.add(id));
  (tonKhoList ?? []).forEach((r) => {
    if (productOk(r.hang_hoa_id)) hhIdsForReport.add(r.hang_hoa_id);
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
      hang_hoa_id: idHh,
      ten_hang_hoa: h?.ten_hang_hoa ?? idHh,
      ten_danh_muc: h?.ten_danh_muc_nhom,
      don_vi_tinh: h?.don_vi_tinh ?? '—',
      ton_dau_ky,
      tong_nhap: pMov.nhap,
      tong_xuat: pMov.xuat,
      ton_cuoi_ky,
    });
  });

  return byProductRows;
}

function buildNXTProductRowsByWarehouse(state: NXTPeriodState, hangHoaId: string): NXTByWarehouseRow[] {
  const { khoIdsForReport, khoMap, currentByKH, afterByKH, periodByKH, productOk } = state;
  const idHh = String(hangHoaId);
  if (!productOk(idHh)) return [];

  const rows: NXTByWarehouseRow[] = [];
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
      kho_id: idKho,
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

export async function getNXTProductWarehouseBreakdown(
  filters: NXTFilters,
  hangHoaId: string
): Promise<NXTByWarehouseRow[]> {
  const state = await computeNXTPeriodState(filters);
  return buildNXTProductRowsByWarehouse(state, hangHoaId);
}

export async function getNXTByPeriod(filters: NXTFilters): Promise<NXTByPeriodResult> {
  const state = await computeNXTPeriodState(filters);
  return {
    byWarehouse: aggregateNXTByWarehouseRows(state),
    byProduct: aggregateNXTByProductRows(state),
  };
}

export function sumNXTSummary(byProduct: NXTByProductRow[] | undefined | null): TonKhoSummaryTotals {
  return (byProduct ?? []).reduce(
    (acc, r) => ({
      ton_dau_ky: acc.ton_dau_ky + r.ton_dau_ky,
      tong_nhap: acc.tong_nhap + r.tong_nhap,
      tong_xuat: acc.tong_xuat + r.tong_xuat,
      ton_cuoi_ky: acc.ton_cuoi_ky + r.ton_cuoi_ky,
    }),
    { ton_dau_ky: 0, tong_nhap: 0, tong_xuat: 0, ton_cuoi_ky: 0 }
  );
}
