import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { LuongThietLapCauHinhRow } from '../core/types';
import { LUONG_THIET_LAP_CAU_HINH_RETURNING, LUONG_THIET_LAP_CAU_HINH_SELECT } from '../core/supabase-select';

function flatten(row: Record<string, unknown>): LuongThietLapCauHinhRow {
  return {
    id: String(row.id ?? '1'),
    muc_luong_co_so: String(row.muc_luong_co_so ?? '0'),
    tg_tao: String(row.tg_tao ?? ''),
    tg_cap_nhat: String(row.tg_cap_nhat ?? ''),
  };
}

export async function getLuongThietLapCauHinh(): Promise<LuongThietLapCauHinhRow | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('luong_thiet_lap_cau_hinh')
    .select(LUONG_THIET_LAP_CAU_HINH_SELECT)
    .eq('id', 1)
    .maybeSingle();
  if (error) handleSupabaseError(error);
  if (!data) return null;
  return flatten(data as unknown as Record<string, unknown>);
}

export async function updateLuongThietLapCauHinhMucLuong(muc_luong_co_so: number): Promise<LuongThietLapCauHinhRow> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase chưa được cấu hình. Đặt VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong .env.local (xem .env.example).');
  const { data, error } = await supabase
    .from('luong_thiet_lap_cau_hinh')
    .update({ muc_luong_co_so })
    .eq('id', 1)
    .select(LUONG_THIET_LAP_CAU_HINH_RETURNING)
    .single();
  if (error) handleSupabaseError(error);
  return flatten(data as unknown as Record<string, unknown>);
}
