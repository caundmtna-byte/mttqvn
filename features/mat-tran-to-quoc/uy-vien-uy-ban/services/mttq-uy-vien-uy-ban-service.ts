import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { flattenMttqCanBoRow } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/services/mttq-can-bo-service';
import type { MttqUyVienUyBan, MttqUyVienUyBanListRow } from '../core/types';
import { getUyVienDiemDanhSummariesForIds } from '@/features/mat-tran-to-quoc/ky-hop/services/mttq-diem-danh-service';
import {
  mttqUyVienUyBanSchema,
  type MttqUyVienUyBanFormInput,
  type MttqUyVienUyBanFormValues,
} from '../core/schema';
import { normalizeUyVienTrangThamGia } from '../core/constants';
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
    let q = supabase
      .from('mttq_uy_vien_uy_ban')
      .select('id, ma_uv')
      .eq('nhiem_ky_id', nhiemKyId)
      .not('ma_uv', 'is', null)
      .limit(200);
    if (exclude) q = q.neq('id', exclude);
    const { data, error } = await q;
    if (error) handleSupabaseError(error);
    const hit = (data ?? []).find((row) => normalizeMaUvForCompare(row.ma_uv as string | null) === maUvNorm);
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
  const { data, error } = await supabase
    .from('mttq_uy_vien_uy_ban')
    .select(MTTQ_UY_VIEN_UY_BAN_SELECT_LIST)
    .eq('nhiem_ky_id', id)
    .order('tg_cap_nhat', { ascending: false })
    .limit(500);
  if (error) handleSupabaseError(error);
  const flat = (data ?? []).map((row) => flattenRow(row as unknown as Record<string, unknown>));
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

async function resolveNhiemKyIdByTen(ten: string): Promise<string | null> {
  const t = ten.trim();
  if (!t) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('mttq_nhiem_ky')
    .select('id')
    .eq('ten_nhiem_ky', t)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (data?.id != null) return String(data.id);
  const { data: data2, error: err2 } = await supabase
    .from('mttq_nhiem_ky')
    .select('id')
    .ilike('ten_nhiem_ky', `%${t}%`)
    .limit(1)
    .maybeSingle();
  if (err2) handleSupabaseError(err2);
  return data2?.id != null ? String(data2.id) : null;
}

async function resolveDonViIdByTen(tenDonVi: string): Promise<string | null> {
  const t = tenDonVi.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  if (lower === 'tỉnh' || lower === 'tinh' || lower === 'mttq tỉnh' || lower === 'mttq tinh') return null;
  const all = await getXaPhuongAll();
  const exact = all.find((x) => x.ten.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find((x) => x.ten.toLowerCase().includes(lower) || lower.includes(x.ten.toLowerCase()));
  return partial?.id ?? null;
}

async function resolveCanBoIdFromImportRow(raw: Record<string, unknown>): Promise<string | null> {
  const idRaw = raw.can_bo_id != null ? String(raw.can_bo_id).trim() : '';
  if (/^\d+$/.test(idRaw)) return idRaw;

  const hoTen = String(raw.ho_va_ten ?? raw.ho_ten ?? '').trim();
  if (!hoTen) return null;

  const nsRaw = raw.ngay_sinh != null && String(raw.ngay_sinh).trim() !== '' ? String(raw.ngay_sinh).trim() : '';
  const ns = nsRaw.length >= 10 ? nsRaw.slice(0, 10) : nsRaw || null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: eqData, error: eqErr } = await supabase
    .from('mttq_can_bo')
    .select('id,ho_ten,ngay_sinh')
    .eq('ho_ten', hoTen)
    .limit(10);
  if (eqErr) handleSupabaseError(eqErr);
  let rows = eqData ?? [];
  if (rows.length === 0) {
    const esc = hoTen.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const { data: likeData, error: likeErr } = await supabase
      .from('mttq_can_bo')
      .select('id,ho_ten,ngay_sinh')
      .ilike('ho_ten', `%${esc}%`)
      .limit(40);
    if (likeErr) handleSupabaseError(likeErr);
    rows = likeData ?? [];
  }
  const lower = hoTen.toLowerCase();
  const exactDob = rows.filter(
    (r) =>
      String(r.ho_ten ?? '')
        .trim()
        .toLowerCase() === lower &&
      (ns == null ||
        r.ngay_sinh == null ||
        String(r.ngay_sinh).slice(0, 10) === ns),
  );
  if (exactDob.length === 1) return String(exactDob[0].id);
  const exactName = rows.filter((r) => String(r.ho_ten ?? '').trim().toLowerCase() === lower);
  if (exactName.length === 1) return String(exactName[0].id);
  return null;
}

function importRowToFormInput(
  row: Record<string, unknown>,
  resolved: { nhiem_ky_id: string; don_vi_id: string; can_bo_id: string },
): MttqUyVienUyBanFormInput {
  return {
    can_bo_id: resolved.can_bo_id,
    ma_uv: row.ma_uv != null && String(row.ma_uv).trim() !== '' ? String(row.ma_uv) : undefined,
    nhiem_ky_id: resolved.nhiem_ky_id,
    don_vi_id: resolved.don_vi_id,
    trang_thai_tham_gia: normalizeUyVienTrangThamGia(
      row.trang_thai_tham_gia != null ? String(row.trang_thai_tham_gia) : undefined,
    ),
    ghi_chu: row.ghi_chu != null && String(row.ghi_chu).trim() !== '' ? String(row.ghi_chu) : undefined,
  };
}

/** Import chỉ thêm mới. Cột: ten_nhiem_ky hoặc nhiem_ky_id; ten_don_vi hoặc don_vi_id; can_bo_id hoặc ho_va_ten (+ ngày sinh). */
export async function importMttqUyVienUyBan(
  rows: Record<string, unknown>[],
  idNguoiTao: string,
): Promise<{ created: number; errors: string[] }> {
  const trimmedNv = idNguoiTao.trim();
  if (!trimmedNv) throw new Error(txt('matTranUyVienUyBan.service.noEmployeeProfile'));

  const errors: string[] = [];
  let created = 0;

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const nkRaw = String(raw.nhiem_ky_id ?? raw.ten_nhiem_ky ?? '').trim();
    let nhiem_ky_id = nkRaw;
    if (!/^\d+$/.test(nhiem_ky_id)) {
      const resolvedNk = await resolveNhiemKyIdByTen(nkRaw);
      if (!resolvedNk) {
        errors.push(
          txt('matTranUyVienUyBan.import.rowError', { row: i + 2, message: txt('matTranUyVienUyBan.import.badNhiemKy') }),
        );
        continue;
      }
      nhiem_ky_id = resolvedNk;
    }

    const dvRaw = raw.don_vi_id != null && String(raw.don_vi_id).trim() !== '' ? String(raw.don_vi_id).trim() : '';
    let don_vi_id = '';
    if (dvRaw && /^\d+$/.test(dvRaw)) {
      don_vi_id = dvRaw;
    } else {
      const tenDv = String(raw.ten_don_vi ?? '').trim();
      don_vi_id = (await resolveDonViIdByTen(tenDv)) ?? '';
    }

    const can_bo_id = await resolveCanBoIdFromImportRow(raw);
    if (!can_bo_id) {
      errors.push(
        txt('matTranUyVienUyBan.import.rowError', { row: i + 2, message: txt('matTranUyVienUyBan.import.badCanBo') }),
      );
      continue;
    }

    const input = importRowToFormInput(raw, { nhiem_ky_id, don_vi_id, can_bo_id });

    const parsed = mttqUyVienUyBanSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      errors.push(txt('matTranUyVienUyBan.import.rowError', { row: i + 2, message: msg }));
      continue;
    }
    const data = parsed.data as MttqUyVienUyBanFormValues;
    try {
      await createMttqUyVienUyBan(data, trimmedNv);
      created++;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(txt('matTranUyVienUyBan.import.rowError', { row: i + 2, message: msg }));
    }
  }

  return { created, errors };
}
