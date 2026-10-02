import { txt } from '@/lib/text';
import type { KhoDonViCuuTroListRow } from '../core/types';

/**
 * Một dòng của RPC `get_kho_don_vi_cuu_tro_ung_ho_nhom`: số ủng hộ của MỘT đơn vị
 * trong MỘT nhóm.
 *   nguon 'kho'          — phiếu nhập từ ngoài, nhóm theo Đợt cứu trợ ('dot:<id>' | 'dot:none'),
 *                          toàn bộ là hiện vật (giá trị hàng).
 *   nguon 'chuong_trinh' — Chương trình hỗ trợ, nhóm theo Nội dung hỗ trợ ('nd:<chữ thường>'),
 *                          so_tien là tiền mặt, tong_tien_quy_doi là hiện vật quy tiền.
 */
export interface DonViCuuTroUngHoNhom {
  donViId: string;
  nguon: 'kho' | 'chuong_trinh';
  nhomKey: string;
  nhomTen: string | null;
  tienMat: number;
  hienVat: number;
  soLuot: number;
}

export interface DonViCuuTroUngHoTong {
  tienMat: number;
  hienVat: number;
  tong: number;
  soLuot: number;
}

export const NHOM_KHONG_DOT = 'dot:none';

/** Nhãn hiển thị của một nhóm: "Đợt: …", "Chưa gắn đợt", "Nội dung: …". */
export function nhanNhomUngHo(nhomKey: string, nhomTen: string | null): string {
  if (nhomKey === NHOM_KHONG_DOT) return txt('matTranDonViCuuTro.ungHo.chuaGanDot');
  const ten = nhomTen?.trim() || nhomKey.slice(nhomKey.indexOf(':') + 1);
  return nhomKey.startsWith('dot:')
    ? txt('matTranDonViCuuTro.ungHo.nhanDot', { ten })
    : txt('matTranDonViCuuTro.ungHo.nhanNoiDung', { ten });
}

/** Thứ tự nhóm: đợt (theo tên, "chưa gắn đợt" cuối) rồi tới nội dung (theo tên). */
function soSanhNhom(a: { nhomKey: string; nhan: string }, b: { nhomKey: string; nhan: string }): number {
  const hang = (k: string) => (k === NHOM_KHONG_DOT ? 1 : k.startsWith('dot:') ? 0 : 2);
  return hang(a.nhomKey) - hang(b.nhomKey) || a.nhan.localeCompare(b.nhan, 'vi');
}

/** Lựa chọn cho chip lọc "Đợt / Nội dung" — `count` là số đơn vị có phát sinh trong nhóm. */
export function buildNhomUngHoOptions(
  rows: readonly DonViCuuTroUngHoNhom[],
): { value: string; label: string; count: number }[] {
  const map = new Map<string, { nhomKey: string; nhan: string; donVi: Set<string> }>();
  for (const r of rows) {
    const g = map.get(r.nhomKey) ?? { nhomKey: r.nhomKey, nhan: nhanNhomUngHo(r.nhomKey, r.nhomTen), donVi: new Set() };
    g.donVi.add(r.donViId);
    map.set(r.nhomKey, g);
  }
  return [...map.values()]
    .sort(soSanhNhom)
    .map((g) => ({ value: g.nhomKey, label: g.nhan, count: g.donVi.size }));
}

/**
 * Cộng các nhóm thành số của từng đơn vị. `nhomChon` rỗng = mọi nhóm; có chọn thì
 * chỉ cộng nhóm được chọn (chọn một đợt ⇒ cột kết quả chỉ tính trong đợt đó).
 */
export function tongHopUngHoTheoDonVi(
  rows: readonly DonViCuuTroUngHoNhom[],
  nhomChon: readonly string[] = [],
): Map<string, DonViCuuTroUngHoTong> {
  const chon = new Set(nhomChon);
  const out = new Map<string, DonViCuuTroUngHoTong>();
  for (const r of rows) {
    if (chon.size > 0 && !chon.has(r.nhomKey)) continue;
    const t = out.get(r.donViId) ?? { tienMat: 0, hienVat: 0, tong: 0, soLuot: 0 };
    t.tienMat += r.tienMat;
    t.hienVat += r.hienVat;
    t.tong += r.tienMat + r.hienVat;
    t.soLuot += r.soLuot;
    out.set(r.donViId, t);
  }
  return out;
}

/**
 * Gắn số ủng hộ vào danh sách đơn vị. `daTai = false` (RPC chưa về) ⇒ để `null`
 * ("chưa tải"), KHÔNG phải 0 — tránh hiện 0 đồng trong tích tắc rồi nhảy số.
 */
export function ganUngHoVaoDanhSach(
  rows: readonly KhoDonViCuuTroListRow[],
  tong: ReadonlyMap<string, DonViCuuTroUngHoTong>,
  daTai: boolean,
): KhoDonViCuuTroListRow[] {
  return rows.map((r) => {
    if (!daTai) return { ...r, tien_mat_ung_ho: null, hien_vat_ung_ho: null, ket_qua_ung_ho: null };
    const t = tong.get(r.id);
    return {
      ...r,
      tien_mat_ung_ho: t?.tienMat ?? 0,
      hien_vat_ung_ho: t?.hienVat ?? 0,
      ket_qua_ung_ho: t?.tong ?? 0,
    };
  });
}

/** Các nhóm của một đơn vị, đúng thứ tự hiển thị — cho bảng ở màn chi tiết. */
export function nhomUngHoCuaDonVi(
  rows: readonly DonViCuuTroUngHoNhom[],
  donViId: string | null | undefined,
): (DonViCuuTroUngHoNhom & { nhan: string; tong: number })[] {
  if (!donViId) return [];
  return rows
    .filter((r) => r.donViId === donViId)
    .map((r) => ({ ...r, nhan: nhanNhomUngHo(r.nhomKey, r.nhomTen), tong: r.tienMat + r.hienVat }))
    .sort(soSanhNhom);
}
