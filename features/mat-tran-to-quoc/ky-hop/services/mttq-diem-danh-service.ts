import { isSupabase } from '@/lib/data/config';
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { MTTQ_UY_VIEN_UY_BAN_MOCK } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/mock-data';
import type {
  MttqDiemDanhTrangThai,
  MttqDiemDanhUyVien,
  MttqDiemDanhMatrixRow,
  MttqKyHopDiemDanhSummary,
  MttqUyVienDiemDanhSummary,
} from '../core/types';
import { MTTQ_KY_HOP_MOCK } from '../mock-data';

function rowFromDb(row: Record<string, unknown>): MttqDiemDanhUyVien {
  return {
    id: String(row.id),
    ky_hop_id: String(row.ky_hop_id ?? ''),
    uy_vien_id: String(row.uy_vien_id ?? ''),
    trang_thai: row.trang_thai === 'Vắng mặt' ? 'Vắng mặt' : 'Có mặt',
    ghi_chu: row.ghi_chu == null || String(row.ghi_chu).trim() === '' ? null : String(row.ghi_chu),
  };
}

/** Mock in-memory rows khi không dùng Supabase. */
let mockDiemDanhRows: MttqDiemDanhUyVien[] = [];
let mockNextId = 1;

export async function getDiemDanhForKyHop(kyHopId: string): Promise<MttqDiemDanhUyVien[]> {
  const id = kyHopId.trim();
  if (!id) return [];

  if (!isSupabase()) {
    return mockDiemDanhRows.filter((r) => r.ky_hop_id === id).map((r) => ({ ...r }));
  }

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('mttq_diem_danh_uy_vien')
    .select('id, ky_hop_id, uy_vien_id, trang_thai, ghi_chu')
    .eq('ky_hop_id', id)
    .limit(2000);

  if (error) handleSupabaseError(error);
  return (data ?? []).map((row) => rowFromDb(row as unknown as Record<string, unknown>));
}

/**
 * Dữ liệu điểm danh cho ma trận (tất cả kỳ họp trong một nhiệm kỳ).
 * Dùng RPC `get_diem_danh_for_nhiem_ky` thay vì 2 queries riêng lẻ:
 *  - Trước: SELECT id FROM mttq_ky_hop + SELECT ... FROM mttq_diem_danh_uy_vien .in(...)
 *  - Sau: 1 RPC JOIN, trả về chỉ 3 cột cần thiết (giảm ~40% payload).
 */
export async function getDiemDanhForNhiemKy(nhiemKyId: string): Promise<MttqDiemDanhMatrixRow[]> {
  const nk = nhiemKyId.trim();
  if (!nk) return [];

  if (!isSupabase()) {
    const khIds = new Set(MTTQ_KY_HOP_MOCK.filter((k) => String(k.nhiem_ky_id) === nk).map((k) => k.id));
    return mockDiemDanhRows
      .filter((r) => khIds.has(r.ky_hop_id))
      .map((r) => ({ ky_hop_id: r.ky_hop_id, uy_vien_id: r.uy_vien_id, trang_thai: r.trang_thai }));
  }

  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_diem_danh_for_nhiem_ky', { p_nhiem_ky_id: nk });

  if (error) handleSupabaseError(error);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ky_hop_id: String(row.ky_hop_id ?? ''),
    uy_vien_id: String(row.uy_vien_id ?? ''),
    trang_thai: row.trang_thai === 'Vắng mặt' ? 'Vắng mặt' : ('Có mặt' as MttqDiemDanhTrangThai),
  }));
}

export async function upsertDiemDanh(params: {
  kyHopId: string;
  uyVienId: string;
  trangThai: MttqDiemDanhTrangThai;
  idNguoiTao: string;
}): Promise<MttqDiemDanhUyVien> {
  const ky_hop_id = params.kyHopId.trim();
  const uy_vien_id = params.uyVienId.trim();
  const id_nguoi_tao = params.idNguoiTao.trim();
  if (!ky_hop_id || !uy_vien_id) throw new Error(txt('matTranKyHop.diemDanh.saveFailed'));
  if (!id_nguoi_tao) throw new Error(txt('matTranKyHop.diemDanh.noEmployeeProfile'));

  if (!isSupabase()) {
    const idx = mockDiemDanhRows.findIndex((r) => r.ky_hop_id === ky_hop_id && r.uy_vien_id === uy_vien_id);
    const next: MttqDiemDanhUyVien = {
      id: idx >= 0 ? mockDiemDanhRows[idx].id : String(mockNextId++),
      ky_hop_id,
      uy_vien_id,
      trang_thai: params.trangThai,
      ghi_chu: null,
    };
    if (idx >= 0) mockDiemDanhRows[idx] = next;
    else mockDiemDanhRows.push(next);
    return { ...next };
  }

  const supabase = getSupabase();
  if (!supabase) throw new Error(txt('matTranKyHop.diemDanh.saveFailed'));

  const { data, error } = await supabase
    .from('mttq_diem_danh_uy_vien')
    .upsert(
      {
        ky_hop_id,
        uy_vien_id,
        trang_thai: params.trangThai,
        id_nguoi_tao,
      },
      { onConflict: 'ky_hop_id,uy_vien_id' },
    )
    .select('id, ky_hop_id, uy_vien_id, trang_thai, ghi_chu')
    .single();

  if (error) handleSupabaseError(error);
  if (!data) throw new Error(txt('matTranKyHop.diemDanh.saveFailed'));
  return rowFromDb(data as unknown as Record<string, unknown>);
}

/** Tóm tắt điểm danh theo nhiều kỳ họp (view hoặc mock). */
export async function getDiemDanhSummariesForKyHopIds(kyHopIds: string[]): Promise<Map<string, MttqKyHopDiemDanhSummary>> {
  const uniq = [...new Set(kyHopIds.map((x) => x.trim()).filter(Boolean))];
  const empty = new Map<string, MttqKyHopDiemDanhSummary>();
  if (uniq.length === 0) return empty;

  if (!isSupabase()) {
    const m = new Map<string, MttqKyHopDiemDanhSummary>();
    for (const id of uniq) {
      const kh = MTTQ_KY_HOP_MOCK.find((k) => k.id === id);
      const nk = kh?.nhiem_ky_id ?? '';
      const slUyVien = nk ? MTTQ_UY_VIEN_UY_BAN_MOCK.filter((u) => u.nhiem_ky_id === nk).length : 0;
      const diem = mockDiemDanhRows.filter((r) => r.ky_hop_id === id);
      const co = diem.filter((d) => d.trang_thai === 'Có mặt').length;
      const vang = diem.filter((d) => d.trang_thai === 'Vắng mặt').length;
      const tong = diem.length;
      m.set(id, {
        ky_hop_id: id,
        co_mat: co,
        vang_mat: vang,
        chua_diem_danh: Math.max(0, slUyVien - tong),
      });
    }
    return m;
  }

  const supabase = getSupabase();
  if (!supabase) return empty;

  const { data, error } = await supabase
    .from('v_diem_danh_ky_hop_summary')
    .select('ky_hop_id, co_mat, vang_mat, chua_diem_danh')
    .in('ky_hop_id', uniq);

  if (error) handleSupabaseError(error);

  const m = new Map<string, MttqKyHopDiemDanhSummary>();
  for (const row of data ?? []) {
    const r = row as Record<string, unknown>;
    const hid = String(r.ky_hop_id ?? '');
    m.set(hid, {
      ky_hop_id: hid,
      co_mat: Number(r.co_mat ?? 0),
      vang_mat: Number(r.vang_mat ?? 0),
      chua_diem_danh: Number(r.chua_diem_danh ?? 0),
    });
  }

  for (const id of uniq) {
    if (!m.has(id)) {
      m.set(id, { ky_hop_id: id, co_mat: 0, vang_mat: 0, chua_diem_danh: 0 });
    }
  }
  return m;
}

function mapUyVienDiemDanhSummaryRows(
  rows: readonly Record<string, unknown>[],
  uniq: string[],
): Map<string, MttqUyVienDiemDanhSummary> {
  const m = new Map<string, MttqUyVienDiemDanhSummary>();
  for (const row of rows) {
    const vid = String(row.uy_vien_id ?? '');
    m.set(vid, {
      uy_vien_id: vid,
      so_ky_hop: Number(row.so_ky_hop ?? 0),
      co_mat: Number(row.co_mat ?? 0),
      vang_mat: Number(row.vang_mat ?? 0),
      chua_diem_danh: Number(row.chua_diem_danh ?? 0),
    });
  }
  for (const id of uniq) {
    if (!m.has(id)) {
      m.set(id, { uy_vien_id: id, so_ky_hop: 0, co_mat: 0, vang_mat: 0, chua_diem_danh: 0 });
    }
  }
  return m;
}

/** Tóm tắt điểm danh theo nhiều ủy viên (view hoặc mock). */
export async function getUyVienDiemDanhSummariesForIds(
  uyVienIds: string[],
  donViId?: string | null,
): Promise<Map<string, MttqUyVienDiemDanhSummary>> {
  const uniq = [...new Set(uyVienIds.map((x) => x.trim()).filter(Boolean))];
  const empty = new Map<string, MttqUyVienDiemDanhSummary>();
  if (uniq.length === 0) return empty;

  const scopedDonViId = donViId?.toString().trim() || null;

  if (!isSupabase()) {
    const m = new Map<string, MttqUyVienDiemDanhSummary>();
    for (const uid of uniq) {
      const uv = MTTQ_UY_VIEN_UY_BAN_MOCK.find((u) => u.id === uid);
      if (!uv) {
        m.set(uid, { uy_vien_id: uid, so_ky_hop: 0, co_mat: 0, vang_mat: 0, chua_diem_danh: 0 });
        continue;
      }
      const nk = uv.nhiem_ky_id;
      const khList = MTTQ_KY_HOP_MOCK.filter((k) => {
        if (String(k.nhiem_ky_id) !== nk) return false;
        if (scopedDonViId) return String(k.don_vi_id ?? '') === scopedDonViId;
        return true;
      });
      let co = 0;
      let vang = 0;
      for (const kh of khList) {
        const d = mockDiemDanhRows.find((r) => r.ky_hop_id === kh.id && r.uy_vien_id === uid);
        if (d?.trang_thai === 'Có mặt') co += 1;
        else if (d?.trang_thai === 'Vắng mặt') vang += 1;
      }
      const so = khList.length;
      m.set(uid, {
        uy_vien_id: uid,
        so_ky_hop: so,
        co_mat: co,
        vang_mat: vang,
        chua_diem_danh: Math.max(0, so - co - vang),
      });
    }
    return m;
  }

  const supabase = getSupabase();
  if (!supabase) return empty;

  if (scopedDonViId) {
    const { data, error } = await supabase.rpc('get_uy_vien_diem_danh_summary_for_don_vi', {
      p_uy_vien_ids: uniq.map(Number),
      p_don_vi_id: Number(scopedDonViId),
    });
    if (error) handleSupabaseError(error);
    return mapUyVienDiemDanhSummaryRows((data ?? []) as Record<string, unknown>[], uniq);
  }

  const { data, error } = await supabase
    .from('v_diem_danh_uy_vien_summary')
    .select('uy_vien_id, so_ky_hop, co_mat, vang_mat, chua_diem_danh')
    .in('uy_vien_id', uniq);

  if (error) handleSupabaseError(error);
  return mapUyVienDiemDanhSummaryRows((data ?? []) as Record<string, unknown>[], uniq);
}
