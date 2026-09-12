import { describe, expect, it } from 'vitest';
import {
  applyXaCountDelta,
  applyXaRowToCache,
  readXaCacheScope,
  removeTinhFromList,
  removeXaRowsFromCache,
  sortXaList,
  upsertTinhInList,
} from './use-dia-ban';
import type { TinhThanh, XaPhuong } from '../core/types';

function xa(id: string, idTinh: string, thuTu: number, ten = `Xa ${id}`): XaPhuong {
  return {
    id,
    id_tinh_thanh: idTinh,
    ten,
    thu_tu: thuTu,
    tg_tao: '2026-01-01',
    tg_cap_nhat: '2026-01-01',
  };
}

function tinh(id: string, thuTu: number, soXa?: number): TinhThanh {
  return {
    id,
    ten: `Tinh ${id}`,
    thu_tu: thuTu,
    tg_tao: '2026-01-01',
    tg_cap_nhat: '2026-01-01',
    ...(soXa === undefined ? {} : { so_xa_phuong: soXa }),
  };
}

describe('readXaCacheScope', () => {
  it('nhan dien key toan bo va key theo tinh', () => {
    expect(readXaCacheScope(['xa-phuong', 'list-all'])).toEqual({ kind: 'all' });
    expect(readXaCacheScope(['xa-phuong', 'by-tinh', '7'])).toEqual({
      kind: 'tinh',
      idTinhThanh: '7',
    });
  });

  it('bo qua key la', () => {
    expect(readXaCacheScope(['xa-phuong'])).toBeNull();
    expect(readXaCacheScope(['tinh-thanh'])).toBeNull();
    expect(readXaCacheScope(['xa-phuong', 'by-tinh'])).toBeNull();
  });
});

describe('sortXaList', () => {
  it('scope toan bo: sap theo id tinh (so) roi thu tu', () => {
    const list = [xa('3', '10', 1), xa('1', '2', 5), xa('2', '2', 1)];
    expect(sortXaList(list, { kind: 'all' }).map((r) => r.id)).toEqual(['2', '1', '3']);
  });

  it('scope theo tinh: chi sap theo thu tu, khoa chinh chot cuoi', () => {
    const list = [xa('9', '2', 1), xa('4', '2', 1), xa('7', '2', 0)];
    expect(sortXaList(list, { kind: 'tinh', idTinhThanh: '2' }).map((r) => r.id)).toEqual([
      '7',
      '4',
      '9',
    ]);
  });
});

describe('applyXaRowToCache', () => {
  it('them xa moi vao dung vi tri cua cache toan bo', () => {
    const list = [xa('1', '2', 1), xa('3', '5', 1)];
    const next = applyXaRowToCache(list, xa('2', '2', 2), { kind: 'all' });
    expect(next.map((r) => r.id)).toEqual(['1', '2', '3']);
  });

  it('thay the ban ghi cu cung id thay vi nhan doi', () => {
    const list = [xa('1', '2', 1, 'Ten cu'), xa('2', '2', 2)];
    const next = applyXaRowToCache(list, xa('1', '2', 1, 'Ten moi'), {
      kind: 'tinh',
      idTinhThanh: '2',
    });
    expect(next).toHaveLength(2);
    expect(next.find((r) => r.id === '1')?.ten).toBe('Ten moi');
  });

  it('xa doi tinh: roi khoi cache tinh cu, vao cache tinh moi', () => {
    const cacheTinhCu = [xa('1', '2', 1), xa('2', '2', 2)];
    const cacheTinhMoi = [xa('9', '5', 1)];
    const moved = xa('1', '5', 0);

    const sauTinhCu = applyXaRowToCache(cacheTinhCu, moved, { kind: 'tinh', idTinhThanh: '2' });
    expect(sauTinhCu.map((r) => r.id)).toEqual(['2']);

    const sauTinhMoi = applyXaRowToCache(cacheTinhMoi, moved, { kind: 'tinh', idTinhThanh: '5' });
    expect(sauTinhMoi.map((r) => r.id)).toEqual(['1', '9']);
  });

  it('khong doi tham chieu khi cache khong lien quan', () => {
    const list = [xa('1', '2', 1)];
    expect(applyXaRowToCache(list, xa('9', '5', 1), { kind: 'tinh', idTinhThanh: '2' })).toBe(list);
  });
});

describe('removeXaRowsFromCache', () => {
  it('bo dung cac id da xoa', () => {
    const list = [xa('1', '2', 1), xa('2', '2', 2), xa('3', '2', 3)];
    expect(removeXaRowsFromCache(list, new Set(['1', '3'])).map((r) => r.id)).toEqual(['2']);
  });

  it('giu nguyen tham chieu khi khong co gi bi xoa', () => {
    const list = [xa('1', '2', 1)];
    expect(removeXaRowsFromCache(list, new Set(['9']))).toBe(list);
  });
});

describe('applyXaCountDelta', () => {
  it('cong tru so xa theo tung tinh', () => {
    const list = [tinh('2', 1, 10), tinh('5', 2, 3)];
    const next = applyXaCountDelta(list, new Map([['2', -1], ['5', 1]]));
    expect(next.map((t) => t.so_xa_phuong)).toEqual([9, 4]);
  });

  it('khong cho am va bo qua tinh khong co delta', () => {
    const list = [tinh('2', 1, 0), tinh('5', 2, 4)];
    const next = applyXaCountDelta(list, new Map([['2', -3]]));
    expect(next[0].so_xa_phuong).toBe(0);
    expect(next[1]).toBe(list[1]);
  });

  it('map rong thi tra ve chinh danh sach cu', () => {
    const list = [tinh('2', 1, 5)];
    expect(applyXaCountDelta(list, new Map())).toBe(list);
  });
});

describe('upsertTinhInList', () => {
  it('giu so_xa_phuong cu khi sua tinh (ban cap nhat khong kem so xa)', () => {
    const list = [tinh('2', 1, 12), tinh('5', 2, 3)];
    const updated: TinhThanh = { ...tinh('2', 1), ten: 'Ten moi' };
    const next = upsertTinhInList(list, updated);
    expect(next.find((t) => t.id === '2')).toMatchObject({ ten: 'Ten moi', so_xa_phuong: 12 });
    expect(next).toHaveLength(2);
  });

  it('them tinh moi vao dung thu tu', () => {
    const list = [tinh('2', 1, 12), tinh('5', 3, 3)];
    const next = upsertTinhInList(list, { ...tinh('9', 2), so_xa_phuong: 0 });
    expect(next.map((t) => t.id)).toEqual(['2', '9', '5']);
  });
});

describe('removeTinhFromList', () => {
  it('bo tinh da xoa, giu tham chieu khi khong doi', () => {
    const list = [tinh('2', 1, 1), tinh('5', 2, 1)];
    expect(removeTinhFromList(list, new Set(['5'])).map((t) => t.id)).toEqual(['2']);
    expect(removeTinhFromList(list, new Set(['99']))).toBe(list);
  });
});
