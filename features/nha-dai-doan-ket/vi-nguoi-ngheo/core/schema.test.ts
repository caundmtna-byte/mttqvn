import { describe, it, expect, beforeAll } from 'vitest';
import { applyZodVietnameseErrors } from '@/lib/validation/zod-vi';
import { viNguoiNgheoSchema } from './schema';
import { docPhieuKhaoSat, phieuKhaoSatToFormInput, VNN_LOAI_PHIEU, vnnLoaiPhieu } from './phieu-khao-sat';
import { checkValuesTrongSchema } from '@/lib/db-schema-snapshot';
import {
  VNN_DOI_TUONG_VALUES,
  VNN_HINH_THUC_VALUES,
  VNN_LINH_VUC_VALUES,
  VNN_NGUON_HO_TRO_VALUES,
  VNN_NGUON_VALUES,
  VNN_TRANG_THAI_VALUES,
} from './constants';

beforeAll(() => applyZodVietnameseErrors());

const KHOAN_HOP_LE = {
  noi_dung_ho_tro: 'Tết vì người nghèo 2026',
  nam: '2026',
  linh_vuc_ho_tro: 'Tết vì người nghèo',
  nguon: 'Vì người nghèo',
  nguon_ho_tro: 'Cấp tỉnh',
  ho_ngheo_id: 'ho-1',
  ho_ten_nguoi_nhan: 'Hồ Văn Thu',
  hinh_thuc_ho_tro: 'Tiền mặt',
  so_tien: '500.000',
  trang_thai: 'Đang khảo sát',
};

function parse(over: Record<string, unknown>) {
  return viNguoiNgheoSchema.safeParse({ ...KHOAN_HOP_LE, ...over });
}

describe('viNguoiNgheoSchema', () => {
  it('đọc được số tiền dán từ Excel có dấu phân tách', () => {
    expect(parse({ so_tien: '500.000' }).data?.so_tien).toBe(500_000);
    expect(parse({ so_tien: '500,000' }).data?.so_tien).toBe(500_000);
  });

  it('để trống số tiền chỉ hợp lệ khi khoản chỉ có hiện vật (đã có tiền quy đổi)', () => {
    const r = parse({ so_tien: '', hinh_thuc_ho_tro: 'Hiện vật', tong_tien_quy_doi: '300.000' });
    expect(r.success).toBe(true);
    expect(r.data!.so_tien).toBeUndefined();
  });

  it('tiền mặt để trống số tiền bị từ chối — kể cả khi đang khảo sát', () => {
    const r = parse({ so_tien: '' });
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path.join('.'))).toEqual(['so_tien']);
  });

  it('"Quà" cũ không còn là hình thức hợp lệ — đã đổi thành "Hiện vật"', () => {
    expect(parse({ hinh_thuc_ho_tro: 'Quà' }).success).toBe(false);
    expect(parse({ hinh_thuc_ho_tro: 'Quà và Tiền' }).success).toBe(false);
  });

  it('hình thức có hiện vật giữ số lượng + hai tổng tiền', () => {
    for (const hinh_thuc_ho_tro of ['Hiện vật', 'Hiện vật và Tiền']) {
      const r = parse({
        hinh_thuc_ho_tro,
        so_luong: '10',
        tong_tien_quy_doi: '2.000.000',
        tong_tien_ban_giao: '1.800.000',
      });
      expect(r.success).toBe(true);
      expect(r.data).toMatchObject({ so_luong: 10, tong_tien_quy_doi: 2_000_000, tong_tien_ban_giao: 1_800_000 });
    }
  });

  it('tiền mặt ⇒ bỏ số hiện vật còn sót (ô đã ẩn), gửi NULL', () => {
    const r = parse({ hinh_thuc_ho_tro: 'Tiền mặt', so_luong: '10', tong_tien_quy_doi: '2000000' });
    expect(r.success).toBe(true);
    expect(r.data!.so_luong).toBeUndefined();
    expect(r.data!.tong_tien_quy_doi).toBeUndefined();
    expect(r.data!.tong_tien_ban_giao).toBeUndefined();
  });

  it('số lượng lẻ hoặc âm bị từ chối', () => {
    expect(parse({ hinh_thuc_ho_tro: 'Hiện vật', so_luong: '1,5' }).success).toBe(false);
    expect(parse({ hinh_thuc_ho_tro: 'Hiện vật', so_luong: '-2' }).success).toBe(false);
  });

  it('số âm và chữ bị từ chối', () => {
    expect(parse({ so_tien: '-1' }).success).toBe(false);
    expect(parse({ so_tien: 'một triệu' }).success).toBe(false);
  });

  it('ô liên kết trống quy về undefined (gửi NULL), không phải chuỗi rỗng', () => {
    const r = parse({ don_vi_ho_tro_id: ' ', xa_phuong_id: '' });
    expect(r.success).toBe(true);
    expect(r.data).toMatchObject({
      don_vi_ho_tro_id: undefined,
      xa_phuong_id: undefined,
    });
  });

  it('bắt buộc chọn hộ nghèo — không cho nhập tay họ tên', () => {
    expect(parse({ ho_ngheo_id: '' }).success).toBe(false);
    expect(parse({ ho_ngheo_id: '  ' }).success).toBe(false);
    expect(parse({ ho_ngheo_id: undefined }).success).toBe(false);
  });

  it('"Quà tết" cũ không còn là lĩnh vực hợp lệ — đã gộp vào "Tết vì người nghèo"', () => {
    expect(parse({ linh_vuc_ho_tro: 'Quà tết' }).success).toBe(false);
  });

  it('năm ngoài khoảng CHECK bị từ chối', () => {
    expect(parse({ nam: 1999 }).success).toBe(false);
    expect(parse({ nam: 2101 }).success).toBe(false);
  });
});

describe('viNguoiNgheoSchema — phiếu khảo sát', () => {
  function phieu(patch: (p: ReturnType<typeof phieuKhaoSatToFormInput>) => void) {
    const p = phieuKhaoSatToFormInput(null);
    patch(p);
    return p;
  }

  it('form chưa có bản đầy đủ (không có khoá) ⇒ không gửi cột phiếu', () => {
    expect(parse({ linh_vuc_ho_tro: 'Cứu trợ' }).data!.phieu_khao_sat).toBeUndefined();
  });

  it('chỉ giữ `chung` + nhánh đúng lĩnh vực; ô trống không ghi khoá', () => {
    const p = phieu((x) => {
      x.chung.ghi_chu = '  ';
      x.chung.thu_nhap_binh_quan = '1.500.000';
      x.sinh_ke.so_lao_dong = '2';
      x.hoc_sinh.ho_ten = 'Rác từ lần chọn trước';
    });
    const r = parse({ linh_vuc_ho_tro: 'Mô hình sinh kế', phieu_khao_sat: p });
    expect(r.success).toBe(true);
    expect(r.data!.phieu_khao_sat).toEqual({
      chung: { thu_nhap_binh_quan: 1_500_000 },
      sinh_ke: { so_lao_dong: 2 },
    });
  });

  it('lĩnh vực không có phiếu ⇒ null (xoá phiếu cũ)', () => {
    const p = phieu((x) => (x.chung.ghi_chu = 'cũ'));
    expect(parse({ linh_vuc_ho_tro: 'Tết vì người nghèo', phieu_khao_sat: p }).data!.phieu_khao_sat).toBeNull();
  });

  it('số thập phân dấu phẩy, ngày ISO; số sai báo lỗi đúng ô', () => {
    const ok = phieu((x) => {
      x.thien_tai.dien_tich_nha = '45,5';
      x.chung.ngay_khao_sat = '2026-10-05';
    });
    const r = parse({ linh_vuc_ho_tro: 'Nhà bị sập', phieu_khao_sat: ok });
    expect(r.data!.phieu_khao_sat).toEqual({
      chung: { ngay_khao_sat: '2026-10-05' },
      thien_tai: { dien_tich_nha: 45.5 },
    });
    const sai = phieu((x) => (x.thien_tai.nam_xay_dung = 'abc'));
    const e = parse({ linh_vuc_ho_tro: 'Nhà bị sập', phieu_khao_sat: sai });
    expect(e.success).toBe(false);
    expect(e.error!.issues[0].path).toEqual(['phieu_khao_sat', 'thien_tai', 'nam_xay_dung']);
  });

  it('số thập phân làm tròn 2 chữ số lẻ — nạp lại vào ô không bị đọc thành hàng nghìn', () => {
    const p = phieu((x) => (x.hoc_sinh.khoang_cach_km = 1.126 as unknown as string));
    const r = parse({ linh_vuc_ho_tro: 'Học sinh nghèo', phieu_khao_sat: p });
    expect(r.data!.phieu_khao_sat?.hoc_sinh?.khoang_cach_km).toBe(1.13);
    // Giá trị đã lưu đi vòng qua form (String(45.5) = "45.5") vẫn giữ nguyên.
    const vong = phieuKhaoSatToFormInput({ chung: {}, thien_tai: { dien_tich_nha: 45.5 } });
    const r2 = parse({ linh_vuc_ho_tro: 'Nhà bị sập', phieu_khao_sat: vong });
    expect(r2.data!.phieu_khao_sat?.thien_tai?.dien_tich_nha).toBe(45.5);
  });

  it('ô sai ở nhánh đang ẩn không chặn Lưu', () => {
    const p = phieu((x) => (x.thien_tai.nam_xay_dung = 'abc'));
    expect(parse({ linh_vuc_ho_tro: 'Học sinh nghèo', phieu_khao_sat: p }).success).toBe(true);
  });

  it('ô tick: lọc giá trị ngoài danh mục, giữ thứ tự trên phiếu', () => {
    const p = phieu((x) => (x.hoc_sinh.nhu_cau = ['Xe đạp', 'Máy tính', 'Học bổng']));
    const r = parse({ linh_vuc_ho_tro: 'Học sinh nghèo', phieu_khao_sat: p });
    expect(r.data!.phieu_khao_sat?.hoc_sinh?.nhu_cau).toEqual(['Học bổng', 'Xe đạp']);
  });
});

describe('docPhieuKhaoSat — đọc jsonb phòng thủ', () => {
  it('trường sai kiểu thì bỏ trường đó, không bỏ cả phiếu', () => {
    expect(
      docPhieuKhaoSat({
        chung: { ghi_chu: 'Giữ', thu_nhap_binh_quan: 'không phải số' },
        sinh_ke: { mo_hinh: ['Buôn bán nhỏ, dịch vụ', 'lạ'] },
      }),
    ).toEqual({ chung: { ghi_chu: 'Giữ' }, sinh_ke: { mo_hinh: ['Buôn bán nhỏ, dịch vụ'] } });
  });

  it('không phải object ⇒ null', () => {
    expect(docPhieuKhaoSat(null)).toBeNull();
    expect(docPhieuKhaoSat([1])).toBeNull();
  });

  it('mọi lĩnh vực trừ Tết đều có phiếu', () => {
    const coPhieu = VNN_LINH_VUC_VALUES.filter((v) => vnnLoaiPhieu(v) != null);
    expect(coPhieu).toEqual(VNN_LINH_VUC_VALUES.filter((v) => v !== 'Tết vì người nghèo'));
    expect(new Set(coPhieu.map(vnnLoaiPhieu))).toEqual(new Set(VNN_LOAI_PHIEU));
  });
});

/**
 * Danh mục ở client là BẢN SAO của CHECK dưới DB. Lệch nhau thì giao diện cho
 * chọn một giá trị mà DB từ chối — test này giữ hai bên khớp.
 */
describe('danh mục khớp CHECK dưới DB (supabase/schema.sql)', () => {
  const checkValues = (col: string) => checkValuesTrongSchema('vnn_chuong_trinh', col);

  it.each([
    ['linh_vuc_ho_tro', VNN_LINH_VUC_VALUES],
    ['nguon', VNN_NGUON_VALUES],
    ['nguon_ho_tro', VNN_NGUON_HO_TRO_VALUES],
    ['doi_tuong', VNN_DOI_TUONG_VALUES],
    ['hinh_thuc_ho_tro', VNN_HINH_THUC_VALUES],
    ['trang_thai', VNN_TRANG_THAI_VALUES],
  ] as const)('%s', (col, values) => {
    expect(checkValues(col)).toEqual([...values]);
  });
});
