import { describe, expect, it } from 'vitest';
import type { KhoDonViCuuTroListRow } from '../core/types';
import {
  NHOM_KHONG_DOT,
  buildNhomUngHoOptions,
  ganUngHoVaoDanhSach,
  nhanNhomUngHo,
  nhomUngHoCuaDonVi,
  tongHopUngHoTheoDonVi,
  type DonViCuuTroUngHoNhom,
} from './ung-ho-nhom';

const g = (donViId: string, nhomKey: string, tienMat: number, hienVat: number, soLuot = 1, nhomTen: string | null = null): DonViCuuTroUngHoNhom => ({
  donViId,
  nguon: nhomKey.startsWith('dot:') ? 'kho' : 'chuong_trinh',
  nhomKey,
  nhomTen,
  tienMat,
  hienVat,
  soLuot,
});

const ROWS = [
  g('1', 'dot:7', 0, 300, 2, 'Bão Yagi'),
  g('1', 'nd:tết', 100, 50, 3, 'Tết'),
  g('2', NHOM_KHONG_DOT, 0, 80),
  g('2', 'nd:tết', 20, 0, 1, 'Tết'),
];

describe('tongHopUngHoTheoDonVi', () => {
  it('không chọn nhóm: cộng mọi nhóm, tách tiền mặt / hiện vật', () => {
    const m = tongHopUngHoTheoDonVi(ROWS);
    expect(m.get('1')).toEqual({ tienMat: 100, hienVat: 350, tong: 450, soLuot: 5 });
    expect(m.get('2')).toEqual({ tienMat: 20, hienVat: 80, tong: 100, soLuot: 2 });
  });

  it('chọn một đợt: chỉ cộng trong đợt đó, đơn vị không góp đợt đó vắng mặt', () => {
    const m = tongHopUngHoTheoDonVi(ROWS, ['dot:7']);
    expect(m.get('1')).toEqual({ tienMat: 0, hienVat: 300, tong: 300, soLuot: 2 });
    expect(m.has('2')).toBe(false);
  });

  it('chọn nhiều nhóm thì cộng các nhóm đã chọn', () => {
    expect(tongHopUngHoTheoDonVi(ROWS, ['nd:tết', NHOM_KHONG_DOT]).get('2')?.tong).toBe(100);
  });
});

describe('ganUngHoVaoDanhSach', () => {
  const dv = (id: string) => ({ id }) as KhoDonViCuuTroListRow;

  it('đơn vị không phát sinh = 0 khi đã tải', () => {
    const out = ganUngHoVaoDanhSach([dv('1'), dv('9')], tongHopUngHoTheoDonVi(ROWS), true);
    expect(out.map((r) => [r.tien_mat_ung_ho, r.hien_vat_ung_ho, r.ket_qua_ung_ho])).toEqual([
      [100, 350, 450],
      [0, 0, 0],
    ]);
  });

  it('chưa tải thì để null, không hiện 0 đồng giả', () => {
    const [r] = ganUngHoVaoDanhSach([dv('1')], new Map(), false);
    expect(r.ket_qua_ung_ho).toBeNull();
    expect(r.tien_mat_ung_ho).toBeNull();
  });
});

describe('nhãn và thứ tự nhóm', () => {
  it('nhãn theo loại nhóm', () => {
    expect(nhanNhomUngHo('dot:7', 'Bão Yagi')).toBe('Chương trình: Bão Yagi');
    expect(nhanNhomUngHo(NHOM_KHONG_DOT, null)).toBe('Chưa gắn chương trình');
    expect(nhanNhomUngHo('nd:tết', 'Tết')).toBe('Nội dung: Tết');
  });

  it('chip lọc: đợt trước, "chưa gắn đợt" sau các đợt, nội dung cuối; đếm số đơn vị', () => {
    expect(buildNhomUngHoOptions(ROWS)).toEqual([
      { value: 'dot:7', label: 'Chương trình: Bão Yagi', count: 1 },
      { value: NHOM_KHONG_DOT, label: 'Chưa gắn chương trình', count: 1 },
      { value: 'nd:tết', label: 'Nội dung: Tết', count: 2 },
    ]);
  });

  it('bảng của một đơn vị chỉ lấy nhóm của đơn vị đó', () => {
    expect(nhomUngHoCuaDonVi(ROWS, '1').map((r) => [r.nhan, r.tong])).toEqual([
      ['Chương trình: Bão Yagi', 300],
      ['Nội dung: Tết', 150],
    ]);
    expect(nhomUngHoCuaDonVi(ROWS, null)).toEqual([]);
  });

  it('phiếu kho và khoản tiếp nhận cùng chương trình gộp về một dòng', () => {
    const gop = nhomUngHoCuaDonVi(
      [
        { donViId: '9', nguon: 'kho', nhomKey: 'dot:3', nhomTen: 'Bão số 1', tienMat: 0, hienVat: 400, soLuot: 1 },
        { donViId: '9', nguon: 'tiep_nhan', nhomKey: 'dot:3', nhomTen: 'Bão số 1', tienMat: 1000, hienVat: 0, soLuot: 2 },
      ],
      '9',
    );
    expect(gop).toHaveLength(1);
    expect(gop[0]).toMatchObject({ tienMat: 1000, hienVat: 400, tong: 1400, soLuot: 3 });
  });
});
