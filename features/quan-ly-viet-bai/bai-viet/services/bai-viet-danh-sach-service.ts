import { createRepository } from '@/lib/data/create-repository';
import { txt } from '@/lib/text';
import type { BaiVietDanhSach } from '../core/types';
import type { BaiVietDanhSachFormValues } from '../core/schema';
import {
  BAI_VIET_DANH_SACH_RETURNING_FULL,
  BAI_VIET_DANH_SACH_SELECT_FULL,
} from '../core/supabase-select';
import { MOCK_BAI_VIET_DANH_SACH } from '../mock-data';

const repo = createRepository<BaiVietDanhSach>({
  tableName: 'bai_viet_danh_sach',
  mockData: MOCK_BAI_VIET_DANH_SACH,
  select: BAI_VIET_DANH_SACH_SELECT_FULL,
  delay: 400,
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
  const nv = pickEmbedded<{ ho_va_ten?: string; ten_tai_khoan?: string }>(row.nguoi_tao);
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

  const inserted = await repo.insert(payload as Omit<BaiVietDanhSach, 'id'>, {
    returningSelect: BAI_VIET_DANH_SACH_RETURNING_FULL,
  });
  return normalize(flattenBaiVietDanhSachRow(inserted as unknown as Record<string, unknown>));
}

export async function updateBaiVietDanhSach(
  id: string,
  data: BaiVietDanhSachFormValues,
): Promise<BaiVietDanhSach> {
  const existing = await getBaiVietDanhSachById(id);
  if (!existing) throw new Error(txt('articleList.service.notFound'));

  const updated = await repo.update(
    id,
    {
      ten_bai: data.ten_bai.trim(),
      id_the_loai: data.id_the_loai,
      don_gia: data.don_gia,
      ngay_dang: data.ngay_dang,
      id_nguon_dang: data.id_nguon_dang,
      id_trang_dang: data.id_trang_dang,
      link: data.link.trim(),
    } as Partial<BaiVietDanhSach>,
    { returningSelect: BAI_VIET_DANH_SACH_RETURNING_FULL },
  );
  return normalize(flattenBaiVietDanhSachRow(updated as unknown as Record<string, unknown>));
}

export async function deleteBaiVietDanhSachMany(ids: string[]): Promise<void> {
  await repo.remove(ids);
}
