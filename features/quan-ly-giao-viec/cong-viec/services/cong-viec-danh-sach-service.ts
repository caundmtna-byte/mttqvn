import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { CongViecDanhSach } from '../core/types';
import type { CongViecDanhSachFormValues } from '../core/schema';
import { CHIP_CHUONG_TRINH_NULL } from '../core/constants';
import {
  CONG_VIEC_BY_CHUONG_TRINH_SELECT,
  CONG_VIEC_DANH_SACH_RETURNING,
  CONG_VIEC_DANH_SACH_SELECT_FULL,
  CONG_VIEC_DANH_SACH_SELECT_LIST,
} from '../core/supabase-select';
const repo = createRepository<CongViecDanhSach>({
  tableName: 'cong_viec_danh_sach',
  select: CONG_VIEC_DANH_SACH_SELECT_LIST,
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
  const ct = pickEmbedded<{ ten_chuong_trinh?: string }>(row.chuong_trinh);
  const rest = { ...row };
  delete rest.trach_nhiem;
  delete rest.nguoi_tao;
  delete rest.chuong_trinh;
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
    id_chuong_trinh:
      r.id_chuong_trinh == null || r.id_chuong_trinh === '' ? null : String(r.id_chuong_trinh),
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
    ten_chuong_trinh: ct?.ten_chuong_trinh?.trim() ? String(ct.ten_chuong_trinh) : null,
  };
}

function normalize(raw: CongViecDanhSach): CongViecDanhSach {
  return {
    ...raw,
    id: String(raw.id),
    id_trach_nhiem: String(raw.id_trach_nhiem),
    id_chuong_trinh:
      raw.id_chuong_trinh == null || raw.id_chuong_trinh === '' ? null : String(raw.id_chuong_trinh),
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
    id_chuong_trinh:
      data.id_chuong_trinh != null && String(data.id_chuong_trinh).trim() !== ''
        ? Number(String(data.id_chuong_trinh).trim())
        : null,
  };
  if (idNguoiTao !== undefined) {
    return { ...base, id_nguoi_tao: idNguoiTao };
  }
  return base;
}

/** Giới hạn số dòng công việc embed trong drawer chi tiết chương trình. */
export const CONG_VIEC_BY_CHUONG_TRINH_PAGE_LIMIT = 200;

export async function getCongViecDanhSachList(): Promise<CongViecDanhSach[]> {
  const list = await repo.getAll({ orderBy: 'thoi_han', ascending: false });
  return list.map((row) => normalize(flattenCongViecDanhSachRow(row as unknown as Record<string, unknown>)));
}

/** Công việc gắn một chương trình năm (drawer chi tiết CTN). */
export async function getCongViecByChuongTrinhNamId(chuongTrinhId: string): Promise<CongViecDanhSach[]> {
  const id = String(chuongTrinhId ?? '').trim();
  if (!id) return [];

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('cong_viec_danh_sach')
    .select(CONG_VIEC_BY_CHUONG_TRINH_SELECT)
    .eq('id_chuong_trinh', id)
    .order('thoi_han', { ascending: false, nullsFirst: false })
    .limit(CONG_VIEC_BY_CHUONG_TRINH_PAGE_LIMIT);
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) =>
    normalize(flattenCongViecDanhSachRow(row as unknown as Record<string, unknown>)),
  );
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
    returningSelect: CONG_VIEC_DANH_SACH_RETURNING,
  });
  const id = String((inserted as { id: string }).id);
  const full = await getCongViecDanhSachById(id);
  if (!full) throw new Error(txt('congViecDanhSach.service.notFound'));
  return full;
}

export async function updateCongViecDanhSach(
  id: string,
  data: CongViecDanhSachFormValues,
): Promise<CongViecDanhSach> {
  // Bỏ tiền-fetch `getById`: nếu id không tồn tại, PostgREST trả lỗi và toast hiển thị.
  const payload = formToPayload(data);

  await repo.update(id, payload as unknown as Partial<CongViecDanhSach>, {
    returningSelect: CONG_VIEC_DANH_SACH_RETURNING,
  });
  const full = await getCongViecDanhSachById(id);
  if (!full) throw new Error(txt('congViecDanhSach.service.notFound'));
  return full;
}

export async function deleteCongViecDanhSachMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

export type CongViecListScopeRpc = 'mine_do' | 'mine_related' | 'mine_assign';

export type CongViecPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  listScope: CongViecListScopeRpc;
  viewerNhanVienId: string | null;
  trangThai: readonly string[];
  mucDo: readonly string[];
  idChuongTrinh: readonly string[];
};

export type CongViecPageResult = {
  rows: CongViecDanhSach[];
  hasNextPage: boolean;
  totalRecords: number | null;
};

function toRpcBigint(id: string | null | undefined): number | null {
  if (id == null || String(id).trim() === '') return null;
  const n = Number(String(id).trim());
  return Number.isFinite(n) ? n : null;
}

async function enrichCongViecRowsByIds(ids: string[]): Promise<Map<string, CongViecDanhSach>> {
  const map = new Map<string, CongViecDanhSach>();
  if (ids.length === 0) return map;
  const supabase = getSupabase();
  if (!supabase) return map;
  const { data, error } = await supabase
    .from('cong_viec_danh_sach')
    .select(CONG_VIEC_DANH_SACH_SELECT_FULL)
    .in('id', ids);
  if (error) handleSupabaseError(error);
  for (const raw of data ?? []) {
    const row = raw as unknown as Record<string, unknown>;
    const id = String(row.id);
    map.set(id, normalize(flattenCongViecDanhSachRow(row)));
  }
  return map;
}

export async function getCongViecDanhSachPage(q: CongViecPageQuery): Promise<CongViecPageResult> {
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const fetchLimit = pageSize + 1;
  const searchTrim = q.search?.trim() ?? '';
  const pSearch = searchTrim.length > 0 ? searchTrim : null;
  const viewer = toRpcBigint(q.viewerNhanVienId);
  const trangThai = q.trangThai.length ? [...q.trangThai] : null;
  const mucDo = q.mucDo.length ? [...q.mucDo] : null;
  const chuongTrinhIncludeNull = q.idChuongTrinh.includes(CHIP_CHUONG_TRINH_NULL);
  const chuongTrinhIds = q.idChuongTrinh
    .filter((id) => id !== CHIP_CHUONG_TRINH_NULL)
    .map((id) => Number(id))
    .filter((n) => Number.isFinite(n));
  const pChuongTrinh =
    chuongTrinhIds.length > 0 || chuongTrinhIncludeNull ? chuongTrinhIds : null;

  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };

  const { data, error } = await supabase.rpc('get_cong_viec_page', {
    p_search: pSearch,
    p_limit: fetchLimit,
    p_offset: offset,
    p_list_scope: q.listScope,
    p_viewer_nhan_vien_id: viewer,
    p_trang_thai: trangThai,
    p_muc_do: mucDo,
    p_id_chuong_trinh: pChuongTrinh,
    p_chuong_trinh_include_null: chuongTrinhIncludeNull,
  } as never);
  if (error) handleSupabaseError(error);

  const rawRows = (data ?? []) as unknown as Record<string, unknown>[];
  const hasNextPage = rawRows.length > pageSize;
  const pageRaw = hasNextPage ? rawRows.slice(0, pageSize) : rawRows;
  const ids = pageRaw.map((r) => String(r.id));
  const byId = await enrichCongViecRowsByIds(ids);
  const rows = ids.map((id) => byId.get(id)).filter((x): x is CongViecDanhSach => Boolean(x));
  const totalRecords = hasNextPage ? null : offset + rows.length;
  return { rows, hasNextPage, totalRecords };
}
