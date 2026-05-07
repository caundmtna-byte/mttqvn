import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import type { CongViecDanhSach } from '../core/types';
import type { CongViecDanhSachFormValues } from '../core/schema';
import {
  CONG_VIEC_DANH_SACH_RETURNING_FULL,
  CONG_VIEC_DANH_SACH_SELECT_FULL,
} from '../core/supabase-select';
const repo = createRepository<CongViecDanhSach>({
  tableName: 'cong_viec_danh_sach',
  select: CONG_VIEC_DANH_SACH_SELECT_FULL,
  delay: 400,
});

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function normalizeIdsHoTro(raw: unknown): string[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x));
  return [];
}

function dateOnly(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = typeof v === 'string' ? v.slice(0, 10) : String(v).slice(0, 10);
  return s || null;
}

export function flattenCongViecDanhSachRow(row: Record<string, unknown>): CongViecDanhSach {
  const tr = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.trach_nhiem);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.trach_nhiem;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;
  const td = r.tien_do;
  const tienDo = typeof td === 'number' ? td : Number(td);
  return {
    ...r,
    id: String(r.id),
    muc_do: r.muc_do as CongViecDanhSach['muc_do'],
    ten_cong_viec: String(r.ten_cong_viec ?? ''),
    ghi_chu: r.ghi_chu == null || r.ghi_chu === '' ? null : String(r.ghi_chu),
    link_tai_lieu: r.link_tai_lieu == null || r.link_tai_lieu === '' ? null : String(r.link_tai_lieu),
    thoi_han: dateOnly(r.thoi_han),
    tien_do: Number.isFinite(tienDo) ? Math.min(100, Math.max(0, Math.round(tienDo))) : 0,
    id_trach_nhiem: String(r.id_trach_nhiem ?? ''),
    ids_ho_tro: normalizeIdsHoTro(r.ids_ho_tro),
    trang_thai: r.trang_thai as CongViecDanhSach['trang_thai'],
    ket_qua: r.ket_qua == null || r.ket_qua === '' ? null : String(r.ket_qua),
    link_kq: r.link_kq == null || r.link_kq === '' ? null : String(r.link_kq),
    ngay_hoan_thanh: dateOnly(r.ngay_hoan_thanh),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_trach_nhiem: tr?.ho_va_ten ?? null,
    ten_tai_khoan_trach_nhiem: tr?.ten_tai_khoan ?? null,
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

function normalize(raw: CongViecDanhSach): CongViecDanhSach {
  return {
    ...raw,
    id: String(raw.id),
    id_trach_nhiem: String(raw.id_trach_nhiem),
    id_nguoi_tao: String(raw.id_nguoi_tao),
    ids_ho_tro: raw.ids_ho_tro.map(String),
    tien_do:
      typeof raw.tien_do === 'number' ? raw.tien_do : Math.round(Number(raw.tien_do)) || 0,
  };
}

function formToPayload(data: CongViecDanhSachFormValues, idNguoiTao?: string) {
  const idsHoTro = data.ids_ho_tro.map((id) => Number(id)).filter((n) => Number.isFinite(n));
  const thoiHan = data.thoi_han ?? null;
  const ngayHt = data.ngay_hoan_thanh ?? null;
  const base = {
    muc_do: data.muc_do,
    ten_cong_viec: data.ten_cong_viec.trim(),
    ghi_chu: data.ghi_chu?.trim() ?? null,
    link_tai_lieu: data.link_tai_lieu?.trim() ?? null,
    thoi_han: thoiHan,
    tien_do: data.tien_do,
    id_trach_nhiem: data.id_trach_nhiem,
    ids_ho_tro: idsHoTro,
    trang_thai: data.trang_thai,
    ket_qua: data.ket_qua?.trim() ?? null,
    link_kq: data.link_kq?.trim() ?? null,
    ngay_hoan_thanh: ngayHt,
  };
  if (idNguoiTao !== undefined) {
    return { ...base, id_nguoi_tao: idNguoiTao };
  }
  return base;
}

export async function getCongViecDanhSachList(): Promise<CongViecDanhSach[]> {
  const list = await repo.getAll({ orderBy: 'thoi_han', ascending: false });
  return list.map((row) => normalize(flattenCongViecDanhSachRow(row as unknown as Record<string, unknown>)));
}

export async function getCongViecDanhSachById(id: string): Promise<CongViecDanhSach | null> {
  const row = await repo.getById(id);
  if (!row) return null;
  return normalize(flattenCongViecDanhSachRow(row as unknown as Record<string, unknown>));
}

export async function createCongViecDanhSach(
  data: CongViecDanhSachFormValues,
  idNguoiTao: string,
): Promise<CongViecDanhSach> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('taskList.service.noEmployeeProfile'));

  const payload = formToPayload(data, trimmed);

  const inserted = await repo.insert(payload as unknown as Omit<CongViecDanhSach, 'id'>, {
    returningSelect: CONG_VIEC_DANH_SACH_RETURNING_FULL,
  });
  return normalize(flattenCongViecDanhSachRow(inserted as unknown as Record<string, unknown>));
}

export async function updateCongViecDanhSach(
  id: string,
  data: CongViecDanhSachFormValues,
): Promise<CongViecDanhSach> {
  const existing = await getCongViecDanhSachById(id);
  if (!existing) throw new Error(txt('taskList.service.notFound'));

  const payload = formToPayload(data);

  const updated = await repo.update(id, payload as unknown as Partial<CongViecDanhSach>, {
    returningSelect: CONG_VIEC_DANH_SACH_RETURNING_FULL,
  });
  return normalize(flattenCongViecDanhSachRow(updated as unknown as Record<string, unknown>));
}

export async function deleteCongViecDanhSachMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}
