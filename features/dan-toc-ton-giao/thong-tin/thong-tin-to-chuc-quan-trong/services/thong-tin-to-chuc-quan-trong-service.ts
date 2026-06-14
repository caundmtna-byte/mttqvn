import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { TrangThaiHoatDong } from '@/lib/constants/trang-thai';
import { TRANG_THAI_HOAT_DONG } from '@/lib/constants/trang-thai';
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import type { ThongTinToChucQuanTrong } from '../core/types';
import type { ThongTinToChucQuanTrongFormValues } from '../core/schema';
import { thongTinToChucQuanTrongSchema } from '../core/schema';
import { LOAI_HINH_VALUES, TRANG_THAI_HOAT_DONG_DEFAULT } from '../core/constants';
import {
  DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_RETURNING,
  DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_SELECT,
} from '../core/supabase-select';

type RepoRow = { id: string } & Record<string, unknown>;

const repo = createRepository<RepoRow>({
  tableName: 'dttg_thong_tin_to_chuc_quan_trong',
  select: DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_SELECT,
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

export function flattenThongTinToChucQuanTrongRow(row: Record<string, unknown>): ThongTinToChucQuanTrong {
  const dv = pickEmbedded<{ ten?: string; var_ssn_tinh_thanh?: unknown }>(row.don_vi);
  const tinh = pickEmbedded<{ ten?: string }>(dv?.var_ssn_tinh_thanh);
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
  const rest = { ...row };
  delete rest.don_vi;
  delete rest.nguoi_tao;
  const r = rest as Record<string, unknown>;

  return {
    id: String(r.id ?? ''),
    loai_hinh: String(r.loai_hinh ?? ''),
    ten_co_so: String(r.ten_co_so ?? ''),
    chu_tri: nullableStr(r.chu_tri),
    lich_su_hinh_thanh: nullableStr(r.lich_su_hinh_thanh),
    cong_tac_an_sinh: nullableStr(r.cong_tac_an_sinh),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
    ten_don_vi: dv?.ten != null && String(dv.ten).trim() !== '' ? String(dv.ten) : null,
    ten_tinh: tinh?.ten != null && String(tinh.ten).trim() !== '' ? String(tinh.ten) : null,
    dia_chi: nullableStr(r.dia_chi),
    so_dien_thoai: nullableStr(r.so_dien_thoai),
    trang_thai: String(r.trang_thai ?? 'Đang hoạt động') as ThongTinToChucQuanTrong['trang_thai'],
    id_nguoi_tao: String(r.id_nguoi_tao ?? ''),
    tg_tao: String(r.tg_tao ?? ''),
    tg_cap_nhat: String(r.tg_cap_nhat ?? ''),
    ho_va_ten_nguoi_tao: nv?.ho_va_ten ?? null,
    ten_tai_khoan_nguoi_tao: nv?.ten_tai_khoan ?? null,
  };
}

function formToPayload(data: ThongTinToChucQuanTrongFormValues): Record<string, unknown> {
  return {
    loai_hinh: data.loai_hinh,
    ten_co_so: data.ten_co_so,
    chu_tri: data.chu_tri,
    lich_su_hinh_thanh: data.lich_su_hinh_thanh,
    cong_tac_an_sinh: data.cong_tac_an_sinh,
    don_vi_id: data.don_vi_id != null && data.don_vi_id !== '' ? Number(data.don_vi_id) : null,
    dia_chi: data.dia_chi,
    so_dien_thoai: data.so_dien_thoai,
    trang_thai: data.trang_thai,
  };
}

export async function getThongTinToChucQuanTrongList(): Promise<ThongTinToChucQuanTrong[]> {
  const list = await repo.getAll({ orderBy: 'tg_cap_nhat', ascending: false });
  return list.map((row) => flattenThongTinToChucQuanTrongRow(row as unknown as Record<string, unknown>));
}

export async function getThongTinToChucQuanTrongById(id: string): Promise<ThongTinToChucQuanTrong | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('dttg_thong_tin_to_chuc_quan_trong')
    .select(DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_SELECT)
    .eq('id', id)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flattenThongTinToChucQuanTrongRow(data as unknown as Record<string, unknown>);
}

export async function createThongTinToChucQuanTrong(
  data: ThongTinToChucQuanTrongFormValues,
  idNguoiTao: string,
): Promise<ThongTinToChucQuanTrong> {
  const trimmed = idNguoiTao.trim();
  if (!trimmed) throw new Error(txt('danTocToChucQuanTrong.service.noEmployeeProfile'));

  const inserted = await repo.insert(
    { ...formToPayload(data), id_nguoi_tao: Number(trimmed) },
    { returningSelect: DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_RETURNING },
  );
  return flattenThongTinToChucQuanTrongRow(inserted as unknown as Record<string, unknown>);
}

export async function updateThongTinToChucQuanTrong(
  id: string,
  data: ThongTinToChucQuanTrongFormValues,
): Promise<ThongTinToChucQuanTrong> {
  const updated = await repo.update(id, formToPayload(data) as unknown as Partial<RepoRow>, {
    returningSelect: DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_RETURNING,
  });
  return flattenThongTinToChucQuanTrongRow(updated as unknown as Record<string, unknown>);
}

export async function updateThongTinToChucQuanTrongStatus(
  id: string,
  trangThai: TrangThaiHoatDong,
): Promise<ThongTinToChucQuanTrong> {
  const updated = await repo.update(
    id,
    { trang_thai: trangThai } as unknown as Partial<RepoRow>,
    { returningSelect: DTTG_THONG_TIN_TO_CHUC_QUAN_TRONG_RETURNING },
  );
  return flattenThongTinToChucQuanTrongRow(updated as unknown as Record<string, unknown>);
}

export async function deleteThongTinToChucQuanTrongMany(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await repo.remove(ids);
}

function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const n = raw[IMPORT_ROW_NUM_KEY];
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  const parsed = Number(n);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveLoaiHinhFromImport(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return LOAI_HINH_VALUES[0];
  const exact = LOAI_HINH_VALUES.find((v) => v === s);
  if (exact) return exact;
  const lower = s.toLowerCase();
  const match = LOAI_HINH_VALUES.find((v) => v.toLowerCase() === lower);
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

export async function importThongTinToChucQuanTrong(
  rows: Record<string, unknown>[],
  idNguoiTao: string,
): Promise<{ created: number; errors: string[]; errorRows: ImportErrorRow[] }> {
  const trimmedNv = idNguoiTao.trim();
  if (!trimmedNv) throw new Error(txt('danTocToChucQuanTrong.service.noEmployeeProfile'));

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
          const msg = txt('danTocToChucQuanTrong.validation.donViInvalid');
          const errMsg = txt('danTocToChucQuanTrong.import.rowError', { row: rowNum, message: msg });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: rowData, message: errMsg });
          continue;
        }
      }
    }

    const input = {
      loai_hinh: resolveLoaiHinhFromImport(raw.loai_hinh),
      ten_co_so: String(raw.ten_co_so ?? '').trim(),
      chu_tri: raw.chu_tri != null && String(raw.chu_tri).trim() !== '' ? String(raw.chu_tri) : undefined,
      lich_su_hinh_thanh:
        raw.lich_su_hinh_thanh != null && String(raw.lich_su_hinh_thanh).trim() !== ''
          ? String(raw.lich_su_hinh_thanh)
          : undefined,
      cong_tac_an_sinh:
        raw.cong_tac_an_sinh != null && String(raw.cong_tac_an_sinh).trim() !== ''
          ? String(raw.cong_tac_an_sinh)
          : undefined,
      don_vi_id: don_vi_id ?? '',
      dia_chi: raw.dia_chi != null && String(raw.dia_chi).trim() !== '' ? String(raw.dia_chi) : undefined,
      so_dien_thoai:
        raw.so_dien_thoai != null && String(raw.so_dien_thoai).trim() !== '' ? String(raw.so_dien_thoai) : undefined,
      trang_thai: resolveTrangThaiFromImport(raw.trang_thai),
    };

    const parsed = thongTinToChucQuanTrongSchema.safeParse(input);
    if (!parsed.success) {
      const msg = parsed.error.flatten().formErrors[0] ?? parsed.error.message;
      const errMsg = txt('danTocToChucQuanTrong.import.rowError', { row: rowNum, message: msg });
      errors.push(errMsg);
      errorRows.push({ rowNum, data: rowData, message: errMsg });
      continue;
    }
    validPayloads.push({ ...formToPayload(parsed.data), id_nguoi_tao: Number(trimmedNv) });
  }

  if (validPayloads.length > 0) {
    const supabase = getSupabase();
    if (!supabase) throw new Error(txt('danTocToChucQuanTrong.service.notFound'));
    const { error } = await supabase.from('dttg_thong_tin_to_chuc_quan_trong').insert(validPayloads);
    if (error) handleSupabaseError(error);
  }

  return { created: validPayloads.length, errors, errorRows };
}
