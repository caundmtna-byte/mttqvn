import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import {
  KHO_DON_VI_CUU_TRO_LOAI,
  KHO_DON_VI_CUU_TRO_LOAI_DEFAULT,
  khoDonViCuuTroLoaiLabel,
  parseKhoDonViCuuTroLoai,
  type KhoDonViCuuTroLoai,
} from '../core/loai';
import type { KhoDonViCuuTroDetail, KhoDonViCuuTroListRow } from '../core/types';
import type { KhoDonViCuuTroFormValues } from '../core/schema';
import { khoDonViCuuTroSchema } from '../core/schema';
import { KHO_DON_VI_CUU_TRO_RETURNING, KHO_DON_VI_CUU_TRO_SELECT } from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'kho_don_vi_cuu_tro',
  select: KHO_DON_VI_CUU_TRO_SELECT,
});

function nullableStr(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

export function flattenKhoDonViCuuTroRow(row: Record<string, unknown>): KhoDonViCuuTroListRow {
  const r = row as Record<string, unknown>;
  const loai = parseKhoDonViCuuTroLoai(r.loai);
  return {
    id: String(r.id ?? ''),
    tt: Number(r.tt ?? 0),
    loai,
    loai_label: khoDonViCuuTroLoaiLabel(loai),
    ten: String(r.ten ?? ''),
    dia_chi: nullableStr(r.dia_chi),
    dien_thoai: nullableStr(r.dien_thoai),
    email: nullableStr(r.email),
    ghi_chu: nullableStr(r.ghi_chu),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
  };
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === '' ? null : t;
}

function formToPayload(data: KhoDonViCuuTroFormValues): Record<string, unknown> {
  return {
    loai: data.loai,
    ten: data.ten.trim(),
    dia_chi: emptyToNull(data.dia_chi),
    dien_thoai: emptyToNull(data.dien_thoai),
    email: emptyToNull(data.email),
    ghi_chu: emptyToNull(data.ghi_chu),
  };
}

export async function getKhoDonViCuuTroList(): Promise<KhoDonViCuuTroListRow[]> {
  const list = await repo.getAll({ orderBy: 'tt', ascending: true });
  return list.map((row) => flattenKhoDonViCuuTroRow(row as unknown as Record<string, unknown>));
}

export async function getKhoDonViCuuTroById(id: string): Promise<KhoDonViCuuTroDetail | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('kho_don_vi_cuu_tro')
    .select(KHO_DON_VI_CUU_TRO_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenKhoDonViCuuTroRow(data as unknown as Record<string, unknown>);
}

export async function createKhoDonViCuuTro(data: KhoDonViCuuTroFormValues): Promise<KhoDonViCuuTroListRow> {
  const payload = formToPayload(data);
  const inserted = await repo.insert(payload as unknown as Omit<RepoRow, 'id'>, {
    returningSelect: KHO_DON_VI_CUU_TRO_RETURNING,
  });
  return flattenKhoDonViCuuTroRow(inserted as unknown as Record<string, unknown>);
}

export async function updateKhoDonViCuuTro(id: string, data: KhoDonViCuuTroFormValues): Promise<KhoDonViCuuTroListRow> {
  const payload = formToPayload(data);
  const updated = await repo.update(id, payload as unknown as Partial<RepoRow>, {
    returningSelect: KHO_DON_VI_CUU_TRO_RETURNING,
  });
  return flattenKhoDonViCuuTroRow(updated as unknown as Record<string, unknown>);
}

export async function deleteKhoDonViCuuTroMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const n = raw[IMPORT_ROW_NUM_KEY];
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  const parsed = Number(n);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveLoaiFromImport(raw: unknown): KhoDonViCuuTroLoai {
  const s = String(raw ?? '').trim();
  if (!s) return KHO_DON_VI_CUU_TRO_LOAI_DEFAULT;
  const lower = s.toLowerCase();
  for (const v of KHO_DON_VI_CUU_TRO_LOAI) {
    if (v === lower || v === s) return v;
    if (khoDonViCuuTroLoaiLabel(v).toLowerCase() === lower) return v;
  }
  return parseKhoDonViCuuTroLoai(s);
}

export async function importKhoDonViCuuTro(
  rows: Record<string, unknown>[],
): Promise<{ created: number; errors: string[]; errorRows: ImportErrorRow[] }> {
  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];
  const validPayloads: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = importRowNum(raw, i + 2);
    const rowData = { ...raw };
    delete rowData[IMPORT_ROW_NUM_KEY];

    const input = {
      loai: resolveLoaiFromImport(raw.loai),
      ten: String(raw.ten ?? '').trim(),
      dia_chi: String(raw.dia_chi ?? ''),
      dien_thoai: String(raw.dien_thoai ?? ''),
      email: String(raw.email ?? ''),
      ghi_chu: String(raw.ghi_chu ?? ''),
    };
    const parsed = khoDonViCuuTroSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      const errMsg = txt('matTranDonViCuuTro.import.rowError', { row: rowNum, message: msg });
      errors.push(errMsg);
      errorRows.push({ rowNum, data: rowData, message: errMsg });
      continue;
    }
    validPayloads.push(formToPayload(parsed.data));
  }

  if (validPayloads.length > 0) {
    const supabase = getSupabase();
    if (!supabase) throw new Error(txt('matTranDonViCuuTro.service.notFound'));
    const { error } = await supabase.from('kho_don_vi_cuu_tro').insert(validPayloads);
    if (error) handleSupabaseError(error);
  }

  return { created: validPayloads.length, errors, errorRows };
}
