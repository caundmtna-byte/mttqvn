import { createRepository } from '@/lib/data/create-repository';
import {
  buildRpcSortParam,
  fetchAllServerPages,
  readRpcTotalCount,
  type ServerSortState,
} from '@/lib/data/server-paging';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { BaiVietDanhSach } from '../core/types';
import type { BaiVietDanhSachFormValues } from '../core/schema';
import {
  BAI_VIET_DANH_SACH_RETURNING,
  BAI_VIET_DANH_SACH_SELECT_LIST,
} from '../core/supabase-select';
import {
  BaiVietLinkConflictError,
  escapeIlikePattern,
  mapBaiVietLinkConstraintError,
  normalizeBaiVietLinkForCompare,
} from '../utils/bai-viet-link-conflict';
import {
  BaiVietTenBaiConflictError,
  mapBaiVietTenBaiConstraintError,
  normalizeBaiVietTenBaiForCompare,
} from '../utils/bai-viet-ten-bai-conflict';

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
    don_vi?: unknown;
  }>(row.nguoi_tao);
  const donVi = pickEmbedded<{ ten?: string }>(nv?.don_vi);
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
    ten_don_vi_nguoi_tao: donVi?.ten?.trim() || null,
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

export async function findBaiVietLinkConflict(params: {
  link: string;
  excludeId?: string | null;
}): Promise<{ existingId: string } | null> {
  const trimmed = String(params.link ?? '').trim();
  const norm = normalizeBaiVietLinkForCompare(trimmed);
  if (!norm) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const exclude = String(params.excludeId ?? '').trim();
  let q = supabase
    .from('bai_viet_danh_sach')
    .select('id, link')
    .ilike('link', escapeIlikePattern(trimmed))
    .limit(5);
  if (exclude) q = q.neq('id', exclude);

  const { data, error } = await q;
  if (error) handleSupabaseError(error);

  const hit = (data ?? []).find(
    (row) => normalizeBaiVietLinkForCompare(row.link as string) === norm,
  );
  if (hit?.id != null) {
    return { existingId: String(hit.id) };
  }
  return null;
}

/**
 * Tìm bài khác đang mang cùng tên (bỏ qua hoa/thường và khoảng trắng thừa).
 * Chỉ là lớp báo lỗi sớm cho người nhập: lớp chặn thật là unique index
 * `uq_bai_viet_danh_sach_ten_bai_lower` dưới DB.
 */
export async function findBaiVietTenBaiConflict(params: {
  tenBai: string;
  excludeId?: string | null;
}): Promise<{ existingId: string } | null> {
  const trimmed = String(params.tenBai ?? '').trim();
  const norm = normalizeBaiVietTenBaiForCompare(trimmed);
  if (!norm) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const exclude = String(params.excludeId ?? '').trim();
  let q = supabase
    .from('bai_viet_danh_sach')
    .select('id, ten_bai')
    .ilike('ten_bai', escapeIlikePattern(trimmed))
    .limit(5);
  if (exclude) q = q.neq('id', exclude);

  const { data, error } = await q;
  if (error) handleSupabaseError(error);

  const hit = (data ?? []).find(
    (row) => normalizeBaiVietTenBaiForCompare(row.ten_bai as string) === norm,
  );
  if (hit?.id != null) {
    return { existingId: String(hit.id) };
  }
  return null;
}

async function assertNoBaiVietTenBaiConflict(tenBai: string, excludeId?: string): Promise<void> {
  const conflict = await findBaiVietTenBaiConflict({ tenBai, excludeId });
  if (conflict) {
    throw new BaiVietTenBaiConflictError(conflict.existingId);
  }
}

async function assertNoBaiVietLinkConflict(link: string, excludeId?: string): Promise<void> {
  const conflict = await findBaiVietLinkConflict({ link, excludeId });
  if (conflict) {
    throw new BaiVietLinkConflictError(conflict.existingId);
  }
}

async function supabaseInsertBaiViet(payload: Record<string, unknown>): Promise<{ id: string }> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).',
    );
  }
  const { data, error } = await supabase
    .from('bai_viet_danh_sach')
    .insert(payload)
    .select(BAI_VIET_DANH_SACH_RETURNING)
    .single();
  if (error) {
    const mapped = mapBaiVietLinkConstraintError(error) ?? mapBaiVietTenBaiConstraintError(error);
    if (mapped) throw mapped;
    handleSupabaseError(error);
  }
  return data as { id: string };
}

async function supabaseUpdateBaiViet(id: string, payload: Record<string, unknown>): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error(
      'Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).',
    );
  }
  const { error } = await supabase
    .from('bai_viet_danh_sach')
    .update(payload)
    .eq('id', id)
    .select(BAI_VIET_DANH_SACH_RETURNING)
    .single();
  if (error) {
    const mapped = mapBaiVietLinkConstraintError(error) ?? mapBaiVietTenBaiConstraintError(error);
    if (mapped) throw mapped;
    handleSupabaseError(error);
  }
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

  await assertNoBaiVietTenBaiConflict(payload.ten_bai);
  await assertNoBaiVietLinkConflict(payload.link);

  const inserted = await supabaseInsertBaiViet(payload);
  const newId = String(inserted.id);
  const full = await getBaiVietDanhSachById(newId);
  if (!full) throw new Error(txt('articleList.service.notFound'));
  return full;
}

export async function updateBaiVietDanhSach(
  id: string,
  data: BaiVietDanhSachFormValues,
): Promise<BaiVietDanhSach> {
  // Bỏ tiền-fetch `getById`: nếu id không tồn tại, `supabaseUpdateBaiViet` throw lỗi PostgREST
  // (PGRST116) và toast hiển thị; tiết kiệm 1 round-trip + payload đầy đủ.
  const payload = {
    ten_bai: data.ten_bai.trim(),
    id_the_loai: data.id_the_loai,
    don_gia: data.don_gia,
    ngay_dang: data.ngay_dang,
    id_nguon_dang: data.id_nguon_dang,
    id_trang_dang: data.id_trang_dang,
    link: data.link.trim(),
  };

  await assertNoBaiVietTenBaiConflict(payload.ten_bai, id);
  await assertNoBaiVietLinkConflict(payload.link, id);

  await supabaseUpdateBaiViet(id, payload);
  const full = await getBaiVietDanhSachById(id);
  if (!full) throw new Error(txt('articleList.service.notFound'));
  return full;
}

/* ------------------------------------------------------------------ *
 * Hai hàm ghi dành riêng cho NHẬP FILE
 *
 * Khác `createBaiVietDanhSach` / `updateBaiVietDanhSach` ở hai điểm, đều vì số
 * lượng dòng:
 *  - BỎ tiền kiểm trùng tên/link (2 request mỗi dòng). Luồng nhập đã đối chiếu
 *    offline trên danh sách tải một lần; lớp chặn thật vẫn là unique index dưới
 *    DB, và lỗi 23505 đã được dịch sẵn sang tiếng Việt.
 *  - BỎ lần đọc lại bản ghi đầy đủ sau khi ghi (thêm 1 request mỗi dòng) vì
 *    luồng nhập không dùng tới bản ghi trả về.
 * Với 500 dòng, hai điểm này tiết kiệm khoảng 1.500 request.
 * ------------------------------------------------------------------ */

export async function createBaiVietDanhSachForImport(
  data: BaiVietDanhSachFormValues,
  idNguoiTao: string,
): Promise<void> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('articleList.service.noEmployeeProfile'));
  await supabaseInsertBaiViet({
    ten_bai: data.ten_bai.trim(),
    id_the_loai: data.id_the_loai,
    don_gia: data.don_gia,
    ngay_dang: data.ngay_dang,
    id_nguon_dang: data.id_nguon_dang,
    id_trang_dang: data.id_trang_dang,
    link: data.link.trim(),
    id_nguoi_tao: trimmed,
  });
}

export async function updateBaiVietDanhSachForImport(
  id: string,
  data: BaiVietDanhSachFormValues,
): Promise<void> {
  await supabaseUpdateBaiViet(id, {
    ten_bai: data.ten_bai.trim(),
    id_the_loai: data.id_the_loai,
    don_gia: data.don_gia,
    ngay_dang: data.ngay_dang,
    id_nguon_dang: data.id_nguon_dang,
    id_trang_dang: data.id_trang_dang,
    link: data.link.trim(),
  });
}

export async function deleteBaiVietDanhSachMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}

export type BaiVietRpcScope = 'all' | 'mine' | 'all_don_vi';

/** Cột được RPC get_bai_viet_page sắp xếp. Phải khớp khối ORDER BY trong migration. */
export const BAI_VIET_SERVER_SORT_COLUMNS = [
  'ten_bai',
  'ten_the_loai',
  'don_gia',
  'ngay_dang',
  'ten_nguon_dang',
  'ten_trang_dang',
  'link',
  'ho_va_ten_nguoi_tao',
  'tg_cap_nhat',
] as const;

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
  sort?: ServerSortState | null;
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
  /** Tổng số bản ghi khớp bộ lọc — RPC trả về qua COUNT(*) OVER (). */
  totalRecords: number;
};

function toRpcBigint(id: string | null | undefined): number | null {
  if (id == null || String(id).trim() === '') return null;
  const n = Number(String(id).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * RPC trả dòng phẳng (đã LEFT JOIN sẵn tên thể loại / nguồn / trang / người tạo).
 * Dựng lại đúng hình dạng embed của PostgREST để dùng chung flatten + normalize,
 * nhờ đó bỏ được request thứ hai cho mỗi lần đổi trang.
 */
function rpcRowToBaiViet(raw: Record<string, unknown>): BaiVietDanhSach {
  const {
    ten_the_loai,
    ten_nguon_dang,
    ten_trang_dang,
    ho_va_ten_nguoi_tao,
    ten_tai_khoan_nguoi_tao,
    id_phong_ban_nguoi_tao,
    don_vi_id_nguoi_tao,
    total_count: _totalCount,
    ...base
  } = raw;
  return normalize(
    flattenBaiVietDanhSachRow({
      ...base,
      the_loai: { ten_the_loai },
      nguon_dang: { ten: ten_nguon_dang },
      trang_dang: { ten: ten_trang_dang },
      nguoi_tao: {
        ho_va_ten: ho_va_ten_nguoi_tao,
        ten_tai_khoan: ten_tai_khoan_nguoi_tao,
        id_phong_ban: id_phong_ban_nguoi_tao,
        don_vi_id: don_vi_id_nguoi_tao,
      },
    }),
  );
}

export async function getBaiVietDanhSachPage(q: BaiVietPageQuery): Promise<BaiVietPageResult> {
  const pageSize = Math.max(1, Math.min(Math.floor(q.pageSize), 500));
  const page = Math.max(1, Math.floor(q.page));
  const offset = (page - 1) * pageSize;
  const fetchLimit = pageSize;
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
    p_sort: buildRpcSortParam(q.sort, BAI_VIET_SERVER_SORT_COLUMNS),
  } as never);
  if (error) handleSupabaseError(error);

  const rawRows = (data ?? []) as unknown as Record<string, unknown>[];
  const rows = rawRows.map(rpcRowToBaiViet);
  const totalFromPage = readRpcTotalCount(rawRows);
  // Trang rỗng ngoài trang 1 (bộ lọc vừa thu hẹp kết quả, hoặc số trang cũ còn
  // trong store) không mang được tổng ⇒ hỏi lại trang đầu để không hiện "0".
  const totalRecords =
    totalFromPage ??
    (offset > 0 ? await countBaiVietPage({ ...q, page: 1, pageSize: 1 }) : 0);
  return { rows, hasNextPage: offset + rows.length < totalRecords, totalRecords };
}

/** Kéo TOÀN BỘ bài viết khớp bộ lọc để xuất file — xem fetchAllServerPages. */
export function getBaiVietDanhSachAllForExport(
  q: Omit<BaiVietPageQuery, 'page' | 'pageSize'>,
): Promise<BaiVietDanhSach[]> {
  return fetchAllServerPages(q, getBaiVietDanhSachPage);
}

/** Chỉ lấy tổng: một dòng duy nhất, dùng cho trường hợp trang rỗng ở trên. */
async function countBaiVietPage(q: BaiVietPageQuery): Promise<number> {
  const { totalRecords } = await getBaiVietDanhSachPage(q);
  return totalRecords;
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
