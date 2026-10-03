import { describe, expect, it } from 'vitest';
import type { NhapXuatKhoCtFlatRow } from '../../nhap-xuat-kho/core/types';
import type { TonKhoRecord } from '../../ton-kho/core/types';
import { scopeReliefSupportData } from './aggregate-kho-ho-tro-stats';

const line = (id: string, kho_nhap_id: string | null, kho_xuat_id: string | null) =>
  ({ id, kho_nhap_id, kho_xuat_id }) as unknown as NhapXuatKhoCtFlatRow;
const ton = (kho_id: string) => ({ kho_id, hang_hoa_id: 'h1', ton_kho: 5 }) as unknown as TonKhoRecord;

const LINES = [
  line('nhap-a', 'kA', null),
  line('xuat-b', null, 'kB'),
  line('chuyen-a-b', 'kB', 'kA'),
];
const TON = [ton('kA'), ton('kB')];

describe('scopeReliefSupportData', () => {
  it('không giới hạn ⇒ giữ nguyên', () => {
    const r = scopeReliefSupportData(LINES, TON, null);
    expect(r.flatLines).toHaveLength(3);
    expect(r.tonMatrix).toHaveLength(2);
  });

  it('xã A ⇒ phiếu của kho A, kể cả chuyển kho sang xã khác; tồn chỉ kho A', () => {
    const r = scopeReliefSupportData(LINES, TON, ['kA']);
    expect(r.flatLines.map((l) => l.id)).toEqual(['nhap-a', 'chuyen-a-b']);
    expect(r.tonMatrix.map((t) => t.kho_id)).toEqual(['kA']);
  });

  it('xã B nhận hàng chuyển kho ⇒ thấy phiếu chuyển', () => {
    const r = scopeReliefSupportData(LINES, TON, ['kB']);
    expect(r.flatLines.map((l) => l.id)).toEqual(['xuat-b', 'chuyen-a-b']);
  });

  it('phạm vi rỗng ⇒ không còn số liệu nào', () => {
    const r = scopeReliefSupportData(LINES, TON, []);
    expect(r.flatLines).toEqual([]);
    expect(r.tonMatrix).toEqual([]);
  });
});
