/**
 * Ba biên bản in: ô trống ⇒ dòng chấm (không bao giờ in "null"), ô ☒ đúng dữ
 * liệu, tiền + bằng chữ đúng, ngày đúng thể thức. Sai một chỗ là sai giấy tờ
 * có chữ ký — nên kiểm ở tầng builder thuần, không qua giao diện.
 */
import { describe, expect, it } from 'vitest';
import type { HoNgheo } from '@/features/nha-dai-doan-ket/thong-tin-ho-ngheo/core/types';
import type { NddkBienBan, NhaDaiDoanKet } from '../../core/types';
import { buildBienBan } from './build-bien-ban';
import { ngayThangNam, O_CHON, O_TRONG } from '@/lib/bien-ban/bien-ban-model';
import { bienBanToRows } from '@/lib/bien-ban/download-bien-ban-xlsx';

const bienBanRong: NddkBienBan = {
  ngay_khao_sat: null,
  hien_trang_nha: null,
  hoan_canh_gia_dinh: null,
  nhu_cau_ho_tro: null,
  ghi_chu_khao_sat: null,
  ngay_kiem_tra_hoan_thanh: null,
  thanh_phan_kiem_tra: null,
  dien_tich_san: null,
  phan_nen: null,
  phan_mai: null,
  phan_khung_tuong: null,
  tong_gia_tri: null,
  nguon_khac: [],
  ngay_ban_giao: null,
  dia_diem_ban_giao: null,
  ban_giao_ho_ten: null,
  ban_giao_chuc_vu: null,
  lam_chung_ho_ten: null,
  lam_chung_chuc_vu: null,
  so_quyet_dinh: null,
  ngay_quyet_dinh: null,
};

function nddk(bb: Partial<NddkBienBan> = {}, extra: Partial<NhaDaiDoanKet> = {}): NhaDaiDoanKet {
  return {
    id: '35',
    noi_dung_ho_tro: 'Hỗ trợ xây mới',
    nam: 2026,
    nguon: 'Vì người nghèo',
    nguon_ho_tro: 'Cấp tỉnh',
    ho_ngheo_id: '7',
    ho_ten_chu_ho: 'Cầm Thị Quanh',
    xa_phuong_id: '1',
    ten_xa_phuong: 'xã Môn Sơn',
    khoi_xom: 'Tân Hợp',
    doi_tuong: 'Hộ nghèo',
    loai_hinh_ho_tro: 'Xây mới',
    so_tien: 60_000_000,
    trang_thai: 'Đã bàn giao',
    ngay_cap_nhat_trang_thai: '',
    ghi_chu: null,
    id_nguoi_tao: '1',
    tg_tao: '',
    tg_cap_nhat: '',
    bien_ban: { ...bienBanRong, ...bb },
    ...extra,
  };
}

const ho: HoNgheo = {
  id: '7',
  ho_ten_dai_dien: 'Cầm Thị Quanh',
  so_cccd: '040123456789',
  xa_phuong_id: '1',
  ten_xa_phuong: 'xã Môn Sơn',
  khoi_xom: 'Tân Hợp',
  doi_tuong: 'Hộ nghèo',
  dien_thoai: null,
  dan_toc_id: null,
  ten_dan_toc: 'Thái',
  ton_giao: 'Không',
  to_chuc: 'Mặt trận',
  so_tai_khoan: null,
  ngan_hang: null,
  trang_thai: 'Đang khó khăn',
  ngay_cap_nhat_trang_thai: '',
  ghi_chu: null,
  id_nguoi_tao: '1',
  tg_tao: '',
  tg_cap_nhat: '',
  nhan_khau: {
    gioi_tinh: 'Nữ',
    nam_sinh: 1968,
    ngay_cap_cccd: '2021-03-15',
    noi_cap_cccd: 'Cục CS QLHC về TTXH',
    ho_ten_vo_chong: null,
    so_nhan_khau: 4,
    nghe_nghiep: 'Làm nông',
    trinh_do_hoc_van: null,
    tinh_trang_viec_lam: 'Có việc làm',
    doi_tuong_uu_tien: null,
    tinh_trang_dat: 'Chưa có GCN QSDĐ',
  },
};

const text = (loai: Parameters<typeof buildBienBan>[0], n: NhaDaiDoanKet, h: HoNgheo | null = ho) =>
  bienBanToRows(buildBienBan(loai, { nddk: n, ho: h })).join('\n');

describe('ngayThangNam', () => {
  it('đúng thể thức NĐ 30: ngày < 10 và tháng 1, 2 thêm số 0', () => {
    expect(ngayThangNam('2026-10-05')).toBe('ngày 05 tháng 10 năm 2026');
    expect(ngayThangNam('2026-03-09')).toBe('ngày 09 tháng 3 năm 2026');
    expect(ngayThangNam('2026-02-20')).toBe('ngày 20 tháng 02 năm 2026');
    expect(ngayThangNam(null)).toBe('ngày …… tháng …… năm ……');
  });
});

describe('biên bản khảo sát', () => {
  it('đánh ☒ đúng đối tượng, tình trạng đất, nhu cầu', () => {
    const s = text('khao-sat', nddk({ nhu_cau_ho_tro: 'Gia đình tự xây mới' }));
    expect(s).toContain(`${O_CHON} Hộ nghèo`);
    expect(s).toContain(`${O_TRONG} Hộ cận nghèo`);
    expect(s).toContain(`${O_CHON} Chưa có Giấy chứng nhận quyền sử dụng đất`);
    expect(s).toContain(`${O_TRONG} Có Giấy chứng nhận quyền sử dụng đất`);
    expect(s).toContain(`${O_CHON} Hỗ trợ gia đình tự xây mới`);
    expect(s).toContain('Giới tính: Nữ');
    expect(s).toContain('thôn Tân Hợp, xã/phường: xã Môn Sơn');
  });

  it('hồ sơ chưa gắn hộ, chưa nhập gì: toàn dòng chấm, không lọt null/undefined', () => {
    const s = text('khao-sat', nddk({}, { doi_tuong: null }), null);
    expect(s).not.toMatch(/null|undefined|NaN/);
    expect(s).toContain('4. Số Căn cước: ....');
    expect(s).not.toContain(O_CHON);
    expect(s).toContain('Môn Sơn, ngày …… tháng …… năm ……');
  });
});

describe('biên bản kiểm tra hoàn thành', () => {
  it('chưa nhập thành phần / nguồn khác ⇒ đủ 3 dòng chấm như mẫu giấy', () => {
    const s = text('hoan-thanh', nddk());
    expect(s.match(/^- Ông \(bà\): \.+ {3}Chức vụ:/gm)).toHaveLength(3);
    expect(s.match(/^- Nguồn: \.+ đồng\.$/gm)).toHaveLength(3);
  });

  it('có dữ liệu thì in đúng số dòng đã nhập, số theo kiểu Việt Nam', () => {
    const s = text(
      'hoan-thanh',
      nddk({
        ngay_kiem_tra_hoan_thanh: '2026-11-02',
        dien_tich_san: 45.5,
        tong_gia_tri: 120_000_000,
        thanh_phan_kiem_tra: {
          bcd: { ho_ten: 'Lê Văn A', chuc_vu: 'Phó Bí thư' },
          ubnd: { ho_ten: '', chuc_vu: '' },
          mttq: { ho_ten: '', chuc_vu: '' },
          thon: [{ ho_ten: 'Lò Văn B', chuc_vu: 'Xóm trưởng' }],
        },
        nguon_khac: [{ ten: 'Gia đình đối ứng', so_tien: 60_000_000 }],
      }),
    );
    expect(s).toContain('Hôm nay, ngày 02 tháng 11 năm 2026');
    expect(s).toContain('Ông (bà): Lê Văn A   Chức vụ: Phó Bí thư');
    expect(s.match(/^- Ông \(bà\): Lò Văn B {3}Chức vụ: Xóm trưởng$/gm)).toHaveLength(1);
    expect(s).toContain('diện tích sàn 45,5 m²');
    expect(s).toContain('Tổng giá trị xây dựng/sửa chữa: 120.000.000 đồng');
    expect(s).toContain('- Nguồn hỗ trợ từ Chương trình: 60.000.000 đồng;');
    expect(s).toContain('- Nguồn: Gia đình đối ứng: 60.000.000 đồng.');
    expect(s).not.toMatch(/^- Nguồn: \.+ đồng\.$/m);
  });
});

describe('biên bản bàn giao', () => {
  it('tiền + bằng chữ + mục đích + căn cước lấy từ hộ', () => {
    const s = text('ban-giao', nddk({ so_quyet_dinh: '12', ngay_quyet_dinh: '2026-09-01' }));
    expect(s).toContain('tổng số tiền là: 60.000.000 VNĐ (bằng chữ: Sáu mươi triệu đồng)');
    expect(s).toContain('mục đích xây mới nhà ở');
    expect(s).toContain('Căn cứ Quyết định số 12/QĐ-BVĐ ngày 01/09/2026');
    expect(s).toContain('Số Căn cước: 040123456789   Ngày cấp: 15/03/2021');
    expect(s).toContain('Nơi thường trú: thôn Tân Hợp, xã Môn Sơn, tỉnh Nghệ An');
  });

  it('chưa chốt số tiền: dòng chấm, không in "Không đồng"', () => {
    const s = text('ban-giao', nddk({}, { so_tien: null }), null);
    expect(s).not.toContain('Không đồng');
    expect(s).toContain('Quyết định số ………/QĐ-BVĐ');
    expect(s).not.toMatch(/null|undefined|NaN/);
  });
});
