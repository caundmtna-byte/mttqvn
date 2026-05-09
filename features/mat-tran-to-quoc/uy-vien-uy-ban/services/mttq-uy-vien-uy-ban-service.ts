import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { flattenMttqCanBoRow } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/services/mttq-can-bo-service';
import { MTTQ_CAN_BO_MOCK_DATA } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/mock-data';
import type { MttqUyVienUyBan, MttqUyVienUyBanListRow } from '../core/types';
import { getUyVienDiemDanhSummariesForIds } from '@/features/mat-tran-to-quoc/ky-hop/services/mttq-diem-danh-service';
import {
  mttqUyVienUyBanSchema,
  type MttqUyVienUyBanFormInput,
  type MttqUyVienUyBanFormValues,
} from '../core/schema';
import {
  MTTQ_UY_VIEN_UY_BAN_SELECT_FULL,
  MTTQ_UY_VIEN_UY_BAN_SELECT_LIST,
  MTTQ_UY_VIEN_UY_BAN_SELECT_STATS,
} from '../core/supabase-select';
import { MTTQ_UY_VIEN_UY_BAN_MOCK } from '../mock-data';
import { formatTenPhongBanHienThi } from '../utils/phong-ban-hien-thi';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'mttq_uy_vien_uy_ban',
  select: MTTQ_UY_VIEN_UY_BAN_SELECT_LIST,
  delay: 400,
  mockData: [],
});

const repoStats = isSupabase()
  ? createRepository<RepoRow>({
      tableName: 'mttq_uy_vien_uy_ban',
      select: MTTQ_UY_VIEN_UY_BAN_SELECT_STATS,
      delay: 400,
      mockData: [],
    })
  : repo;

function pickEmbedded<T extends Record<string, unknown>>(v: unknown): T | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return (v[0] as T | undefined) ?? undefined;
  return v as T;
}

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function mergeDisplayFromMockCanBo(canBoId: string): Pick<
  MttqUyVienUyBan,
  | 'ho_va_ten'
  | 'chuc_vu_don_vi'
  | 'ngay_sinh'
  | 'gioi_tinh'
  | 'dan_toc'
  | 'ton_giao'
  | 'dang_vien'
  | 'so_dien_thoai'
  | 'trinh_do_cm'
  | 'trinh_do_llct'
  | 'ten_to_chuc'
  | 'ten_phong_ban_hien_thi'
  | 'ten_don_vi_can_bo'
  | 'dia_chi_can_bo'
  | 'ten_trang_thai_can_bo'
  | 'ngay_nhap_trang_thai'
  | 'van_hoa'
  | 'ngay_vao_dang'
  | 'que_quan'
  | 'noi_o_hien_nay'
> {
  const c = MTTQ_CAN_BO_MOCK_DATA.find((x) => String(x.id) === String(canBoId));
  if (!c) {
    return {
      ho_va_ten: '',
      chuc_vu_don_vi: null,
      ngay_sinh: null,
      gioi_tinh: null,
      dan_toc: null,
      ton_giao: null,
      dang_vien: false,
      so_dien_thoai: null,
      trinh_do_cm: null,
      trinh_do_llct: null,
      ten_to_chuc: null,
      ten_phong_ban_hien_thi: null,
      ten_don_vi_can_bo: null,
      dia_chi_can_bo: null,
      ten_trang_thai_can_bo: null,
      ngay_nhap_trang_thai: null,
      van_hoa: null,
      ngay_vao_dang: null,
      que_quan: null,
      noi_o_hien_nay: null,
    };
  }
  return {
    ho_va_ten: c.ho_ten,
    chuc_vu_don_vi: c.ten_chuc_vu,
    ngay_sinh: c.ngay_sinh,
    gioi_tinh: c.gioi_tinh,
    dan_toc: c.ten_dan_toc,
    ton_giao: c.ton_giao,
    dang_vien: c.dang_vien,
    so_dien_thoai: c.dien_thoai,
    trinh_do_cm: c.ten_trinh_do,
    trinh_do_llct: c.ten_ly_luan_chinh_tri,
    ten_to_chuc: c.ten_to_chuc,
    ten_phong_ban_hien_thi: formatTenPhongBanHienThi(c.ten_phong_ban, c.ten_bo_phan),
    ten_don_vi_can_bo: c.ten_don_vi,
    dia_chi_can_bo: c.dia_chi ?? null,
    ten_trang_thai_can_bo: c.ten_trang_thai ?? null,
    ngay_nhap_trang_thai: c.ngay_nhap_trang_thai,
    van_hoa: c.van_hoa,
    ngay_vao_dang: c.ngay_vao_dang,
    que_quan: c.que_quan,
    noi_o_hien_nay: c.noi_o_hien_nay,
  };
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
    ten_to_chuc: canBo?.ten_to_chuc ?? null,
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

async function withUyVienDiemDanhSummaries(rows: MttqUyVienUyBan[]): Promise<MttqUyVienUyBanListRow[]> {
  if (rows.length === 0) return [];
  const map = await getUyVienDiemDanhSummariesForIds(rows.map((r) => r.id));
  return rows.map((r) => {
    const s = map.get(r.id);
    return mergeUyVienDiemDanhListSummary(
      r,
      s ? { so_ky_hop: s.so_ky_hop, co_mat: s.co_mat, vang_mat: s.vang_mat, chua: s.chua_diem_danh } : undefined,
    );
  });
}

let mockRows = structuredClone(MTTQ_UY_VIEN_UY_BAN_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
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

function mockRowFromForm(data: MttqUyVienUyBanFormValues, id: string, idNguoiTao: string, now: string): MttqUyVienUyBan {
  const disp = mergeDisplayFromMockCanBo(data.can_bo_id);
  return {
    id,
    ...payloadFromForm(data),
    ...disp,
    ten_nhiem_ky: 'Mock nhiệm kỳ',
    ten_don_vi: null,
    id_nguoi_tao: idNguoiTao,
    tg_tao: now,
    tg_cap_nhat: now,
    ho_va_ten_nguoi_tao: 'Mock',
    ten_tai_khoan_nguoi_tao: 'mock',
    id_phong_ban_nguoi_tao: null,
  };
}

export async function getMttqUyVienUyBanList(): Promise<MttqUyVienUyBanListRow[]> {
  if (!isSupabase()) {
    const base = mockRows.map((r) => ({ ...r }));
    return withUyVienDiemDanhSummaries(base);
  }
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  const flat = list.map((row) => flattenRow(row as unknown as Record<string, unknown>));
  return withUyVienDiemDanhSummaries(flat);
}

/** Payload gọn cho trang báo cáo (không gộp điểm danh). */
export async function getMttqUyVienUyBanStatsList(): Promise<MttqUyVienUyBan[]> {
  if (!isSupabase()) {
    return mockRows.map((r) => ({ ...r }));
  }
  const list = await repoStats.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenRow(row as unknown as Record<string, unknown>));
}

/** Danh sách ủy viên thuộc một nhiệm kỳ (drawer chi tiết nhiệm kỳ). */
export async function getMttqUyVienUyBanListForNhiemKyId(nhiemKyId: string): Promise<MttqUyVienUyBanListRow[]> {
  const id = nhiemKyId.trim();
  if (!id) return [];
  if (!isSupabase()) {
    const base = mockRows.filter((r) => r.nhiem_ky_id === id).map((r) => ({ ...r }));
    return withUyVienDiemDanhSummaries(base);
  }
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
  if (!isSupabase()) {
    const r = mockRows.find((x) => x.id === id);
    return r ? { ...r } : null;
  }
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

  if (!isSupabase()) {
    const id = mockNextId();
    const now = new Date().toISOString();
    const row = mockRowFromForm(data, id, trimmed, now);
    mockRows.push(row);
    return { ...row };
  }

  const inserted = await repo.insert(
    {
      ...payloadFromForm(data),
      id_nguoi_tao: trimmed,
    } as unknown as Omit<RepoRow, 'id'>,
    { returningSelect: MTTQ_UY_VIEN_UY_BAN_SELECT_FULL },
  );
  return flattenRow(inserted as unknown as Record<string, unknown>);
}

export async function updateMttqUyVienUyBan(id: string, data: MttqUyVienUyBanFormValues): Promise<MttqUyVienUyBan> {
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranUyVienUyBan.service.notFound'));
    const now = new Date().toISOString();
    const merged = {
      ...mockRows[idx],
      ...mockRowFromForm(data, id, mockRows[idx].id_nguoi_tao, now),
      id,
      id_nguoi_tao: mockRows[idx].id_nguoi_tao,
      tg_tao: mockRows[idx].tg_tao,
    };
    mockRows[idx] = merged;
    return { ...mockRows[idx] };
  }

  const updated = await repo.update(
    id,
    {
      ...payloadFromForm(data),
      tg_cap_nhat: new Date().toISOString(),
    } as unknown as Partial<RepoRow>,
    { returningSelect: MTTQ_UY_VIEN_UY_BAN_SELECT_FULL },
  );
  return flattenRow(updated as unknown as Record<string, unknown>);
}

export async function deleteMttqUyVienUyBanMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    mockRows = mockRows.filter((r) => !ids.includes(r.id));
    return;
  }
  await repo.remove(ids);
}

async function resolveNhiemKyIdByTen(ten: string): Promise<string | null> {
  const t = ten.trim();
  if (!t) return null;
  if (!isSupabase()) return '1';
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

  if (!isSupabase()) {
    const exact = MTTQ_CAN_BO_MOCK_DATA.find(
      (c) =>
        c.ho_ten.trim().toLowerCase() === hoTen.toLowerCase() &&
        (ns == null || c.ngay_sinh == null || (c.ngay_sinh && c.ngay_sinh.slice(0, 10) === ns)),
    );
    if (exact) return String(exact.id);
    const byName = MTTQ_CAN_BO_MOCK_DATA.filter((c) => c.ho_ten.trim().toLowerCase() === hoTen.toLowerCase());
    if (byName.length === 1) return String(byName[0].id);
    return null;
  }

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
    trang_thai_tham_gia:
      row.trang_thai_tham_gia != null && String(row.trang_thai_tham_gia).trim() !== ''
        ? String(row.trang_thai_tham_gia)
        : undefined,
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
