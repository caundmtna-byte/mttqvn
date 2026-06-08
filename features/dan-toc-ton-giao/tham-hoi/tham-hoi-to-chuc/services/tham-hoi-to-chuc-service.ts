import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { getThongTinToChucQuanTrongList } from '@/features/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong/services/thong-tin-to-chuc-quan-trong-service';
import type { ThamHoiToChucFormValues } from '../core/schema';
import { thamHoiToChucSchema } from '../core/schema';
import type { ThamHoiToChuc } from '../core/types';
import type { TienDoThamHoi } from '../core/constants';
import { TIEN_DO_DEFAULT, TIEN_DO_VALUES } from '../core/constants';
import {
  DTTG_THAM_HOI_TO_CHUC_RETURNING,
  DTTG_THAM_HOI_TO_CHUC_SELECT,
} from '../core/supabase-select';
import { DTTG_THAM_HOI_TO_CHUC_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'dttg_tham_hoi_to_chuc',
  select: DTTG_THAM_HOI_TO_CHUC_SELECT,
  delay: 350,
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

export function flattenThamHoiToChucRow(row: Record<string, unknown>): ThamHoiToChuc {
  const tc = pickEmbedded<{ ten_co_so?: string; loai_hinh?: string }>(row.to_chuc);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.to_chuc;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id ?? ''),
    to_chuc_id: String(r.to_chuc_id ?? ''),
    ten_co_so: tc?.ten_co_so != null && String(tc.ten_co_so).trim() !== '' ? String(tc.ten_co_so) : null,
    loai_hinh: tc?.loai_hinh != null && String(tc.loai_hinh).trim() !== '' ? String(tc.loai_hinh) : null,
    dip_tham_hoi: String(r.dip_tham_hoi ?? ''),
    thoi_gian_du_kien: nullableStr(r.thoi_gian_du_kien),
    don_vi_tham_hoi: nullableStr(r.don_vi_tham_hoi),
    noi_dung_tham_hoi: nullableStr(r.noi_dung_tham_hoi),
    thanh_phan_doan: nullableStr(r.thanh_phan_doan),
    qua_tang: nullableStr(r.qua_tang),
    tien_do: String(r.tien_do ?? TIEN_DO_DEFAULT) as TienDoThamHoi,
    ket_qua_thuc_hien: nullableStr(r.ket_qua_thuc_hien),
    link_ket_qua: nullableStr(r.link_ket_qua),
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

let mockRows = structuredClone(DTTG_THAM_HOI_TO_CHUC_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function formToPayload(data: ThamHoiToChucFormValues): Record<string, unknown> {
  return {
    to_chuc_id: Number(data.to_chuc_id),
    dip_tham_hoi: data.dip_tham_hoi,
    thoi_gian_du_kien: data.thoi_gian_du_kien ?? null,
    don_vi_tham_hoi: data.don_vi_tham_hoi ?? null,
    noi_dung_tham_hoi: data.noi_dung_tham_hoi ?? null,
    thanh_phan_doan: data.thanh_phan_doan ?? null,
    qua_tang: data.qua_tang ?? null,
    tien_do: data.tien_do,
    ket_qua_thuc_hien: data.ket_qua_thuc_hien ?? null,
    link_ket_qua: data.link_ket_qua ?? null,
  };
}

export async function getThamHoiToChucList(): Promise<ThamHoiToChuc[]> {
  if (!isSupabase()) {
    return [...mockRows].sort((a, b) => b.tg_cap_nhat.localeCompare(a.tg_cap_nhat));
  }
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThamHoiToChucRow(row as unknown as Record<string, unknown>));
}

export async function getThamHoiToChucById(id: string): Promise<ThamHoiToChuc | null> {
  if (!isSupabase()) {
    return mockRows.find((r) => r.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dttg_tham_hoi_to_chuc')
    .select(DTTG_THAM_HOI_TO_CHUC_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThamHoiToChucRow(data as unknown as Record<string, unknown>);
}

export async function getThamHoiToChucByToChucId(toChucId: string): Promise<ThamHoiToChuc[]> {
  const trimmed = toChucId.trim();
  if (!trimmed) return [];
  if (!isSupabase()) {
    return mockRows
      .filter((r) => r.to_chuc_id === trimmed)
      .sort((a, b) => b.tg_cap_nhat.localeCompare(a.tg_cap_nhat));
  }
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('dttg_tham_hoi_to_chuc')
    .select(DTTG_THAM_HOI_TO_CHUC_SELECT)
    .eq('to_chuc_id', trimmed)
    .order('tg_cap_nhat', { ascending: false });
  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => flattenThamHoiToChucRow(row as unknown as Record<string, unknown>));
}

export async function createThamHoiToChuc(
  data: ThamHoiToChucFormValues,
  idNguoiTao: string,
): Promise<ThamHoiToChuc> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocThamHoiToChuc.service.noEmployeeProfile'));

  if (!isSupabase()) {
    const now = new Date().toISOString();
    const orgList = await getThongTinToChucQuanTrongList();
    const org = orgList.find((o) => o.id === data.to_chuc_id);
    const row: ThamHoiToChuc = {
      id: mockNextId(),
      to_chuc_id: data.to_chuc_id,
      ten_co_so: org?.ten_co_so ?? null,
      loai_hinh: org?.loai_hinh ?? null,
      dip_tham_hoi: data.dip_tham_hoi,
      thoi_gian_du_kien: data.thoi_gian_du_kien ?? null,
      don_vi_tham_hoi: data.don_vi_tham_hoi ?? null,
      noi_dung_tham_hoi: data.noi_dung_tham_hoi ?? null,
      thanh_phan_doan: data.thanh_phan_doan ?? null,
      qua_tang: data.qua_tang ?? null,
      tien_do: data.tien_do,
      ket_qua_thuc_hien: data.ket_qua_thuc_hien ?? null,
      link_ket_qua: data.link_ket_qua ?? null,
      id_nguoi_tao: trimmed,
      tg_tao: now,
      tg_cap_nhat: now,
      ho_va_ten_nguoi_tao: 'Mock',
    };
    mockRows = [row, ...mockRows];
    return { ...row };
  }

  const inserted = await repo.insert(
    { ...formToPayload(data), id_nguoi_tao: Number(trimmed) },
    { returningSelect: DTTG_THAM_HOI_TO_CHUC_RETURNING },
  );
  return flattenThamHoiToChucRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThamHoiToChuc(id: string, data: ThamHoiToChucFormValues): Promise<ThamHoiToChuc> {
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('danTocThamHoiToChuc.service.notFound'));
    const now = new Date().toISOString();
    const orgList = await getThongTinToChucQuanTrongList();
    const org = orgList.find((o) => o.id === data.to_chuc_id);
    const row: ThamHoiToChuc = {
      ...mockRows[idx],
      to_chuc_id: data.to_chuc_id,
      ten_co_so: org?.ten_co_so ?? mockRows[idx].ten_co_so,
      loai_hinh: org?.loai_hinh ?? mockRows[idx].loai_hinh,
      dip_tham_hoi: data.dip_tham_hoi,
      thoi_gian_du_kien: data.thoi_gian_du_kien ?? null,
      don_vi_tham_hoi: data.don_vi_tham_hoi ?? null,
      noi_dung_tham_hoi: data.noi_dung_tham_hoi ?? null,
      thanh_phan_doan: data.thanh_phan_doan ?? null,
      qua_tang: data.qua_tang ?? null,
      tien_do: data.tien_do,
      ket_qua_thuc_hien: data.ket_qua_thuc_hien ?? null,
      link_ket_qua: data.link_ket_qua ?? null,
      tg_cap_nhat: now,
    };
    mockRows = [...mockRows.slice(0, idx), row, ...mockRows.slice(idx + 1)];
    return { ...row };
  }

  const updated = await repo.update(id, formToPayload(data) as unknown as Partial<RepoRow>, {
    returningSelect: DTTG_THAM_HOI_TO_CHUC_RETURNING,
  });
  return flattenThamHoiToChucRow(updated as unknown as Record<string, unknown>);
}

export async function deleteThamHoiToChucMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  if (!isSupabase()) {
    const set = new Set(ids);
    mockRows = mockRows.filter((r) => !set.has(r.id));
    return;
  }
  await repo.remove(ids);
}

function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const n = raw[IMPORT_ROW_NUM_KEY];
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  const parsed = Number(n);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveTienDoFromImport(raw: unknown): TienDoThamHoi {
  const s = String(raw ?? '').trim();
  if (!s) return TIEN_DO_DEFAULT;
  const exact = TIEN_DO_VALUES.find((v) => v === s);
  if (exact) return exact;
  const lower = s.toLowerCase();
  const match = TIEN_DO_VALUES.find((v) => v.toLowerCase() === lower);
  return match ?? TIEN_DO_DEFAULT;
}

async function resolveToChucIdByTen(tenCoSo: string): Promise<string | null> {
  const t = tenCoSo.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const all = await getThongTinToChucQuanTrongList();
  const exact = all.find((x) => x.ten_co_so.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find(
    (x) =>
      x.ten_co_so.toLowerCase().includes(lower) || lower.includes(x.ten_co_so.toLowerCase()),
  );
  return partial?.id ?? null;
}

export async function importThamHoiToChuc(
  rows: Record<string, unknown>[],
  idNguoiTao: string,
): Promise<{ created: number; errors: string[]; errorRows: ImportErrorRow[] }> {
  const trimmedNv = idNguoiTao.trim();
  if (!trimmedNv) throw new Error(txt('danTocThamHoiToChuc.service.noEmployeeProfile'));

  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];
  const validPayloads: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = importRowNum(raw, i + 2);
    const rowData = { ...raw };
    delete rowData[IMPORT_ROW_NUM_KEY];

    const tcRaw =
      raw.to_chuc_id != null && String(raw.to_chuc_id).trim() !== '' ? String(raw.to_chuc_id).trim() : '';
    let to_chuc_id: string | null = null;
    if (tcRaw && /^\d+$/.test(tcRaw)) {
      to_chuc_id = tcRaw;
    } else {
      const tenCoSo = String(raw.ten_co_so ?? '').trim();
      if (tenCoSo) {
        to_chuc_id = (await resolveToChucIdByTen(tenCoSo)) ?? null;
        if (!to_chuc_id) {
          const msg = txt('danTocThamHoiToChuc.validation.toChucInvalid');
          const errMsg = txt('danTocThamHoiToChuc.import.rowError', { row: rowNum, message: msg });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: rowData, message: errMsg });
          continue;
        }
      }
    }

    const input = {
      to_chuc_id: to_chuc_id ?? '',
      dip_tham_hoi: String(raw.dip_tham_hoi ?? '').trim(),
      thoi_gian_du_kien:
        raw.thoi_gian_du_kien != null && String(raw.thoi_gian_du_kien).trim() !== ''
          ? String(raw.thoi_gian_du_kien)
          : undefined,
      don_vi_tham_hoi:
        raw.don_vi_tham_hoi != null && String(raw.don_vi_tham_hoi).trim() !== ''
          ? String(raw.don_vi_tham_hoi)
          : undefined,
      noi_dung_tham_hoi:
        raw.noi_dung_tham_hoi != null && String(raw.noi_dung_tham_hoi).trim() !== ''
          ? String(raw.noi_dung_tham_hoi)
          : undefined,
      thanh_phan_doan:
        raw.thanh_phan_doan != null && String(raw.thanh_phan_doan).trim() !== ''
          ? String(raw.thanh_phan_doan)
          : undefined,
      qua_tang:
        raw.qua_tang != null && String(raw.qua_tang).trim() !== '' ? String(raw.qua_tang) : undefined,
      tien_do: resolveTienDoFromImport(raw.tien_do),
      ket_qua_thuc_hien:
        raw.ket_qua_thuc_hien != null && String(raw.ket_qua_thuc_hien).trim() !== ''
          ? String(raw.ket_qua_thuc_hien)
          : undefined,
      link_ket_qua:
        raw.link_ket_qua != null && String(raw.link_ket_qua).trim() !== ''
          ? String(raw.link_ket_qua)
          : undefined,
    };

    const parsed = thamHoiToChucSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      const errMsg = txt('danTocThamHoiToChuc.import.rowError', { row: rowNum, message: msg });
      errors.push(errMsg);
      errorRows.push({ rowNum, data: rowData, message: errMsg });
      continue;
    }
    validPayloads.push({ ...formToPayload(parsed.data), id_nguoi_tao: Number(trimmedNv) });
  }

  if (validPayloads.length > 0) {
    if (!isSupabase()) {
      const now = new Date().toISOString();
      const orgList = await getThongTinToChucQuanTrongList();
      for (const payload of validPayloads) {
        const org = orgList.find((o) => o.id === String(payload.to_chuc_id));
        const row: ThamHoiToChuc = {
          id: mockNextId(),
          to_chuc_id: String(payload.to_chuc_id ?? ''),
          ten_co_so: org?.ten_co_so ?? null,
          loai_hinh: org?.loai_hinh ?? null,
          dip_tham_hoi: String(payload.dip_tham_hoi ?? ''),
          thoi_gian_du_kien: nullableStr(payload.thoi_gian_du_kien),
          don_vi_tham_hoi: nullableStr(payload.don_vi_tham_hoi),
          noi_dung_tham_hoi: nullableStr(payload.noi_dung_tham_hoi),
          thanh_phan_doan: nullableStr(payload.thanh_phan_doan),
          qua_tang: nullableStr(payload.qua_tang),
          tien_do: String(payload.tien_do ?? TIEN_DO_DEFAULT) as TienDoThamHoi,
          ket_qua_thuc_hien: nullableStr(payload.ket_qua_thuc_hien),
          link_ket_qua: nullableStr(payload.link_ket_qua),
          id_nguoi_tao: trimmedNv,
          tg_tao: now,
          tg_cap_nhat: now,
          ho_va_ten_nguoi_tao: 'Mock',
        };
        mockRows = [row, ...mockRows];
      }
    } else {
      const supabase = getSupabase();
      if (!supabase) throw new Error(txt('danTocThamHoiToChuc.service.notFound'));
      const { error } = await supabase.from('dttg_tham_hoi_to_chuc').insert(validPayloads);
      if (error) handleSupabaseError(error);
    }
  }

  return { created: validPayloads.length, errors, errorRows };
}
