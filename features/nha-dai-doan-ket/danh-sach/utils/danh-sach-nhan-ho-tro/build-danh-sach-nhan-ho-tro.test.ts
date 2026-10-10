import { describe, expect, it } from 'vitest';
import type { BienBanBlock } from '@/lib/bien-ban/bien-ban-model';
import { bienBanToSheet } from '@/lib/bien-ban/download-bien-ban-xlsx';
import {
  buildDanhSachNhanHoTro,
  dongCoQuan,
  sapXepDong,
  tachTheoLinhVuc,
  tieuDeTheoLinhVuc,
  type DongNhanHoTro,
} from './build-danh-sach-nhan-ho-tro';

function dong(p: Partial<DongNhanHoTro>): DongNhanHoTro {
  return {
    hoTen: 'Nguyễn Văn A',
    soCccd: null,
    noiDung: 'Xây nhà',
    xaPhuongId: '1',
    tenXaPhuong: 'Môn Sơn',
    khoiXom: 'Tân Hợp',
    doiTuong: 'Hộ nghèo',
    loaiHinh: 'Xây mới',
    nguonHoTro: 'Cấp tỉnh',
    soTien: 60_000_000,
    ...p,
  };
}

const bang = (blocks: BienBanBlock[]) =>
  blocks.filter((b): b is Extract<BienBanBlock, { kind: 'bang' }> => b.kind === 'bang');

describe('dongCoQuan', () => {
  it('một xã ⇒ tên xã in hoa; nhiều xã hoặc xã trống ⇒ cấp tỉnh', () => {
    expect(dongCoQuan([dong({}), dong({})])).toBe('UỶ BAN MTTQ VIỆT NAM XÃ MÔN SƠN');
    expect(dongCoQuan([dong({ tenXaPhuong: 'Phường Vinh Phú' })])).toBe(
      'UỶ BAN MTTQ VIỆT NAM PHƯỜNG VINH PHÚ',
    );
    expect(dongCoQuan([dong({}), dong({ xaPhuongId: '2', tenXaPhuong: 'Lạng Sơn' })])).toBe(
      'UỶ BAN MTTQ VIỆT NAM TỈNH NGHỆ AN',
    );
    expect(dongCoQuan([dong({ xaPhuongId: null, tenXaPhuong: null })])).toBe(
      'UỶ BAN MTTQ VIỆT NAM TỈNH NGHỆ AN',
    );
  });
});

describe('sapXepDong', () => {
  it('xã → khối xóm (số tự nhiên) → họ tên, ô trống cuối', () => {
    const out = sapXepDong([
      dong({ hoTen: 'B', khoiXom: 'Xóm 10' }),
      dong({ hoTen: 'C', tenXaPhuong: null }),
      dong({ hoTen: 'A', khoiXom: 'Xóm 2' }),
      dong({ hoTen: 'D', khoiXom: 'Xóm 2' }),
    ]);
    expect(out.map((d) => d.hoTen)).toEqual(['A', 'D', 'B', 'C']);
  });
});

describe('tachTheoLinhVuc', () => {
  it('theo thứ tự danh mục, lĩnh vực trống cuối', () => {
    const rows = [{ lv: 'Cứu trợ' }, { lv: null }, { lv: 'Tết vì người nghèo' }, { lv: 'Cứu trợ' }];
    const out = tachTheoLinhVuc(rows, (r) => r.lv, ['Tết vì người nghèo', 'Cứu trợ']);
    expect(out.map((n) => [n.linhVuc, n.rows.length])).toEqual([
      ['Tết vì người nghèo', 1],
      ['Cứu trợ', 2],
      [null, 1],
    ]);
    expect(tieuDeTheoLinhVuc('Tết vì người nghèo')).toBe('DANH SÁCH NHẬN HỖ TRỢ TẾT VÌ NGƯỜI NGHÈO');
    expect(tieuDeTheoLinhVuc(null)).toBe('DANH SÁCH NHẬN HỖ TRỢ');
  });
});

describe('buildDanhSachNhanHoTro', () => {
  const model = buildDanhSachNhanHoTro({
    tieuDe: 'x',
    ngayIso: '2026-10-10',
    nhom: [
      {
        tieuDe: 'DANH SÁCH A',
        dong: [dong({ soCccd: '040123456789' }), dong({ hoTen: 'Trần B', soTien: 5_500_000 })],
      },
      { tieuDe: 'DANH SÁCH RỖNG', dong: [] },
      { tieuDe: 'DANH SÁCH C', dong: [dong({ soTien: null })] },
    ],
  });

  it('khổ ngang, nhóm rỗng bị bỏ, giữa các bản có ngắt trang', () => {
    expect(model.khoGiay).toBe('ngang');
    expect(model.blocks.filter((b) => b.kind === 'ngat-trang')).toHaveLength(1);
    expect(bang(model.blocks)).toHaveLength(2);
  });

  it('dòng dữ liệu đủ 11 ô; CCCD thiếu ⇒ ô trống; tổng + bằng chữ đúng', () => {
    const [b1, b2] = bang(model.blocks);
    expect(b1.rows[0]).toEqual([
      '1', 'Nguyễn Văn A', '040123456789', 'Xây nhà', 'Môn Sơn', 'Tân Hợp',
      'Hộ nghèo', 'Xây mới', 'Cấp tỉnh', '60.000.000', '',
    ]);
    expect(b1.rows[1][2]).toBe('');
    expect(b1.footer?.cells).toHaveLength(b1.cols.length - (b1.footer?.span ?? 1) + 1);
    expect(b1.footer?.cells.at(-2)).toBe('65.500.000');
    expect(b2.footer?.cells.at(-2)).toBe('0');

    const text = JSON.stringify(model.blocks);
    expect(text).toContain('Sáu mươi lăm triệu năm trăm nghìn đồng');
    expect(text).toContain('Môn Sơn, ngày 10 tháng 10 năm 2026');
    expect(text).toContain('TM. BAN THƯỜNG TRỰC\\nCHỦ TỊCH');
  });

  it('Excel: mỗi ô bảng một cột, dòng Tổng thẳng cột Số tiền', () => {
    const { aoa, colWidths } = bienBanToSheet(model);
    expect(colWidths).toHaveLength(11);
    const header = aoa.find((r) => r[0] === 'STT');
    expect(header).toHaveLength(11);
    const tong = aoa.find((r) => r[0] === 'Tổng');
    expect(tong?.[9]).toBe('65.500.000');
  });
});
