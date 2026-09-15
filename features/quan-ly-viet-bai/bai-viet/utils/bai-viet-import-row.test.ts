import { describe, expect, it } from 'vitest';
import {
  findRef,
  parseBaiVietImportRow,
  parseImportNgay,
  trimCell,
  type BaiVietImportRowInput,
} from './bai-viet-import-row';

const ctx: BaiVietImportRowInput = {
  theLoai: [
    { id: '1', ten: 'Tin viết', donGia: 30_000 },
    { id: '2', ten: 'Thiết kế hoạ', donGia: 300_000 },
  ],
  nguonDang: [{ id: '10', ten: 'Biên tập' }],
  trangDang: [{ id: '20', ten: 'Zalo OA Mặt trận' }],
  nhanVien: [
    { id: '99', ten: 'Nguyễn Thị Thanh Thuỷ', alias: 'thuynt' },
    { id: '98', ten: 'Vương Thị Giang', alias: 'giangvt' },
  ],
  idNguoiTaoMacDinh: '77',
  choSuaDonGia: true,
};

const row = (over: Record<string, unknown> = {}) => ({
  ten_bai: 'Bài mẫu',
  id_the_loai: 'Tin viết',
  ngay_dang: '2026-05-01',
  id_nguon_dang: 'Biên tập',
  id_trang_dang: 'Zalo OA Mặt trận',
  link: 'https://example.test/a',
  ...over,
});

describe('trimCell', () => {
  it('cắt khoảng trắng và giữ nguyên số thường', () => {
    expect(trimCell('  a  ')).toBe('a');
    expect(trimCell(30000)).toBe('30000');
    expect(trimCell(null)).toBe('');
  });

  it('số nguyên rất lớn ra đủ chữ số, không rơi về ký hiệu mũ', () => {
    // `String(1e21)` là '1e+21' — id dán từ hệ thống khác sẽ hỏng hoàn toàn.
    expect(trimCell(1e21)).toBe('1000000000000000000000');
    expect(trimCell(1234567890123456)).toBe('1234567890123456');
  });
});

describe('parseImportNgay', () => {
  it('đọc ISO yyyy-mm-dd', () => {
    expect(parseImportNgay('2026-12-31')).toBe('2026-12-31');
    expect(parseImportNgay('2026-12-31T08:00:00Z')).toBe('2026-12-31');
  });

  it('đọc dd/mm/yyyy và các dấu phân cách khác', () => {
    expect(parseImportNgay('31/12/2026')).toBe('2026-12-31');
    expect(parseImportNgay('1-2-2026')).toBe('2026-02-01');
    expect(parseImportNgay('01.02.2026')).toBe('2026-02-01');
  });

  it('đọc đối tượng Date và serial Excel', () => {
    expect(parseImportNgay(new Date(Date.UTC(2026, 4, 1)))).toBe('2026-05-01');
    // 46143 = 2026-05-01 theo mốc 1899-12-30 của Excel.
    expect(parseImportNgay(46143)).toBe('2026-05-01');
  });

  it('từ chối giá trị không phải ngày thay vì đoán bừa', () => {
    expect(parseImportNgay('hôm qua')).toBeNull();
    expect(parseImportNgay('31/02/2026')).toBeNull();
    expect(parseImportNgay('2026-02-30')).toBeNull();
    expect(parseImportNgay(12)).toBeNull();
    expect(parseImportNgay('')).toBeNull();
  });
});

describe('findRef', () => {
  it('tra theo id trước', () => {
    expect(findRef(ctx.theLoai, '2')?.ten).toBe('Thiết kế hoạ');
  });

  it('tra theo tên không cần đúng dấu và đúng hoa/thường', () => {
    expect(findRef(ctx.theLoai, 'tin viet')?.id).toBe('1');
    expect(findRef(ctx.theLoai, 'THIẾT KẾ HOẠ')?.id).toBe('2');
    expect(findRef(ctx.trangDang, 'zalo oa mat tran')?.id).toBe('20');
  });

  it('tra theo alias (tên tài khoản)', () => {
    expect(findRef(ctx.nhanVien!, 'thuynt')?.id).toBe('99');
  });

  it('không có thì trả null', () => {
    expect(findRef(ctx.theLoai, 'Phóng sự')).toBeNull();
    expect(findRef(ctx.theLoai, '')).toBeNull();
  });
});

describe('parseBaiVietImportRow', () => {
  it('dòng đủ và đúng → lấy đơn giá mặc định của thể loại khi cột đơn giá trống', () => {
    const r = parseBaiVietImportRow(2, row(), ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.values).toMatchObject({
      ten_bai: 'Bài mẫu',
      id_the_loai: '1',
      id_nguon_dang: '10',
      id_trang_dang: '20',
      ngay_dang: '2026-05-01',
      don_gia: 30_000,
    });
    expect(r.data.idNguoiTao).toBe('77');
    expect(r.data.linkKey).toBe('https://example.test/a');
    expect(r.data.tenBaiKey).toBe('bài mẫu');
  });

  it('đọc đơn giá kiểu Việt Nam 1.500.000', () => {
    const r = parseBaiVietImportRow(2, row({ don_gia: '1.500.000' }), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.values.don_gia).toBe(1_500_000);
  });

  it('không có quyền sửa đơn giá thì bỏ qua cột đơn giá trong file', () => {
    const r = parseBaiVietImportRow(2, row({ don_gia: '999.999' }), { ...ctx, choSuaDonGia: false });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.values.don_gia).toBe(30_000);
  });

  it('đơn giá không đọc được thì báo lỗi, không âm thầm ghi 0', () => {
    const r = parseBaiVietImportRow(5, row({ don_gia: 'ba trăm nghìn' }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('Dòng 5');
  });

  it('thiếu tên bài / sai thể loại / sai ngày đều báo đúng dòng', () => {
    expect(parseBaiVietImportRow(3, row({ ten_bai: '  ' }), ctx)).toMatchObject({ ok: false });
    const tl = parseBaiVietImportRow(4, row({ id_the_loai: 'Phóng sự' }), ctx);
    expect(tl.ok).toBe(false);
    if (!tl.ok) expect(tl.message).toContain('Phóng sự');
    const ng = parseBaiVietImportRow(6, row({ ngay_dang: 'hôm qua' }), ctx);
    expect(ng.ok).toBe(false);
    if (!ng.ok) expect(ng.message).toContain('Dòng 6');
  });

  it('liên kết trống hoặc không phải URL đều bị chặn', () => {
    expect(parseBaiVietImportRow(2, row({ link: '' }), ctx)).toMatchObject({ ok: false });
    expect(parseBaiVietImportRow(2, row({ link: 'example.test' }), ctx)).toMatchObject({ ok: false });
  });

  it('cột người tạo tra ra id nhân viên khi được phép', () => {
    const r = parseBaiVietImportRow(2, row({ id_nguoi_tao: 'Vương Thị Giang' }), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.idNguoiTao).toBe('98');
  });

  it('không được phép gán người khác thì cột người tạo bị bỏ qua, không báo lỗi', () => {
    const r = parseBaiVietImportRow(2, row({ id_nguoi_tao: 'Vương Thị Giang' }), {
      ...ctx,
      nhanVien: undefined,
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.idNguoiTao).toBe('77');
  });

  it('người tạo ghi sai tên thì báo lỗi thay vì gán nhầm', () => {
    const r = parseBaiVietImportRow(7, row({ id_nguoi_tao: 'Ai Đó' }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toContain('Ai Đó');
  });

  it('tài khoản chưa gắn hồ sơ nhân viên thì không cho nhập', () => {
    const r = parseBaiVietImportRow(2, row(), { ...ctx, idNguoiTaoMacDinh: '' });
    expect(r.ok).toBe(false);
  });
});
