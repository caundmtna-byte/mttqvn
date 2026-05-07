import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import type { MttqUyVienUyBan, MttqUyVienUyBanListRow } from '../core/types';
import {
  mttqUyVienUyBanSchema,
  type MttqUyVienUyBanFormInput,
  type MttqUyVienUyBanFormValues,
} from '../core/schema';
import {
  MTTQ_UY_VIEN_UY_BAN_SELECT_FULL,
  MTTQ_UY_VIEN_UY_BAN_SELECT_LIST,
} from '../core/supabase-select';
import { MTTQ_UY_VIEN_UY_BAN_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'mttq_uy_vien_uy_ban',
  select: MTTQ_UY_VIEN_UY_BAN_SELECT_LIST,
  delay: 400,
  mockData: [],
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

function boolVal(v: unknown): boolean {
  if (v === true || v === 'true' || v === 1 || v === '1') return true;
  return false;
}

export function flattenRow(row: Record<string, unknown>): MttqUyVienUyBan {
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const nk = pickEmbedded<{ ten_nhiem_ky?: string }>(row.nhiem_ky);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi);
  const rest = { ...row };
  delete rest.nguoi_tao;
  delete rest.nhiem_ky;
  delete rest.don_vi;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id),
    ma_uv: nullableStr(r.ma_uv),
    nhiem_ky_id: String(r.nhiem_ky_id ?? ''),
    ten_nhiem_ky: String(nk?.ten_nhiem_ky ?? ''),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
    ten_don_vi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ho_va_ten: String(r.ho_va_ten ?? ''),
    chuc_vu_don_vi: nullableStr(r.chuc_vu_don_vi),
    ngay_sinh: nullableStr(r.ngay_sinh),
    gioi_tinh: nullableStr(r.gioi_tinh),
    trang_thai_tham_gia: nullableStr(r.trang_thai_tham_gia),
    ngay_nhap_trang_thai: nullableStr(r.ngay_nhap_trang_thai),
    van_hoa: nullableStr(r.van_hoa),
    trinh_do_cm: nullableStr(r.trinh_do_cm),
    trinh_do_llct: nullableStr(r.trinh_do_llct),
    dan_toc: nullableStr(r.dan_toc),
    ton_giao: nullableStr(r.ton_giao),
    dang_vien: boolVal(r.dang_vien),
    ngay_vao_dang: nullableStr(r.ngay_vao_dang),
    que_quan: nullableStr(r.que_quan),
    noi_o_hien_nay: nullableStr(r.noi_o_hien_nay),
    so_dien_thoai: nullableStr(r.so_dien_thoai),
    ghi_chu: nullableStr(r.ghi_chu),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

let mockRows = structuredClone(MTTQ_UY_VIEN_UY_BAN_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function payloadFromForm(data: MttqUyVienUyBanFormValues) {
  return {
    ma_uv: data.ma_uv,
    nhiem_ky_id: data.nhiem_ky_id,
    don_vi_id: data.don_vi_id,
    ho_va_ten: data.ho_va_ten,
    chuc_vu_don_vi: data.chuc_vu_don_vi,
    ngay_sinh: data.ngay_sinh,
    gioi_tinh: data.gioi_tinh,
    trang_thai_tham_gia: data.trang_thai_tham_gia,
    ngay_nhap_trang_thai: data.ngay_nhap_trang_thai,
    van_hoa: data.van_hoa,
    trinh_do_cm: data.trinh_do_cm,
    trinh_do_llct: data.trinh_do_llct,
    dan_toc: data.dan_toc,
    ton_giao: data.ton_giao,
    dang_vien: data.dang_vien,
    ngay_vao_dang: data.ngay_vao_dang,
    que_quan: data.que_quan,
    noi_o_hien_nay: data.noi_o_hien_nay,
    so_dien_thoai: data.so_dien_thoai,
    ghi_chu: data.ghi_chu,
  };
}

export async function getMttqUyVienUyBanList(): Promise<MttqUyVienUyBanListRow[]> {
  if (!isSupabase()) {
    return mockRows.map((r) => ({ ...r }));
  }
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenRow(row as unknown as Record<string, unknown>));
}

/** Danh sách ủy viên thuộc một nhiệm kỳ (drawer chi tiết nhiệm kỳ). */
export async function getMttqUyVienUyBanListForNhiemKyId(nhiemKyId: string): Promise<MttqUyVienUyBanListRow[]> {
  const id = nhiemKyId.trim();
  if (!id) return [];
  if (!isSupabase()) {
    return mockRows.filter((r) => r.nhiem_ky_id === id).map((r) => ({ ...r }));
  }
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('mttq_uy_vien_uy_ban')
    .select(MTTQ_UY_VIEN_UY_BAN_SELECT_FULL)
    .eq('nhiem_ky_id', id)
    .order('tg_cap_nhat', { ascending: false })
    .limit(500);
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenRow(row as unknown as Record<string, unknown>));
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
    const row: MttqUyVienUyBan = {
      id,
      ...payloadFromForm(data),
      ten_nhiem_ky: 'Mock nhiệm kỳ',
      ten_don_vi: null,
      id_nguoi_tao: trimmed,
      tg_tao: now,
      tg_cap_nhat: now,
      ho_va_ten_nguoi_tao: 'Mock',
      ten_tai_khoan_nguoi_tao: 'mock',
    };
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
  const existing = await getMttqUyVienUyBanById(id);
  if (!existing) throw new Error(txt('matTranUyVienUyBan.service.notFound'));

  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('matTranUyVienUyBan.service.notFound'));
    const now = new Date().toISOString();
    mockRows[idx] = {
      ...mockRows[idx],
      ...payloadFromForm(data),
      tg_cap_nhat: now,
    };
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

function parseImportBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null || String(v).trim() === '') return undefined;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  if (['1', 'true', 'x', 'có', 'co', 'yes'].includes(s)) return true;
  if (['0', 'false', 'không', 'khong', 'no'].includes(s)) return false;
  return undefined;
}

function importRowToFormInput(
  row: Record<string, unknown>,
  resolved: { nhiem_ky_id: string; don_vi_id: string },
): MttqUyVienUyBanFormInput {
  const dv = parseImportBool(row.dang_vien);
  return {
    ma_uv: row.ma_uv != null && String(row.ma_uv).trim() !== '' ? String(row.ma_uv) : undefined,
    nhiem_ky_id: resolved.nhiem_ky_id,
    don_vi_id: resolved.don_vi_id,
    ho_va_ten: String(row.ho_va_ten ?? '').trim(),
    chuc_vu_don_vi:
      row.chuc_vu_don_vi != null && String(row.chuc_vu_don_vi).trim() !== ''
        ? String(row.chuc_vu_don_vi)
        : undefined,
    ngay_sinh: row.ngay_sinh != null && String(row.ngay_sinh).trim() !== '' ? String(row.ngay_sinh) : '',
    gioi_tinh:
      row.gioi_tinh != null && String(row.gioi_tinh).trim() !== '' ? String(row.gioi_tinh) : undefined,
    trang_thai_tham_gia:
      row.trang_thai_tham_gia != null && String(row.trang_thai_tham_gia).trim() !== ''
        ? String(row.trang_thai_tham_gia)
        : undefined,
    ngay_nhap_trang_thai:
      row.ngay_nhap_trang_thai != null && String(row.ngay_nhap_trang_thai).trim() !== ''
        ? String(row.ngay_nhap_trang_thai)
        : '',
    van_hoa: row.van_hoa != null && String(row.van_hoa).trim() !== '' ? String(row.van_hoa) : undefined,
    trinh_do_cm:
      row.trinh_do_cm != null && String(row.trinh_do_cm).trim() !== '' ? String(row.trinh_do_cm) : undefined,
    trinh_do_llct:
      row.trinh_do_llct != null && String(row.trinh_do_llct).trim() !== ''
        ? String(row.trinh_do_llct)
        : undefined,
    dan_toc: row.dan_toc != null && String(row.dan_toc).trim() !== '' ? String(row.dan_toc) : undefined,
    ton_giao: row.ton_giao != null && String(row.ton_giao).trim() !== '' ? String(row.ton_giao) : undefined,
    dang_vien: dv,
    ngay_vao_dang:
      row.ngay_vao_dang != null && String(row.ngay_vao_dang).trim() !== '' ? String(row.ngay_vao_dang) : '',
    que_quan: row.que_quan != null && String(row.que_quan).trim() !== '' ? String(row.que_quan) : undefined,
    noi_o_hien_nay:
      row.noi_o_hien_nay != null && String(row.noi_o_hien_nay).trim() !== ''
        ? String(row.noi_o_hien_nay)
        : undefined,
    so_dien_thoai:
      row.so_dien_thoai != null && String(row.so_dien_thoai).trim() !== '' ? String(row.so_dien_thoai) : undefined,
    ghi_chu: row.ghi_chu != null && String(row.ghi_chu).trim() !== '' ? String(row.ghi_chu) : undefined,
  };
}

/** Import chỉ thêm mới. Cột: ten_nhiem_ky hoặc nhiem_ky_id; ten_don_vi hoặc don_vi_id; ho_va_ten (bắt buộc); các cột khác tùy chọn. */
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

    const input = importRowToFormInput(raw, { nhiem_ky_id, don_vi_id });

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
