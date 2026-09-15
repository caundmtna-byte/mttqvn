import { describe, expect, it } from 'vitest';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';
import { buildNhuanButSheets, type NhuanButExportInput } from './export-nhuan-but';

const base = (over: Partial<BaiVietDanhSach>): BaiVietDanhSach => ({
  id: '1',
  ten_bai: 'A',
  id_the_loai: 'tl1',
  ten_the_loai: 'Tin',
  don_gia: 100_000,
  ngay_dang: '2026-05-01',
  id_nguon_dang: '20',
  ten_nguon_dang: 'Biên tập',
  id_trang_dang: '30',
  ten_trang_dang: 'Zalo OA',
  link: 'https://x.test/1',
  id_nguoi_tao: '40',
  ho_va_ten_nguoi_tao: 'An',
  ten_tai_khoan_nguoi_tao: null,
  id_don_vi_nguoi_tao: '1',
  ten_don_vi_nguoi_tao: 'Xã A',
  tg_tao: '',
  tg_cap_nhat: '',
  ...over,
});

const rows = [
  base({ id: '1' }),
  base({ id: '2', ten_bai: 'B', don_gia: 200_000 }),
  base({
    id: '3',
    ten_bai: 'C',
    don_gia: 300_000,
    id_the_loai: 'tl2',
    ten_the_loai: 'Bài viết',
    id_nguoi_tao: '41',
    ho_va_ten_nguoi_tao: 'Bình',
    id_don_vi_nguoi_tao: '2',
    ten_don_vi_nguoi_tao: 'Xã B',
  }),
  base({
    id: '4',
    ten_bai: 'D',
    don_gia: 400_000,
    id_nguoi_tao: '42',
    ho_va_ten_nguoi_tao: 'Cúc',
    id_don_vi_nguoi_tao: null,
    ten_don_vi_nguoi_tao: null,
  }),
];

const TONG = 1_000_000;

function buildInput(over: Partial<NhuanButExportInput> = {}): NhuanButExportInput {
  return {
    rows,
    scopeLabel: 'Tất cả',
    range: { start: '2026-05-01', end: '2026-05-31' },
    activeFilters: [{ label: 'Thể loại', value: 'Tin' }],
    seriesByMonth: [{ key: '2026-05', label: '05/2026', total: TONG, count: 4 }],
    ...over,
  };
}

const sheetNamed = (input: NhuanButExportInput, name: string) =>
  buildNhuanButSheets(input).find((s) => s.name === name)!;

describe('buildNhuanButSheets', () => {
  it('ra đủ 8 sheet theo đúng thứ tự', () => {
    expect(buildNhuanButSheets(buildInput()).map((s) => s.name)).toEqual([
      'Tong hop',
      'Theo don vi',
      'Theo the loai',
      'Theo nguon dang',
      'Theo trang dang',
      'Theo nguoi viet',
      'Theo thoi gian',
      'Chi tiet',
    ]);
  });

  it('mọi sheet gộp có cột Số tiền và không sheet nào có cột Tỷ trọng', () => {
    const sheets = buildNhuanButSheets(buildInput());
    const keys = sheets.flatMap((s) => s.rows.flatMap((r) => Object.keys(r)));
    expect(keys).not.toContain('Tỷ trọng');
    for (const name of [
      'Theo don vi',
      'Theo the loai',
      'Theo nguon dang',
      'Theo trang dang',
      'Theo nguoi viet',
      'Theo thoi gian',
      'Chi tiet',
    ]) {
      expect(Object.keys(sheetNamed(buildInput(), name).rows[0])).toContain('Số tiền');
    }
  });

  it('tiền cộng theo đơn vị khớp tổng, gồm cả người chưa gán đơn vị', () => {
    const sheet = sheetNamed(buildInput(), 'Theo don vi');
    const byDonVi = new Map(sheet.rows.map((r) => [String(r['Đơn vị']), Number(r['Số tiền'])]));
    expect(byDonVi.get('Xã A')).toBe(300_000);
    expect(byDonVi.get('Xã B')).toBe(300_000);
    expect(byDonVi.get('Chưa gán đơn vị')).toBe(400_000);
    expect(byDonVi.get('Tổng cộng')).toBe(TONG);
    // Dòng Tổng cộng đúng bằng tổng các dòng trên nó — không đơn vị nào bị rơi.
    expect(sheet.rows.slice(0, -1).reduce((s, r) => s + Number(r['Số tiền']), 0)).toBe(TONG);
  });

  it('tiền cộng theo thể loại và theo người viết đều khớp tổng', () => {
    const theLoai = sheetNamed(buildInput(), 'Theo the loai');
    expect(theLoai.rows.slice(0, -1).reduce((s, r) => s + Number(r['Số tiền']), 0)).toBe(TONG);

    const nguoiViet = sheetNamed(buildInput(), 'Theo nguoi viet');
    expect(nguoiViet.rows.slice(0, -1).reduce((s, r) => s + Number(r['Số tiền']), 0)).toBe(TONG);
    const binh = nguoiViet.rows.find((r) => r['Người viết'] === 'Bình')!;
    expect(binh['Đơn vị']).toBe('Xã B');
    expect(binh['Số tiền']).toBe(300_000);
  });

  it('hai người trùng tên vẫn tách đúng đơn vị của từng người', () => {
    const trungTen = [
      base({ id: '1', id_nguoi_tao: '50', ho_va_ten_nguoi_tao: 'An', ten_don_vi_nguoi_tao: 'Xã A', id_don_vi_nguoi_tao: '1' }),
      base({ id: '2', id_nguoi_tao: '51', ho_va_ten_nguoi_tao: 'An', ten_don_vi_nguoi_tao: 'Xã B', id_don_vi_nguoi_tao: '2', don_gia: 500_000 }),
    ];
    const sheet = sheetNamed(buildInput({ rows: trungTen }), 'Theo nguoi viet');
    const donVis = sheet.rows.slice(0, -1).map((r) => r['Đơn vị']);
    expect(donVis).toContain('Xã A');
    expect(donVis).toContain('Xã B');
  });

  it('sheet Tổng hợp ghi tổng tiền, phạm vi, khoảng ngày và bộ lọc đang áp', () => {
    const sheet = sheetNamed(buildInput(), 'Tong hop');
    const byLabel = new Map(sheet.rows.map((r) => [String(r['Chỉ tiêu']), r['Giá trị']]));
    expect(byLabel.get('Tổng nhuận bút')).toBe(TONG);
    expect(byLabel.get('Số bài')).toBe(4);
    expect(byLabel.get('Trung bình / bài')).toBe(250_000);
    expect(byLabel.get('Phạm vi xem')).toBe('Tất cả');
    expect(byLabel.get('Từ ngày (báo cáo)')).toBe('2026-05-01');
    expect(byLabel.get('Thể loại')).toBe('Tin');
  });

  it('khoảng ngày rỗng (preset Toàn bộ) ghi chữ thay vì để trống', () => {
    const sheet = sheetNamed(buildInput({ range: { start: null, end: null } }), 'Tong hop');
    const byLabel = new Map(sheet.rows.map((r) => [String(r['Chỉ tiêu']), r['Giá trị']]));
    expect(byLabel.get('Từ ngày (báo cáo)')).toBe('Toàn bộ thời gian');
    expect(byLabel.get('Đến ngày (báo cáo)')).toBe('Toàn bộ thời gian');
  });

  it('sheet Chi tiết đánh STT liên tục, tiền ghi kiểu SỐ để Excel cộng được', () => {
    const sheet = sheetNamed(buildInput(), 'Chi tiet');
    expect(sheet.rows.map((r) => r['STT'])).toEqual([1, 2, 3, 4]);
    expect(typeof sheet.rows[0]['Số tiền']).toBe('number');
    expect(sheet.rows.reduce((s, r) => s + Number(r['Số tiền']), 0)).toBe(TONG);
    expect(sheet.rows[3]['Đơn vị']).toBe('Chưa gán đơn vị');
  });

  it('không có bài nào → sheet gộp rỗng, không có dòng Tổng cộng thừa', () => {
    const sheets = buildNhuanButSheets(buildInput({ rows: [], seriesByMonth: [] }));
    expect(sheets.find((s) => s.name === 'Theo don vi')!.rows).toEqual([]);
    expect(sheets.find((s) => s.name === 'Theo nguoi viet')!.rows).toEqual([]);
    expect(sheets.find((s) => s.name === 'Chi tiet')!.rows).toEqual([]);
  });

  it('don_gia về dạng chuỗi vẫn cộng ra số, không nối chuỗi', () => {
    const chuoi = [
      base({ id: '1', don_gia: '100000' as unknown as number }),
      base({ id: '2', don_gia: '200000' as unknown as number }),
    ];
    const sheet = sheetNamed(buildInput({ rows: chuoi }), 'Theo don vi');
    expect(sheet.rows[0]['Số tiền']).toBe(300_000);
  });
});
