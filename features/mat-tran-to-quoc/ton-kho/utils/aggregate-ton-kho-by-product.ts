import type { TonKhoDisplayRow, TonKhoProductAgg } from '../core/types';

export function aggregateTonKhoByProduct(rows: TonKhoDisplayRow[]): TonKhoProductAgg[] {
  const map = new Map<string, TonKhoDisplayRow[]>();
  rows.forEach((r) => {
    const id = String(r.hang_hoa_id);
    const arr = map.get(id);
    if (arr) arr.push(r);
    else map.set(id, [r]);
  });
  const out: TonKhoProductAgg[] = [];
  map.forEach((list, hang_hoa_id) => {
    const first = list[0];
    let tong = 0;
    let khoCoTon = 0;
    for (const r of list) {
      const q = Number(r.ton_kho) || 0;
      tong += q;
      if (q > 0) khoCoTon += 1;
    }
    out.push({
      hang_hoa_id,
      ten_hang_hoa: first.ten_hang_hoa,
      ten_danh_muc: first.ten_danh_muc,
      id_danh_muc: first.id_danh_muc ?? null,
      don_vi_tinh: first.don_vi_tinh,
      tong_so_luong: tong,
      so_kho_co_ton: khoCoTon,
      rows: list,
    });
  });
  out.sort((a, b) => b.tong_so_luong - a.tong_so_luong || a.ten_hang_hoa.localeCompare(b.ten_hang_hoa, 'vi'));
  return out;
}
