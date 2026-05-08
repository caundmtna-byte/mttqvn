import { getSupabase } from '@/lib/supabase/client';
import { isSupabase } from '@/lib/data/config';
import type { Database } from '@/lib/supabase/database.types';
import type { CompanyInfo } from '@/store/useStore';
import { DEFAULT_COMPANY_INFO } from '@/store/useStore';
import type { CompanyFormValues } from '../core/types';
import { THONG_TIN_TO_CHUC_ROW_COLUMNS } from '../core/supabase-select';

type ThongTinRow = Database['public']['Tables']['var_thong_tin_to_chuc']['Row'];
type ThongTinUpdate = Database['public']['Tables']['var_thong_tin_to_chuc']['Update'];

const SINGLETON_ID: ThongTinRow['id'] = 1;

function mapRowToCompanyInfo(row: ThongTinRow): CompanyInfo {
  return {
    appName: String(row.ten_ung_dung ?? ''),
    appDescription: String(row.mo_ta_ngan ?? ''),
    appLogo: row.url_logo == null || row.url_logo === '' ? null : String(row.url_logo),
    companyName: String(row.ten_to_chuc ?? ''),
    address: String(row.dia_chi ?? ''),
    phone: String(row.dien_thoai ?? ''),
    email: String(row.email ?? ''),
    website: String(row.website ?? ''),
  };
}

function formToDbPayload(data: CompanyFormValues & { appLogo: string | null }): ThongTinUpdate {
  return {
    ten_ung_dung: data.appName.trim(),
    mo_ta_ngan: data.appDescription?.trim() || null,
    url_logo: data.appLogo?.trim() || null,
    ten_to_chuc: data.companyName.trim(),
    dia_chi: data.address?.trim() || null,
    dien_thoai: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    website: data.website?.trim() || null,
  };
}

/** Đọc cấu hình tổ chức: Supabase row id=1, hoặc mock = default store. */
export async function getThongTinToChuc(): Promise<CompanyInfo> {
  if (!isSupabase()) {
    return { ...DEFAULT_COMPANY_INFO };
  }
  const sb = getSupabase();
  if (!sb) return { ...DEFAULT_COMPANY_INFO };

  const { data, error } = await sb
    .from('var_thong_tin_to_chuc')
    .select(THONG_TIN_TO_CHUC_ROW_COLUMNS)
    .eq('id', SINGLETON_ID)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object') return { ...DEFAULT_COMPANY_INFO };
  return mapRowToCompanyInfo(data as unknown as ThongTinRow);
}

/** Lưu cấu hình (cập nhật dòng id = 1). */
export async function saveThongTinToChuc(data: CompanyFormValues & { appLogo: string | null }): Promise<CompanyInfo> {
  if (!isSupabase()) {
    return {
      appName: data.appName.trim(),
      appDescription: data.appDescription?.trim() ?? '',
      appLogo: data.appLogo,
      companyName: data.companyName.trim(),
      address: data.address?.trim() ?? '',
      phone: data.phone?.trim() ?? '',
      email: data.email?.trim() ?? '',
      website: data.website?.trim() ?? '',
    };
  }
  const sb = getSupabase();
  if (!sb) {
    throw new Error('Supabase client không khả dụng');
  }

  const payload = formToDbPayload(data);
  const { data: row, error } = await sb
    .from('var_thong_tin_to_chuc')
    .update(payload)
    .eq('id', SINGLETON_ID)
    .select(THONG_TIN_TO_CHUC_ROW_COLUMNS)
    .single();

  if (error) throw new Error(error.message);
  return mapRowToCompanyInfo(row as unknown as ThongTinRow);
}
