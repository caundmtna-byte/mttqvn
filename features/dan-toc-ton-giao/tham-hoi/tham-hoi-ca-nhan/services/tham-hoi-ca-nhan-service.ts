import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { getDepartments } from '@/features/he-thong/phong-ban/services/phong-ban-service';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { getDipTenById, getDipThamHoiList } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/services/dip-tham-hoi-service';
import { getThongTinCaNhanTieuBieuList } from '@/features/dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu/services/thong-tin-ca-nhan-tieu-bieu-service';
import type { ThamHoiCaNhanFormValues } from '../core/schema';
import { thamHoiCaNhanSchema } from '../core/schema';
import type { ThamHoiCaNhan } from '../core/types';
import type { TrangThaiThamHoi } from '../core/constants';
import { DON_VI_THAM_HOI_CQMTTQ_LABEL, TRANG_THAI_DEFAULT, TRANG_THAI_VALUES } from '../core/constants';
import {
  DTTG_THAM_HOI_CA_NHAN_RETURNING,
  DTTG_THAM_HOI_CA_NHAN_SELECT,
} from '../core/supabase-select';
import { dbDateToMonthYear, monthYearToDbDate, parseThoiGianDuKienImport } from '../utils/thoi-gian-du-kien';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'dttg_tham_hoi_ca_nhan',
  select: DTTG_THAM_HOI_CA_NHAN_SELECT,
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

function nullableDateIso(v: unknown): string | null {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

export function flattenThamHoiCaNhanRow(row: Record<string, unknown>): ThamHoiCaNhan {
  const cn = pickEmbedded<{ ho_va_ten?: string; doi_tuong?: string; chuc_vu_vi_tri?: string }>(row.ca_nhan);
  const pb = pickEmbedded<{ ten_phong_ban?: string }>(row.phong_ban);
  const dv = pickEmbedded<{ ten?: string }>(row.don_vi_tham_hoi);
  const dip = pickEmbedded<{ ten_dip?: string }>(row.dip);
  const xp = pickEmbedded<{ ten?: string }>(row.xa_phuong);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.ca_nhan;
  delete rest.phong_ban;
  delete rest.don_vi_tham_hoi;
  delete rest.dip;
  delete rest.xa_phuong;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  const tenDip =
    dip?.ten_dip != null && String(dip.ten_dip).trim() !== ''
      ? String(dip.ten_dip)
      : String(r.dip_tham_hoi ?? '');

  return {
    id: String(r.id ?? ''),
    ca_nhan_id: String(r.ca_nhan_id ?? ''),
    ho_va_ten: cn?.ho_va_ten != null && String(cn.ho_va_ten).trim() !== '' ? String(cn.ho_va_ten) : null,
    doi_tuong:
      (r.doi_tuong != null && String(r.doi_tuong).trim() !== '' ? String(r.doi_tuong) : null) ??
      (cn?.doi_tuong != null && String(cn.doi_tuong).trim() !== '' ? String(cn.doi_tuong) : null),
    chuc_vu_vi_tri:
      (r.chuc_vu_vi_tri != null && String(r.chuc_vu_vi_tri).trim() !== ''
        ? String(r.chuc_vu_vi_tri)
        : null) ??
      (cn?.chuc_vu_vi_tri != null && String(cn.chuc_vu_vi_tri).trim() !== '' ? String(cn.chuc_vu_vi_tri) : null),
    phong_ban_tham_muu_id:
      r.phong_ban_tham_muu_id == null || r.phong_ban_tham_muu_id === ''
        ? null
        : String(r.phong_ban_tham_muu_id),
    ten_phong_ban:
      pb?.ten_phong_ban != null && String(pb.ten_phong_ban).trim() !== '' ? String(pb.ten_phong_ban) : null,
    dip_tham_hoi_id: String(r.dip_tham_hoi_id ?? ''),
    dip_tham_hoi: tenDip,
    ten_dip_tham_hoi: dip?.ten_dip != null && String(dip.ten_dip).trim() !== '' ? String(dip.ten_dip) : null,
    thoi_gian_du_kien: nullableDateIso(r.thoi_gian_du_kien),
    thoi_gian_thuc_te: nullableDateIso(r.thoi_gian_thuc_te),
    don_vi_tham_hoi_id:
      r.don_vi_tham_hoi_id == null || r.don_vi_tham_hoi_id === '' ? null : String(r.don_vi_tham_hoi_id),
    ten_don_vi_tham_hoi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    qua_tang: nullableStr(r.qua_tang),
    xa_phuong_id: r.xa_phuong_id == null || r.xa_phuong_id === '' ? null : String(r.xa_phuong_id),
    ten_xa_phuong: xp?.ten != null && String(xp.ten).trim() !== '' ? String(xp.ten) : null,
    trang_thai: String(r.trang_thai ?? TRANG_THAI_DEFAULT) as TrangThaiThamHoi,
    ket_qua_ghi_chu: nullableStr(r.ket_qua_ghi_chu),
    link_ket_qua: nullableStr(r.link_ket_qua),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

async function denormFromCaNhan(caNhanId: string): Promise<{ doi_tuong: string | null; chuc_vu_vi_tri: string | null }> {
  const list = await getThongTinCaNhanTieuBieuList();
  const cn = list.find((c) => c.id === caNhanId);
  return {
    doi_tuong: cn?.doi_tuong ?? null,
    chuc_vu_vi_tri: cn?.chuc_vu_vi_tri ?? null,
  };
}

async function resolveXaPhuongIdByTen(ten: string): Promise<string | null> {
  const t = ten.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const all = await getXaPhuongAll();
  const exact = all.find((x) => x.ten.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find(
    (x) => x.ten.toLowerCase().includes(lower) || lower.includes(x.ten.toLowerCase()),
  );
  return partial?.id ?? null;
}

async function buildPayload(
  data: ThamHoiCaNhanFormValues,
  denorm?: { doi_tuong: string | null; chuc_vu_vi_tri: string | null },
): Promise<Record<string, unknown>> {
  const dipTen = await getDipTenById(data.dip_tham_hoi_id);
  if (!dipTen?.trim()) {
    throw new Error(txt('danTocThamHoiCaNhan.validation.dipThamHoiInvalid'));
  }
  const thoiGianDb =
    data.thoi_gian_du_kien != null && data.thoi_gian_du_kien !== ''
      ? monthYearToDbDate(data.thoi_gian_du_kien)
      : null;

  return {
    ca_nhan_id: Number(data.ca_nhan_id),
    phong_ban_tham_muu_id:
      data.phong_ban_tham_muu_id != null && data.phong_ban_tham_muu_id !== ''
        ? Number(data.phong_ban_tham_muu_id)
        : null,
    doi_tuong: denorm?.doi_tuong ?? null,
    chuc_vu_vi_tri: denorm?.chuc_vu_vi_tri ?? null,
    dip_tham_hoi_id: Number(data.dip_tham_hoi_id),
    dip_tham_hoi: dipTen,
    thoi_gian_du_kien: thoiGianDb,
    thoi_gian_thuc_te: data.thoi_gian_thuc_te ?? null,
    don_vi_tham_hoi_id:
      data.don_vi_tham_hoi_id != null && data.don_vi_tham_hoi_id !== ''
        ? Number(data.don_vi_tham_hoi_id)
        : null,
    qua_tang: data.qua_tang ?? null,
    xa_phuong_id:
      data.xa_phuong_id != null && data.xa_phuong_id !== '' ? Number(data.xa_phuong_id) : null,
    trang_thai: data.trang_thai,
    ket_qua_ghi_chu: data.ket_qua_ghi_chu ?? null,
    link_ket_qua: data.link_ket_qua ?? null,
  };
}

export async function getThamHoiCaNhanList(): Promise<ThamHoiCaNhan[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThamHoiCaNhanRow(row as unknown as Record<string, unknown>));
}

export async function getThamHoiCaNhanById(id: string): Promise<ThamHoiCaNhan | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dttg_tham_hoi_ca_nhan')
    .select(DTTG_THAM_HOI_CA_NHAN_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThamHoiCaNhanRow(data as unknown as Record<string, unknown>);
}

export async function getThamHoiCaNhanByCaNhanId(caNhanId: string): Promise<ThamHoiCaNhan[]> {
  const trimmed = caNhanId.trim();
  if (!trimmed) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dttg_tham_hoi_ca_nhan')
    .select(DTTG_THAM_HOI_CA_NHAN_SELECT)
    .eq('ca_nhan_id', trimmed)
    .order('tg_cap_nhat', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenThamHoiCaNhanRow(row as unknown as Record<string, unknown>));
}

export async function getThamHoiCaNhanByDipId(dipId: string): Promise<ThamHoiCaNhan[]> {
  const trimmed = dipId.trim();
  if (!trimmed) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dttg_tham_hoi_ca_nhan')
    .select(DTTG_THAM_HOI_CA_NHAN_SELECT)
    .eq('dip_tham_hoi_id', trimmed)
    .order('tg_cap_nhat', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenThamHoiCaNhanRow(row as unknown as Record<string, unknown>));
}

export async function createThamHoiCaNhan(
  data: ThamHoiCaNhanFormValues,
  idNguoiTao: string,
): Promise<ThamHoiCaNhan> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocThamHoiCaNhan.service.noEmployeeProfile'));
  const denorm = await denormFromCaNhan(data.ca_nhan_id);

  const inserted = await repo.insert(
    { ...(await buildPayload(data, denorm)), id_nguoi_tao: Number(trimmed) },
    { returningSelect: DTTG_THAM_HOI_CA_NHAN_RETURNING },
  );
  return flattenThamHoiCaNhanRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThamHoiCaNhan(id: string, data: ThamHoiCaNhanFormValues): Promise<ThamHoiCaNhan> {
  const denorm = await denormFromCaNhan(data.ca_nhan_id);

  const updated = await repo.update(id, (await buildPayload(data, denorm)) as unknown as Partial<RepoRow>, {
    returningSelect: DTTG_THAM_HOI_CA_NHAN_RETURNING,
  });
  return flattenThamHoiCaNhanRow(updated as unknown as Record<string, unknown>);
}

export async function updateThamHoiCaNhanTrangThai(
  id: string,
  trangThai: TrangThaiThamHoi,
  thoiGianThucTe?: string | null,
): Promise<ThamHoiCaNhan> {
  const patch: Record<string, unknown> = { trang_thai: trangThai };
  if (trangThai === 'Đã hoàn thành') {
    patch.thoi_gian_thuc_te = thoiGianThucTe?.trim() || new Date().toISOString().slice(0, 10);
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('danTocThamHoiCaNhan.service.notFound'));
  const { data, error } = await supabase
    .from('dttg_tham_hoi_ca_nhan')
    .update(patch)
    .eq('id', id)
    .select(DTTG_THAM_HOI_CA_NHAN_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flattenThamHoiCaNhanRow(data as unknown as Record<string, unknown>);
}

export async function deleteThamHoiCaNhanMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const n = raw[IMPORT_ROW_NUM_KEY];
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  const parsed = Number(n);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveTrangThaiFromImport(raw: unknown): TrangThaiThamHoi {
  const s = String(raw ?? '').trim();
  if (!s) return TRANG_THAI_DEFAULT;
  if (s.toLowerCase() === 'true' || s === '1') return 'Đã hoàn thành';
  if (s.toLowerCase() === 'false' || s === '0') return 'Chưa thực hiện';
  const exact = TRANG_THAI_VALUES.find((v) => v === s);
  if (exact) return exact;
  const lower = s.toLowerCase();
  const match = TRANG_THAI_VALUES.find((v) => v.toLowerCase() === lower);
  return match ?? TRANG_THAI_DEFAULT;
}

async function resolveCaNhanIdByHoTen(hoVaTen: string): Promise<string | null> {
  const t = hoVaTen.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const all = await getThongTinCaNhanTieuBieuList();
  const exact = all.find((x) => x.ho_va_ten.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find(
    (x) =>
      x.ho_va_ten.toLowerCase().includes(lower) || lower.includes(x.ho_va_ten.toLowerCase()),
  );
  return partial?.id ?? null;
}

async function resolvePhongBanIdByTen(tenPhongBan: string): Promise<string | null> {
  const t = tenPhongBan.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const all = await getDepartments();
  const exact = all.find((x) => x.ten_phong_ban.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find(
    (x) =>
      x.ten_phong_ban.toLowerCase().includes(lower) || lower.includes(x.ten_phong_ban.toLowerCase()),
  );
  return partial?.id ?? null;
}

async function resolveDipIdByTen(tenDip: string): Promise<string | null> {
  const t = tenDip.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const all = await getDipThamHoiList();
  const exact = all.find((x) => x.ten_dip.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find(
    (x) => x.ten_dip.toLowerCase().includes(lower) || lower.includes(x.ten_dip.toLowerCase()),
  );
  return partial?.id ?? null;
}

function isCqmttqTinhLabel(raw: string): boolean {
  const lower = raw.trim().toLowerCase();
  return lower === '' || lower === 'cqmttq tỉnh' || lower === 'cqmttq tinh';
}

export async function importThamHoiCaNhan(
  rows: Record<string, unknown>[],
  idNguoiTao: string,
): Promise<{ created: number; errors: string[]; errorRows: ImportErrorRow[] }> {
  const trimmedNv = idNguoiTao.trim();
  if (!trimmedNv) throw new Error(txt('danTocThamHoiCaNhan.service.noEmployeeProfile'));

  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];
  const validPayloads: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = importRowNum(raw, i + 2);
    const rowData = { ...raw };
    delete rowData[IMPORT_ROW_NUM_KEY];

    const cnRaw =
      raw.ca_nhan_id != null && String(raw.ca_nhan_id).trim() !== '' ? String(raw.ca_nhan_id).trim() : '';
    let ca_nhan_id: string | null = null;
    if (cnRaw && /^\d+$/.test(cnRaw)) {
      ca_nhan_id = cnRaw;
    } else {
      const hoVaTen = String(raw.ho_va_ten ?? '').trim();
      if (hoVaTen) {
        ca_nhan_id = (await resolveCaNhanIdByHoTen(hoVaTen)) ?? null;
        if (!ca_nhan_id) {
          const msg = txt('danTocThamHoiCaNhan.validation.caNhanInvalid');
          const errMsg = txt('danTocThamHoiCaNhan.import.rowError', { row: rowNum, message: msg });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: rowData, message: errMsg });
          continue;
        }
      }
    }

    const pbRaw =
      raw.phong_ban_tham_muu_id != null && String(raw.phong_ban_tham_muu_id).trim() !== ''
        ? String(raw.phong_ban_tham_muu_id).trim()
        : '';
    let phong_ban_tham_muu_id: string | undefined;
    if (pbRaw && /^\d+$/.test(pbRaw)) {
      phong_ban_tham_muu_id = pbRaw;
    } else {
      const tenPb = String(raw.ten_phong_ban ?? '').trim();
      if (tenPb) {
        const resolved = (await resolvePhongBanIdByTen(tenPb)) ?? null;
        if (!resolved) {
          const msg = txt('danTocThamHoiCaNhan.validation.phongBanInvalid');
          const errMsg = txt('danTocThamHoiCaNhan.import.rowError', { row: rowNum, message: msg });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: rowData, message: errMsg });
          continue;
        }
        phong_ban_tham_muu_id = resolved;
      }
    }

    let don_vi_tham_hoi_id: string | undefined;
    const dvRaw =
      raw.don_vi_tham_hoi_id != null && String(raw.don_vi_tham_hoi_id).trim() !== ''
        ? String(raw.don_vi_tham_hoi_id).trim()
        : '';
    if (dvRaw && /^\d+$/.test(dvRaw)) {
      don_vi_tham_hoi_id = dvRaw;
    } else {
      const tenDv =
        String(raw.ten_don_vi_tham_hoi ?? raw.don_vi_tham_hoi ?? '').trim();
      if (tenDv && !isCqmttqTinhLabel(tenDv)) {
        const resolved = (await resolveXaPhuongIdByTen(tenDv)) ?? null;
        if (!resolved) {
          const msg = txt('danTocThamHoiCaNhan.validation.donViThamHoiInvalid');
          const errMsg = txt('danTocThamHoiCaNhan.import.rowError', { row: rowNum, message: msg });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: rowData, message: errMsg });
          continue;
        }
        don_vi_tham_hoi_id = resolved;
      }
    }

    let xa_phuong_id: string | undefined;
    const xpRaw =
      raw.xa_phuong_id != null && String(raw.xa_phuong_id).trim() !== ''
        ? String(raw.xa_phuong_id).trim()
        : '';
    if (xpRaw && /^\d+$/.test(xpRaw)) {
      xa_phuong_id = xpRaw;
    } else {
      const tenXp = String(raw.ten_xa_phuong ?? raw.don_vi_xa_phuong ?? '').trim();
      if (tenXp) {
        const resolved = (await resolveXaPhuongIdByTen(tenXp)) ?? null;
        if (!resolved) {
          const msg = txt('danTocThamHoiCaNhan.validation.xaPhuongInvalid');
          const errMsg = txt('danTocThamHoiCaNhan.import.rowError', { row: rowNum, message: msg });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: rowData, message: errMsg });
          continue;
        }
        xa_phuong_id = resolved;
      }
    }

    const dipRaw =
      raw.dip_tham_hoi_id != null && String(raw.dip_tham_hoi_id).trim() !== ''
        ? String(raw.dip_tham_hoi_id).trim()
        : '';
    let dip_tham_hoi_id: string | null = null;
    if (dipRaw && /^\d+$/.test(dipRaw)) {
      dip_tham_hoi_id = dipRaw;
    } else {
      const tenDip = String(raw.dip_tham_hoi ?? raw.ten_dip ?? '').trim();
      if (!tenDip) {
        const msg = txt('danTocThamHoiCaNhan.validation.dipThamHoiRequired');
        const errMsg = txt('danTocThamHoiCaNhan.import.rowError', { row: rowNum, message: msg });
        errors.push(errMsg);
        errorRows.push({ rowNum, data: rowData, message: errMsg });
        continue;
      }
      dip_tham_hoi_id = (await resolveDipIdByTen(tenDip)) ?? null;
      if (!dip_tham_hoi_id) {
        const msg = txt('danTocThamHoiCaNhan.validation.dipThamHoiInvalid');
        const errMsg = txt('danTocThamHoiCaNhan.import.rowError', { row: rowNum, message: msg });
        errors.push(errMsg);
        errorRows.push({ rowNum, data: rowData, message: errMsg });
        continue;
      }
    }

    const thoiGianParsed = parseThoiGianDuKienImport(raw.thoi_gian_du_kien);
    const thoiGianForm =
      thoiGianParsed != null ? dbDateToMonthYear(thoiGianParsed) : undefined;

    const input = {
      ca_nhan_id: ca_nhan_id ?? '',
      phong_ban_tham_muu_id,
      dip_tham_hoi_id: dip_tham_hoi_id ?? '',
      thoi_gian_du_kien: thoiGianForm,
      don_vi_tham_hoi_id,
      qua_tang:
        raw.qua_tang != null && String(raw.qua_tang).trim() !== '' ? String(raw.qua_tang) : undefined,
      xa_phuong_id,
      trang_thai: resolveTrangThaiFromImport(raw.trang_thai),
      ket_qua_ghi_chu:
        raw.ket_qua_ghi_chu != null && String(raw.ket_qua_ghi_chu).trim() !== ''
          ? String(raw.ket_qua_ghi_chu)
          : undefined,
      link_ket_qua:
        raw.link_ket_qua != null && String(raw.link_ket_qua).trim() !== ''
          ? String(raw.link_ket_qua)
          : undefined,
    };

    const parsed = thamHoiCaNhanSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      const errMsg = txt('danTocThamHoiCaNhan.import.rowError', { row: rowNum, message: msg });
      errors.push(errMsg);
      errorRows.push({ rowNum, data: rowData, message: errMsg });
      continue;
    }

    const denorm = await denormFromCaNhan(parsed.data.ca_nhan_id);
    validPayloads.push({
      ...(await buildPayload(parsed.data, denorm)),
      id_nguoi_tao: Number(trimmedNv),
    });
  }

  if (validPayloads.length > 0) {
    const supabase = getSupabase();
    if (!supabase) throw new Error(txt('danTocThamHoiCaNhan.service.notFound'));
    const { error } = await supabase.from('dttg_tham_hoi_ca_nhan').insert(validPayloads);
    if (error) handleSupabaseError(error);
  }

  return { created: validPayloads.length, errors, errorRows };
}

export { DON_VI_THAM_HOI_CQMTTQ_LABEL };
