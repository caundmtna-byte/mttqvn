/**
 * Đọc hai cột jsonb của biên bản (`thanh_phan_kiem_tra`, `nguon_khac`).
 *
 * Dữ liệu jsonb không có kiểu ở DB ngoài CHECK hình dạng thô, nên đọc phòng thủ:
 * thiếu khoá / sai kiểu thì về giá trị rỗng chứ không ném lỗi làm trắng màn hình.
 */
import { NDDK_NGUON_KHAC_MAX, NDDK_THON_KIEM_TRA_MAX } from '../core/constants';
import type { NddkNguoiThamGia, NddkNguonKhac, NddkThanhPhanKiemTra } from '../core/types';

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

function asObject(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function emptyNguoiThamGia(): NddkNguoiThamGia {
  return { ho_ten: '', chuc_vu: '' };
}

export function emptyThanhPhanKiemTra(): NddkThanhPhanKiemTra {
  return {
    bcd: emptyNguoiThamGia(),
    ubnd: emptyNguoiThamGia(),
    mttq: emptyNguoiThamGia(),
    thon: [],
  };
}

export function parseNguoiThamGia(raw: unknown): NddkNguoiThamGia {
  const o = asObject(raw);
  return { ho_ten: str(o?.ho_ten), chuc_vu: str(o?.chuc_vu) };
}

export function isNguoiThamGiaEmpty(p: NddkNguoiThamGia): boolean {
  return !p.ho_ten.trim() && !p.chuc_vu.trim();
}

export function parseThanhPhanKiemTra(raw: unknown): NddkThanhPhanKiemTra | null {
  const o = asObject(raw);
  if (!o) return null;
  const thon = Array.isArray(o.thon)
    ? o.thon
        .map(parseNguoiThamGia)
        .filter((p) => !isNguoiThamGiaEmpty(p))
        .slice(0, NDDK_THON_KIEM_TRA_MAX)
    : [];
  return {
    bcd: parseNguoiThamGia(o.bcd),
    ubnd: parseNguoiThamGia(o.ubnd),
    mttq: parseNguoiThamGia(o.mttq),
    thon,
  };
}

export function isThanhPhanKiemTraEmpty(tp: NddkThanhPhanKiemTra | null | undefined): boolean {
  if (!tp) return true;
  return (
    isNguoiThamGiaEmpty(tp.bcd) &&
    isNguoiThamGiaEmpty(tp.ubnd) &&
    isNguoiThamGiaEmpty(tp.mttq) &&
    tp.thon.every(isNguoiThamGiaEmpty)
  );
}

export function parseNguonKhac(raw: unknown): NddkNguonKhac[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const o = asObject(item);
      const n = o?.so_tien == null || o.so_tien === '' ? null : Number(o.so_tien);
      return { ten: str(o?.ten), so_tien: n != null && Number.isFinite(n) ? n : null };
    })
    .filter((x) => x.ten !== '' || x.so_tien != null)
    .slice(0, NDDK_NGUON_KHAC_MAX);
}
