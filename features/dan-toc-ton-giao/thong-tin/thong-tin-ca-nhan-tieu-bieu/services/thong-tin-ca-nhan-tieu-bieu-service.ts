import { createRepository } from '@/lib/data/create-repository';
import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import type { ThongTinCaNhanTieuBieu } from '../core/types';
import type { ThongTinCaNhanTieuBieuFormValues } from '../core/schema';
import { thongTinCaNhanTieuBieuSchema } from '../core/schema';
import {
  DOI_TUONG_VALUES,
  TRANG_THAI_HOAT_DONG_DEFAULT,
} from '../core/constants';
import {
  DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_RETURNING,
  DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_SELECT,
} from '../core/supabase-select';
import { DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_MOCK } from '../mock-data';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'dttg_thong_tin_ca_nhan_tieu_bieu',
  select: DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_SELECT,
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

export function flattenThongTinCaNhanTieuBieuRow(row: Record<string, unknown>): ThongTinCaNhanTieuBieu {
  const dv = pickEmbedded<{ ten?: string; var_ssn_tinh_thanh?: unknown }>(row.don_vi);
  const tinh = pickEmbedded<{ ten?: string }>(dv?.var_ssn_tinh_thanh);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.don_vi;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id ?? ''),
    ho_va_ten: String(r.ho_va_ten ?? ''),
    ngay_sinh: nullableStr(r.ngay_sinh),
    doi_tuong: String(r.doi_tuong ?? ''),
    chuc_vu_vi_tri: nullableStr(r.chuc_vu_vi_tri),
    ton_giao_dan_toc: nullableStr(r.ton_giao_dan_toc),
    dia_chi: nullableStr(r.dia_chi),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
    ten_don_vi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ten_tinh: tinh?.ten != null && String(tinh.ten).trim() !== '' ? String(tinh.ten) : null,
    so_dien_thoai: nullableStr(r.so_dien_thoai),
    dong_gop_noi_bat: nullableStr(r.dong_gop_noi_bat),
    trang_thai: String(r.trang_thai ?? 'Đang hoạt động') as ThongTinCaNhanTieuBieu['trang_thai'],
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

let mockRows = structuredClone(DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_MOCK);

function mockNextId(): string {
  const maxId = Math.max(0, ...mockRows.map((r) => Number(r.id) || 0));
  return String(maxId + 1);
}

function formToPayload(data: ThongTinCaNhanTieuBieuFormValues): Record<string, unknown> {
  return {
    ho_va_ten: data.ho_va_ten,
    ngay_sinh: data.ngay_sinh,
    doi_tuong: data.doi_tuong,
    chuc_vu_vi_tri: data.chuc_vu_vi_tri,
    ton_giao_dan_toc: data.ton_giao_dan_toc,
    dia_chi: data.dia_chi,
    don_vi_id: data.don_vi_id != null && data.don_vi_id !== '' ? Number(data.don_vi_id) : null,
    so_dien_thoai: data.so_dien_thoai,
    dong_gop_noi_bat: data.dong_gop_noi_bat,
    trang_thai: data.trang_thai,
  };
}

export async function getThongTinCaNhanTieuBieuList(): Promise<ThongTinCaNhanTieuBieu[]> {
  if (!isSupabase()) {
    return [...mockRows].sort((a, b) => b.tg_cap_nhat.localeCompare(a.tg_cap_nhat));
  }
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThongTinCaNhanTieuBieuRow(row as unknown as Record<string, unknown>));
}

export async function getThongTinCaNhanTieuBieuById(id: string): Promise<ThongTinCaNhanTieuBieu | null> {
  if (!isSupabase()) {
    return mockRows.find((r) => r.id === id) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dttg_thong_tin_ca_nhan_tieu_bieu')
    .select(DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThongTinCaNhanTieuBieuRow(data as unknown as Record<string, unknown>);
}

export async function createThongTinCaNhanTieuBieu(
  data: ThongTinCaNhanTieuBieuFormValues,
  idNguoiTao: string,
): Promise<ThongTinCaNhanTieuBieu> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocCaNhanTieuBieu.service.noEmployeeProfile'));

  if (!isSupabase()) {
    const now = new Date().toISOString();
    const row: ThongTinCaNhanTieuBieu = {
      id: mockNextId(),
      ho_va_ten: data.ho_va_ten,
      ngay_sinh: data.ngay_sinh,
      doi_tuong: data.doi_tuong,
      chuc_vu_vi_tri: data.chuc_vu_vi_tri,
      ton_giao_dan_toc: data.ton_giao_dan_toc,
      dia_chi: data.dia_chi,
      don_vi_id: data.don_vi_id,
      ten_don_vi: null,
      ten_tinh: null,
      so_dien_thoai: data.so_dien_thoai,
      dong_gop_noi_bat: data.dong_gop_noi_bat,
      trang_thai: data.trang_thai,
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
    { returningSelect: DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_RETURNING },
  );
  return flattenThongTinCaNhanTieuBieuRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThongTinCaNhanTieuBieu(
  id: string,
  data: ThongTinCaNhanTieuBieuFormValues,
): Promise<ThongTinCaNhanTieuBieu> {
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('danTocCaNhanTieuBieu.service.notFound'));
    const now = new Date().toISOString();
    const row: ThongTinCaNhanTieuBieu = {
      ...mockRows[idx],
      ho_va_ten: data.ho_va_ten,
      ngay_sinh: data.ngay_sinh,
      doi_tuong: data.doi_tuong,
      chuc_vu_vi_tri: data.chuc_vu_vi_tri,
      ton_giao_dan_toc: data.ton_giao_dan_toc,
      dia_chi: data.dia_chi,
      don_vi_id: data.don_vi_id,
      so_dien_thoai: data.so_dien_thoai,
      dong_gop_noi_bat: data.dong_gop_noi_bat,
      trang_thai: data.trang_thai,
      tg_cap_nhat: now,
    };
    mockRows = [...mockRows.slice(0, idx), row, ...mockRows.slice(idx + 1)];
    return { ...row };
  }

  const updated = await repo.update(id, formToPayload(data) as unknown as Partial<RepoRow>, {
    returningSelect: DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_RETURNING,
  });
  return flattenThongTinCaNhanTieuBieuRow(updated as unknown as Record<string, unknown>);
}

export async function updateThongTinCaNhanTieuBieuStatus(
  id: string,
  trangThai: TrangThaiHoatDong,
): Promise<ThongTinCaNhanTieuBieu> {
  if (!isSupabase()) {
    const idx = mockRows.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error(txt('danTocCaNhanTieuBieu.service.notFound'));
    const now = new Date().toISOString();
    const row: ThongTinCaNhanTieuBieu = { ...mockRows[idx], trang_thai: trangThai, tg_cap_nhat: now };
    mockRows = [...mockRows.slice(0, idx), row, ...mockRows.slice(idx + 1)];
    return { ...row };
  }

  const updated = await repo.update(
    id,
    { trang_thai: trangThai } as unknown as Partial<RepoRow>,
    { returningSelect: DTTG_THONG_TIN_CA_NHAN_TIEU_BIEU_RETURNING },
  );
  return flattenThongTinCaNhanTieuBieuRow(updated as unknown as Record<string, unknown>);
}

export async function deleteThongTinCaNhanTieuBieuMany(ids: string[]): Promise<void> {
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

function normalizeImportDate(raw: unknown): string | undefined {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  if (s.length >= 10) return s.slice(0, 10);
  return s || undefined;
}

function resolveDoiTuongFromImport(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return DOI_TUONG_VALUES[1];
  const exact = DOI_TUONG_VALUES.find((v) => v === s);
  if (exact) return exact;
  const lower = s.toLowerCase();
  const match = DOI_TUONG_VALUES.find((v) => v.toLowerCase() === lower);
  return match ?? s;
}

function resolveTrangThaiFromImport(raw: unknown): TrangThaiHoatDong {
  const s = String(raw ?? '').trim();
  if (!s) return TRANG_THAI_HOAT_DONG_DEFAULT;
  const exact = TRANG_THAI_HOAT_DONG.find((v) => v === s);
  if (exact) return exact;
  const lower = s.toLowerCase();
  const match = TRANG_THAI_HOAT_DONG.find((v) => v.toLowerCase() === lower);
  return match ?? TRANG_THAI_HOAT_DONG_DEFAULT;
}

async function resolveDonViIdByTen(tenDonVi: string): Promise<string | null> {
  const t = tenDonVi.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  const all = await getXaPhuongAll();
  const exact = all.find((x) => x.ten.trim().toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = all.find((x) => x.ten.toLowerCase().includes(lower) || lower.includes(x.ten.toLowerCase()));
  return partial?.id ?? null;
}

export async function importThongTinCaNhanTieuBieu(
  rows: Record<string, unknown>[],
  idNguoiTao: string,
): Promise<{ created: number; errors: string[]; errorRows: ImportErrorRow[] }> {
  const trimmedNv = idNguoiTao.trim();
  if (!trimmedNv) throw new Error(txt('danTocCaNhanTieuBieu.service.noEmployeeProfile'));

  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];
  const validPayloads: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = importRowNum(raw, i + 2);
    const rowData = { ...raw };
    delete rowData[IMPORT_ROW_NUM_KEY];

    const dvRaw = raw.don_vi_id != null && String(raw.don_vi_id).trim() !== '' ? String(raw.don_vi_id).trim() : '';
    let don_vi_id: string | null = null;
    if (dvRaw && /^\d+$/.test(dvRaw)) {
      don_vi_id = dvRaw;
    } else {
      const tenDv = String(raw.ten_don_vi ?? '').trim();
      if (tenDv) {
        don_vi_id = (await resolveDonViIdByTen(tenDv)) ?? null;
        if (!don_vi_id) {
          const msg = txt('danTocCaNhanTieuBieu.validation.donViInvalid');
          const errMsg = txt('danTocCaNhanTieuBieu.import.rowError', { row: rowNum, message: msg });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: rowData, message: errMsg });
          continue;
        }
      }
    }

    const input = {
      ho_va_ten: String(raw.ho_va_ten ?? '').trim(),
      ngay_sinh: normalizeImportDate(raw.ngay_sinh),
      doi_tuong: resolveDoiTuongFromImport(raw.doi_tuong),
      chuc_vu_vi_tri: raw.chuc_vu_vi_tri != null && String(raw.chuc_vu_vi_tri).trim() !== '' ? String(raw.chuc_vu_vi_tri) : undefined,
      ton_giao_dan_toc: raw.ton_giao_dan_toc != null && String(raw.ton_giao_dan_toc).trim() !== '' ? String(raw.ton_giao_dan_toc) : undefined,
      dia_chi: raw.dia_chi != null && String(raw.dia_chi).trim() !== '' ? String(raw.dia_chi) : undefined,
      don_vi_id: don_vi_id ?? '',
      so_dien_thoai: raw.so_dien_thoai != null && String(raw.so_dien_thoai).trim() !== '' ? String(raw.so_dien_thoai) : undefined,
      dong_gop_noi_bat: raw.dong_gop_noi_bat != null && String(raw.dong_gop_noi_bat).trim() !== '' ? String(raw.dong_gop_noi_bat) : undefined,
      trang_thai: resolveTrangThaiFromImport(raw.trang_thai),
    };

    const parsed = thongTinCaNhanTieuBieuSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      const errMsg = txt('danTocCaNhanTieuBieu.import.rowError', { row: rowNum, message: msg });
      errors.push(errMsg);
      errorRows.push({ rowNum, data: rowData, message: errMsg });
      continue;
    }
    validPayloads.push({ ...formToPayload(parsed.data), id_nguoi_tao: Number(trimmedNv) });
  }

  if (validPayloads.length > 0) {
    if (!isSupabase()) {
      const now = new Date().toISOString();
      for (const payload of validPayloads) {
        const data = parsedFormFromPayload(payload);
        const row: ThongTinCaNhanTieuBieu = {
          id: mockNextId(),
          ho_va_ten: data.ho_va_ten,
          ngay_sinh: data.ngay_sinh,
          doi_tuong: data.doi_tuong,
          chuc_vu_vi_tri: data.chuc_vu_vi_tri,
          ton_giao_dan_toc: data.ton_giao_dan_toc,
          dia_chi: data.dia_chi,
          don_vi_id: data.don_vi_id,
          ten_don_vi: null,
          ten_tinh: null,
          so_dien_thoai: data.so_dien_thoai,
          dong_gop_noi_bat: data.dong_gop_noi_bat,
          trang_thai: data.trang_thai,
          id_nguoi_tao: trimmedNv,
          tg_tao: now,
          tg_cap_nhat: now,
          ho_va_ten_nguoi_tao: 'Mock',
        };
        mockRows = [row, ...mockRows];
      }
    } else {
      const supabase = getSupabase();
      if (!supabase) throw new Error(txt('danTocCaNhanTieuBieu.service.notFound'));
      const { error } = await supabase.from('dttg_thong_tin_ca_nhan_tieu_bieu').insert(validPayloads);
      if (error) handleSupabaseError(error);
    }
  }

  return { created: validPayloads.length, errors, errorRows };
}

function parsedFormFromPayload(payload: Record<string, unknown>): ThongTinCaNhanTieuBieuFormValues {
  return {
    ho_va_ten: String(payload.ho_va_ten ?? ''),
    ngay_sinh: nullableStr(payload.ngay_sinh),
    doi_tuong: String(payload.doi_tuong ?? '') as ThongTinCaNhanTieuBieuFormValues['doi_tuong'],
    chuc_vu_vi_tri: nullableStr(payload.chuc_vu_vi_tri),
    ton_giao_dan_toc: nullableStr(payload.ton_giao_dan_toc),
    dia_chi: nullableStr(payload.dia_chi),
    don_vi_id: payload.don_vi_id == null || payload.don_vi_id === '' ? null : String(payload.don_vi_id),
    so_dien_thoai: nullableStr(payload.so_dien_thoai),
    dong_gop_noi_bat: nullableStr(payload.dong_gop_noi_bat),
    trang_thai: String(payload.trang_thai ?? TRANG_THAI_HOAT_DONG_DEFAULT) as TrangThaiHoatDong,
  };
}
