import type { TonKhoPTDisplayRow, TonKhoPTProductAgg } from '../core/types';

export function aggregateTonKhoPTByProduct(rows: TonKhoPTDisplayRow[]): TonKhoPTProductAgg[] {
  const map = new Map<string, TonKhoPTDisplayRow[]>();
  rows.forEach((r) => {
    const id = String(r.id_hang_hoa);
    const arr = map.get(id);
    if (arr) arr.push(r);
    else map.set(id, [r]);
  });
  const out: TonKhoPTProductAgg[] = [];
  map.forEach((list, id_hang_hoa) => {
    const first = list[0];
    let tong = 0;
    let khoCoTon = 0;
    for (const r of list) {
      const q = Number(r.so_luong) || 0;
      tong += q;
      if (q > 0) khoCoTon += 1;
    }
    out.push({
      id_hang_hoa,
      ma_hang: first.ma_hang,
      ten_hang: first.ten_hang,
      ten_danh_muc: first.ten_danh_muc,
      danh_muc_id: first.danh_muc_id ?? null,
      don_vi_tinh: first.don_vi_tinh,
      tong_so_luong: tong,
      so_kho_co_ton: khoCoTon,
      rows: list,
    });
  });
  out.sort((a, b) => b.tong_so_luong - a.tong_so_luong || a.ma_hang.localeCompare(b.ma_hang));
  return out;
}
