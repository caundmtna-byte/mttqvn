import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';

/**
 * Hồ sơ Nhà đại đoàn kết đã gắn cho một hộ — CHỈ ĐỌC.
 *
 * Dữ liệu thuộc module Nhà đại đoàn kết; màn hộ nghèo chỉ hiển thị và cho bấm
 * sang module gốc để sửa. Cố ý không đi qua service của module kia: ở đây chỉ
 * cần vài cột để dựng lưới nhúng, kéo cả `NDDK_SELECT` là tốn egress vô ích.
 */
export interface NhaCuaHo {
  id: string;
  noi_dung_ho_tro: string;
  nam: number;
  loai_hinh_ho_tro: string;
  so_tien: number | null;
  trang_thai: string;
}

const COLS = 'id,noi_dung_ho_tro,nam,loai_hinh_ho_tro,so_tien,trang_thai';

export async function getNhaCuaHoNgheo(hoNgheoId: string): Promise<NhaCuaHo[]> {
  const supabase = getSupabase();
  if (!supabase || !hoNgheoId.trim()) return [];
  const { data, error } = await supabase
    .from('nddk_nha_dai_doan_ket')
    .select(COLS)
    .eq('ho_ngheo_id', hoNgheoId)
    .order('nam', { ascending: false })
    .order('id', { ascending: false });
  if (error) handleSupabaseError(error);
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
    id: String(r.id ?? ''),
    noi_dung_ho_tro: String(r.noi_dung_ho_tro ?? ''),
    nam: Number(r.nam ?? 0),
    loai_hinh_ho_tro: String(r.loai_hinh_ho_tro ?? ''),
    so_tien: r.so_tien == null ? null : Number(r.so_tien),
    trang_thai: String(r.trang_thai ?? ''),
  }));
}
