import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import { flattenMttqCanBoRow } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/services/mttq-can-bo-service';
import type { MttqUyVienUyBan, MttqUyVienUyBanListRow } from '../core/types';
import { getUyVienDiemDanhSummariesForIds } from '@/features/mat-tran-to-quoc/ky-hop/services/mttq-diem-danh-service';
import type { MttqUyVienUyBanFormValues } from '../core/schema';
import {
  MTTQ_UY_VIEN_UY_BAN_SELECT_FULL,
  MTTQ_UY_VIEN_UY_BAN_SELECT_LIST,
  MTTQ_UY_VIEN_UY_BAN_SELECT_STATS,
} from '../core/supabase-select';
import { formatTenPhongBanHienThi } from '../utils/phong-ban-hien-thi';
import {
  mapUyVienConstraintError,
  normalizeMaUvForCompare,
  UyVienUyBanConflictError,
  type UyVienConflictKind,
} from '../utils/uy-vien-conflict';

export { UyVienUyBanConflictError } from '../utils/uy-vien-conflict';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'mttq_uy_vien_uy_ban',
  select: MTTQ_UY_VIEN_UY_BAN_SELECT_LIST,
});

const repoStats = createRepository<RepoRow>({
  tableName: 'mttq_uy_vien_uy_ban',
  select: MTTQ_UY_VIEN_UY_BAN_SELECT_STATS,
});

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

export function flattenRow(row: Record<string, unknown>): MttqUyVienUyBan {
  const nv = pickEmbedded<{
    ho_va_ten?: string;
    ten_tai_khoan?: string;
    id_phong_ban?: string | number | null;
  }>(row.nguoi_tao);
  const nk = pickEmbedded<{ ten_nhiem_ky?: string }>(row.nhiem_ky);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi);
  const cbRaw = pickEmbedded<Record<string, unknown>>(row.can_bo);
  const canBo = cbRaw ? flattenMttqCanBoRow(cbRaw) : null;

  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.nhiem_ky;
  delete rest.don_vi;
  delete rest.can_bo;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    can_bo_id: String(r.can_bo_id ?? ''),
    ma_uv: nullableStr(r.ma_uv),
    nhiem_ky_id: String(r.nhiem_ky_id ?? ''),
    ten_nhiem_ky: String(nk?.ten_nhiem_ky ?? ''),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
    ten_don_vi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ho_va_ten: canBo?.ho_ten ?? '',
    chuc_vu_don_vi: canBo?.ten_chuc_vu ?? null,
    ngay_sinh: canBo?.ngay_sinh ?? null,
    gioi_tinh: canBo?.gioi_tinh ?? null,
    trang_thai_tham_gia: nullableStr(r.trang_thai_tham_gia),
    ten_trang_thai_can_bo: canBo?.ten_trang_thai ?? null,
    ngay_nhap_trang_thai: canBo?.ngay_nhap_trang_thai ?? null,
    van_hoa: canBo?.van_hoa ?? null,
    trinh_do_cm: canBo?.ten_trinh_do ?? null,
    trinh_do_llct: canBo?.ten_ly_luan_chinh_tri ?? null,
    dan_toc: canBo?.ten_dan_toc ?? null,
    ton_giao: canBo?.ton_giao ?? null,
    dang_vien: canBo?.dang_vien ?? false,
    ngay_vao_dang: canBo?.ngay_vao_dang ?? null,
    que_quan: canBo?.que_quan ?? null,
    noi_o_hien_nay: canBo?.noi_o_hien_nay ?? null,
    so_dien_thoai: canBo?.dien_thoai ?? null,
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
    id_phong_ban_nguoi_tao: nv?.id_phong_ban == null ? null : String(nv.id_phong_ban),
    ten_to_chuc:
      canBo != null && Array.isArray(canBo.ten_to_chuc_arr) && canBo.ten_to_chuc_arr.length > 0
        ? canBo.ten_to_chuc_arr.join(', ')
        : null,
    ten_phong_ban_hien_thi: canBo ? formatTenPhongBanHienThi(canBo.ten_phong_ban, canBo.ten_bo_phan) : null,
    ten_don_vi_can_bo: canBo?.ten_don_vi ?? null,
    dia_chi_can_bo: canBo?.dia_chi ?? null,
  };
}

function mergeUyVienDiemDanhListSummary(
  row: MttqUyVienUyBan,
  s?: { so_ky_hop: number; co_mat: number; vang_mat: number; chua: number },
): MttqUyVienUyBanListRow {
  return {
    ...row,
    so_ky_hop: s?.so_ky_hop ?? 0,
    diem_danh_co_mat: s?.co_mat ?? 0,
    diem_danh_vang_mat: s?.vang_mat ?? 0,
    diem_danh_chua: s?.chua ?? 0,
  };
}

async function withUyVienDiemDanhSummaries(
  rows: MttqUyVienUyBan[],
  donViId?: string | null,
): Promise<MttqUyVienUyBanListRow[]> {
  if (rows.length === 0) return [];
  const map = await getUyVienDiemDanhSummariesForIds(rows.map((r) => r.id), donViId);
  return rows.map((r) => {
    const s = map.get(r.id);
    return mergeUyVienDiemDanhListSummary(
      r,
      s ? { so_ky_hop: s.so_ky_hop, co_mat: s.co_mat, vang_mat: s.vang_mat, chua: s.chua_diem_danh } : undefined,
    );
  });
}

function payloadFromForm(data: MttqUyVienUyBanFormValues) {
  return {
    can_bo_id: data.can_bo_id,
    ma_uv: data.ma_uv,
    nhiem_ky_id: data.nhiem_ky_id,
    don_vi_id: data.don_vi_id,
    trang_thai_tham_gia: data.trang_thai_tham_gia,
    ghi_chu: data.ghi_chu,
  };
}

export async function findUyVienConflict(params: {
  nhiemKyId: string;
  canBoId?: string | null;
  maUv?: string | null;
  excludeId?: string | null;
}): Promise<{ kind: UyVienConflictKind; existingId: string } | null> {
  const nhiemKyId = String(params.nhiemKyId ?? '').trim();
  if (!nhiemKyId) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const exclude = String(params.excludeId ?? '').trim();
  const canBoId = String(params.canBoId ?? '').trim();
  const maUvNorm = normalizeMaUvForCompare(params.maUv);

  if (canBoId) {
    let q = supabase
      .from('mttq_uy_vien_uy_ban')
      .select('id')
      .eq('nhiem_ky_id', nhiemKyId)
      .eq('can_bo_id', canBoId)
      .limit(1);
    if (exclude) q = q.neq('id', exclude);
    const { data, error } = await q.maybeSingle();
    if (error) handleSupabaseError(error);
    if (data?.id != null) {
      return { kind: 'can_bo', existingId: String(data.id) };
    }
  }

  if (maUvNorm) {
    // PHẢI quét đủ mọi mã uỷ viên của nhiệm kỳ: so khớp có chuẩn hoá nên không
    // đẩy được xuống `.eq()`, mà cắt ở 200 dòng thì nhiệm kỳ đông người sẽ LỌT
    // mã trùng — sai dữ liệu, không chỉ là thiếu dữ liệu.
    const rows = await fetchAllPages<{ id: number | string; ma_uv: string | null }>(
      async (from, to) => {
        let q = supabase
          .from('mttq_uy_vien_uy_ban')
          .select('id, ma_uv')
          .eq('nhiem_ky_id', nhiemKyId)
          .not('ma_uv', 'is', null)
          .order('id', { ascending: true })
          .range(from, to);
        if (exclude) q = q.neq('id', exclude);
        const { data, error } = await q;
        if (error) handleSupabaseError(error);
        return (data ?? []) as unknown as { id: number | string; ma_uv: string | null }[];
      },
      { label: 'mttq_uy_vien_uy_ban (kiem trung ma_uv)' },
    );
    const hit = rows.find((row) => normalizeMaUvForCompare(row.ma_uv) === maUvNorm);
    if (hit?.id != null) {
      return { kind: 'ma_uv', existingId: String(hit.id) };
    }
  }

  return null;
}

async function assertNoUyVienConflict(data: MttqUyVienUyBanFormValues, excludeId?: string): Promise<void> {
  const conflict = await findUyVienConflict({
    nhiemKyId: data.nhiem_ky_id,
    canBoId: data.can_bo_id,
    maUv: data.ma_uv,
    excludeId,
  });
  if (conflict) {
    throw new UyVienUyBanConflictError(conflict.kind, conflict.existingId);
  }
}

async function supabaseInsertUyVien(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).');
  const { data, error } = await supabase
    .from('mttq_uy_vien_uy_ban')
    .insert(payload)
    .select(MTTQ_UY_VIEN_UY_BAN_SELECT_FULL)
    .single();
  if (error) {
    const mapped = mapUyVienConstraintError(error);
    if (mapped) throw mapped;
    handleSupabaseError(error);
  }
  return data as unknown as Record<string, unknown>;
}

async function supabaseUpdateUyVien(id: string, payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).');
  const { data, error } = await supabase
    .from('mttq_uy_vien_uy_ban')
    .update(payload)
    .eq('id', id)
    .select(MTTQ_UY_VIEN_UY_BAN_SELECT_FULL)
    .single();
  if (error) {
    const mapped = mapUyVienConstraintError(error);
    if (mapped) throw mapped;
    handleSupabaseError(error);
  }
  return data as unknown as Record<string, unknown>;
}

export async function getMttqUyVienUyBanList(donViId?: string | null): Promise<MttqUyVienUyBanListRow[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  const flat = list.map((row) => flattenRow(row as unknown as Record<string, unknown>));
  return withUyVienDiemDanhSummaries(flat, donViId);
}

/** Payload gọn cho trang báo cáo (không gộp điểm danh). */
export async function getMttqUyVienUyBanStatsList(): Promise<MttqUyVienUyBan[]> {
  const list = await repoStats.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenRow(row as unknown as Record<string, unknown>));
}

/** Danh sách ủy viên thuộc một nhiệm kỳ (drawer chi tiết nhiệm kỳ). */
export async function getMttqUyVienUyBanListForNhiemKyId(nhiemKyId: string): Promise<MttqUyVienUyBanListRow[]> {
  const id = nhiemKyId.trim();
  if (!id) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  // Đọc ĐỦ số uỷ viên của nhiệm kỳ — uỷ ban cấp tỉnh có thể vượt 500 người.
  const data = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data: rows, error } = await supabase
        .from('mttq_uy_vien_uy_ban')
        .select(MTTQ_UY_VIEN_UY_BAN_SELECT_LIST)
        .eq('nhiem_ky_id', id)
        .order('tg_cap_nhat', { ascending: false })
        .order('id', { ascending: false })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (rows ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'mttq_uy_vien_uy_ban' },
  );
  const flat = data.map((row) => flattenRow(row));
  return withUyVienDiemDanhSummaries(flat);
}

export async function getMttqUyVienUyBanById(id: string): Promise<MttqUyVienUyBan | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mttq_uy_vien_uy_ban')
    .select(MTTQ_UY_VIEN_UY_BAN_SELECT_FULL)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenRow(data as unknown as Record<string, unknown>);
}

export async function createMttqUyVienUyBan(
  data: MttqUyVienUyBanFormValues,
  idNguoiTao: string,
): Promise<MttqUyVienUyBan> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('matTranUyVienUyBan.service.noEmployeeProfile'));

  await assertNoUyVienConflict(data);

  const inserted = await supabaseInsertUyVien({
    ...payloadFromForm(data),
    id_nguoi_tao: trimmed,
  });
  return flattenRow(inserted);
}

export async function updateMttqUyVienUyBan(id: string, data: MttqUyVienUyBanFormValues): Promise<MttqUyVienUyBan> {
  await assertNoUyVienConflict(data, id);

  const updated = await supabaseUpdateUyVien(id, {
    ...payloadFromForm(data),
    tg_cap_nhat: new Date().toISOString(),
  });
  return flattenRow(updated);
}

export async function deleteMttqUyVienUyBanMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

/**
 * Ghi cho luồng nhập file (`uy-vien-import.ts`). Trùng khoá do lõi nhập file
 * soi trước bằng danh sách nạp một lần — ở đây không tra lại từng dòng, chỉ
 * dịch lỗi 23505 (hai người nhập cùng lúc) sang câu nghiệp vụ.
 */
export async function insertMttqUyVienUyBanForImport(
  payload: Record<string, unknown>,
  idNguoiTao: string,
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('matTranUyVienUyBan.service.noEmployeeProfile'));
  const { error } = await supabase
    .from('mttq_uy_vien_uy_ban')
    .insert({ ...payload, id_nguoi_tao: idNguoiTao } as never);
  if (error) {
    const mapped = mapUyVienConstraintError(error);
    if (mapped) throw mapped;
    handleSupabaseError(error);
  }
}

/** Ghi đè MỘT PHẦN — `payload` chỉ gồm các cột có trong file. */
export async function updateMttqUyVienUyBanPartial(id: string, payload: Record<string, unknown>): Promise<void> {
  if (Object.keys(payload).length === 0) return;
  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('matTranUyVienUyBan.service.noEmployeeProfile'));
  const { data, error } = await supabase
    .from('mttq_uy_vien_uy_ban')
    .update({ ...payload, tg_cap_nhat: new Date().toISOString() } as never)
    .eq('id', id)
    .select('id')
    .maybeSingle();
  if (error) {
    const mapped = mapUyVienConstraintError(error);
    if (mapped) throw mapped;
    handleSupabaseError(error);
  }
  if (!data) throw new Error(txt('matTranUyVienUyBan.import.errKhongConBanGhi'));
}
