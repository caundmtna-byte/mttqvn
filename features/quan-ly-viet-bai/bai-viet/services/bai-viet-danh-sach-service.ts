import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { BaiVietDanhSach } from '../core/types';
import type { BaiVietDanhSachFormValues } from '../core/schema';
import {
  BAI_VIET_DANH_SACH_RETURNING,
  BAI_VIET_DANH_SACH_SELECT_FULL,
  BAI_VIET_DANH_SACH_SELECT_LIST,
} from '../core/supabase-select';

const repo = createRepository<BaiVietDanhSach>({
  tableName: 'bai_viet_danh_sach',
  select: BAI_VIET_DANH_SACH_SELECT_LIST,
});

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

export function flattenBaiVietDanhSachRow(row: Record<string, unknown>): BaiVietDanhSach {
  const theLoai = pickEmbedded<{ ten_the_loai?: string }>(row.the_loai);
  const nguon = pickEmbedded<{ ten?: string }>(row.nguon_dang);
  const trang = pickEmbedded<{ ten?: string }>(row.trang_dang);
  const nv = pickEmbedded<{
    ho_va_ten?: string;
    ten_tai_khoan?: string;
    id_phong_ban?: string | number | null;
    don_vi_id?: string | number | null;
  }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.the_loai;
  delete rest.nguon_dang;
  delete rest.trang_dang;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;
  const ngay = r.ngay_dang;
  const ngayStr =
    typeof ngay === 'string' ? ngay.slice(0, 10) : ngay != null ? String(ngay).slice(0, 10) : '';
  const dg = r.don_gia;
  const num = typeof dg === 'number' ? dg : Number(dg);
  return {
    ...r,
    id: String(r.id),
    ten_bai: String(r.ten_bai ?? ''),
    id_the_loai: String(r.id_the_loai ?? ''),
    don_gia: Number.isFinite(num) ? num : 0,
    ngay_dang: ngayStr,
    id_nguon_dang: String(r.id_nguon_dang ?? ''),
    id_trang_dang: String(r.id_trang_dang ?? ''),
    link: String(r.link ?? ''),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ten_the_loai: theLoai?.ten_the_loai ?? null,
    ten_nguon_dang: nguon?.ten ?? null,
    ten_trang_dang: trang?.ten ?? null,
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
    id_phong_ban_nguoi_tao:
      nv?.id_phong_ban != null && String(nv.id_phong_ban).trim() !== ''
        ? String(nv.id_phong_ban).trim()
        : null,
    id_don_vi_nguoi_tao:
      nv?.don_vi_id != null && String(nv.don_vi_id).trim() !== ''
        ? String(nv.don_vi_id).trim()
        : null,
  } as BaiVietDanhSach;
}

function normalize(raw: BaiVietDanhSach): BaiVietDanhSach {
  return {
    ...raw,
    id: String(raw.id),
    id_the_loai: String(raw.id_the_loai),
    id_nguon_dang: String(raw.id_nguon_dang),
    id_trang_dang: String(raw.id_trang_dang),
    id_nguoi_tao: String(raw.id_nguoi_tao),
    don_gia: typeof raw.don_gia === 'number' ? raw.don_gia : Number(raw.don_gia) || 0,
    ngay_dang: String(raw.ngay_dang).slice(0, 10),
  };
}

export async function getBaiVietDanhSachList(): Promise<BaiVietDanhSach[]> {
  const list = await repo.getAll({ orderBy: 'ngay_dang', ascending: false });
  return list.map((row) => normalize(flattenBaiVietDanhSachRow(row as unknown as Record<string, unknown>)));
}

export async function getBaiVietDanhSachById(id: string): Promise<BaiVietDanhSach | null> {
  const row = await repo.getById(id);
  if (!row) return null;
  return normalize(flattenBaiVietDanhSachRow(row as unknown as Record<string, unknown>));
}

export async function createBaiVietDanhSach(
  data: BaiVietDanhSachFormValues,
  idNguoiTao: string,
): Promise<BaiVietDanhSach> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('articleList.service.noEmployeeProfile'));

  const payload = {
    ten_bai: data.ten_bai.trim(),
    id_the_loai: data.id_the_loai,
    don_gia: data.don_gia,
    ngay_dang: data.ngay_dang,
    id_nguon_dang: data.id_nguon_dang,
    id_trang_dang: data.id_trang_dang,
    link: data.link.trim(),
    id_nguoi_tao: trimmed,
  };

  const inserted = await repo.insert(payload as Omit<BaiVietDanhSach, 'id'>, {
    returningSelect: BAI_VIET_DANH_SACH_RETURNING,
  });
  const newId = String((inserted as { id: string }).id);
  const full = await getBaiVietDanhSachById(newId);
  if (!full) throw new Error(txt('articleList.service.notFound'));
  return full;
}

export async function updateBaiVietDanhSach(
  id: string,
  data: BaiVietDanhSachFormValues,
): Promise<BaiVietDanhSach> {
  // Bỏ tiền-fetch `getById`: nếu id không tồn tại, `repo.update` throw lỗi PostgREST
  // (PGRST116) và toast hiển thị; tiết kiệm 1 round-trip + payload đầy đủ.
  await repo.update(
    id,
    {
      ten_bai: data.ten_bai.trim(),
      id_the_loai: data.id_the_loai,
      don_gia: data.don_gia,
      ngay_dang: data.ngay_dang,
      id_nguon_dang: data.id_nguon_dang,
      id_trang_dang: data.id_trang_dang,
      link: data.link.trim(),
    } as Partial<BaiVietDanhSach>,
    { returningSelect: BAI_VIET_DANH_SACH_RETURNING },
  );
  const full = await getBaiVietDanhSachById(id);
  if (!full) throw new Error(txt('articleList.service.notFound'));
  return full;
}

export async function deleteBaiVietDanhSachMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

export type BaiVietRpcScope = 'all' | 'mine' | 'all_don_vi';

export type BaiVietPageQuery = {
  page: number;
  pageSize: number;
  search: string;
  scope: BaiVietRpcScope;
  viewerNhanVienId: string | null;
  viewerDonViId: string | null;
  theLoaiIds: readonly string[];
  nguonDangIds: readonly string[];
  trangDangIds: readonly string[];
  nguoiTaoIds: readonly string[];
};

export type BaiVietNguoiTaoFilterOption = {
  id: string;
  label: string;
  count: number;
};

export type BaiVietNguoiTaoFilterOptionsQuery = {
  scope: Exclude<BaiVietRpcScope, 'mine'>;
  viewerDonViId: string | null;
};

export type BaiVietPageResult = {
  rows: BaiVietDanhSach[];
  hasNextPage: boolean;
  /** null khi còn trang sau (chưa biết tổng chính xác). */
  totalRecords: number | null;
};

function toRpcBigint(id: string | null | undefined): number | null {
  if (id == null || String(id).trim() === '') return null;
  const n = Number(String(id).trim());
  return Number.isFinite(n) ? n : null;
}

async function enrichBaiVietRowsByIds(ids: string[]): Promise<Map<string, BaiVietDanhSach>> {
  const map = new Map<string, BaiVietDanhSach>();
  if (ids.length === 0) return map;
  const supabase = getSupabase();
  if (!supabase) return map;
  const { data, error } = await supabase
    .from('bai_viet_danh_sach')
    .select(BAI_VIET_DANH_SACH_SELECT_FULL)
    .in('id', ids);
  if (error) handleSupabaseError(error);
  for (const raw of data ?? []) {
    const row = raw as unknown as Record<string, unknown>;
    const id = String(row.id);
    map.set(id, normalize(flattenBaiVietDanhSachRow(row)));
  }
  return map;
}

export async function getBaiVietDanhSachPage(q: BaiVietPageQuery): Promise<BaiVietPageResult> {
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const fetchLimit = pageSize + 1;
  const searchTrim = q.search?.trim() ?? '';
  const pSearch = searchTrim.length > 0 ? searchTrim : null;
  const theLoaiNums = q.theLoaiIds
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n));
  const nguonNums = q.nguonDangIds
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n));
  const trangNums = q.trangDangIds
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n));
  const nguoiTaoNums = q.nguoiTaoIds
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n));

  const supabase = getSupabase();
  if (!supabase) return { rows: [], hasNextPage: false, totalRecords: 0 };

  const { data, error } = await supabase.rpc('get_bai_viet_page', {
    p_search: pSearch,
    p_limit: fetchLimit,
    p_offset: offset,
    p_scope: q.scope,
    p_viewer_nhan_vien_id: toRpcBigint(q.viewerNhanVienId),
    p_viewer_don_vi_id: toRpcBigint(q.viewerDonViId),
    p_the_loai_ids: theLoaiNums.length ? theLoaiNums : null,
    p_nguon_dang_ids: nguonNums.length ? nguonNums : null,
    p_trang_dang_ids: trangNums.length ? trangNums : null,
    p_id_nguoi_tao: nguoiTaoNums.length ? nguoiTaoNums : null,
  } as never);
  if (error) handleSupabaseError(error);

  const rawRows = (data ?? []) as unknown as Record<string, unknown>[];
  const hasNextPage = rawRows.length > pageSize;
  const pageRaw = hasNextPage ? rawRows.slice(0, pageSize) : rawRows;
  const ids = pageRaw.map((r) => String(r.id));
  const byId = await enrichBaiVietRowsByIds(ids);
  const rows = ids.map((id) => byId.get(id)).filter((x): x is BaiVietDanhSach => Boolean(x));
  const totalRecords = hasNextPage ? null : offset + rows.length;
  return { rows, hasNextPage, totalRecords };
}

export async function getBaiVietNguoiTaoFilterOptions(
  q: BaiVietNguoiTaoFilterOptionsQuery,
): Promise<BaiVietNguoiTaoFilterOption[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_bai_viet_nguoi_tao_filter_options', {
    p_scope: q.scope,
    p_viewer_don_vi_id: toRpcBigint(q.viewerDonViId),
  } as never);
  if (error) handleSupabaseError(error);

  return ((data ?? []) as { id: number | string; label: string; cnt: number }[]).map((row) => ({
    id: String(row.id),
    label: row.label?.trim() || String(row.id),
    count: Number(row.cnt) || 0,
  }));
}
