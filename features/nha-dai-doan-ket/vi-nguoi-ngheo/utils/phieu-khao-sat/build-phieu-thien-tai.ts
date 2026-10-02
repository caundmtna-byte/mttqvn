import {
  DOTS_SHORT,
  doan,
  f,
  luaChon,
  soVN,
  t,
  type BienBanModel,
  type DanhMucLuaChon,
} from '@/lib/bien-ban/bien-ban-model';
import {
  PKS_LOAI_SU_CO,
  PKS_NHU_CAU_THIEN_TAI,
  PKS_THIET_HAI_NHA,
} from '../../core/phieu-khao-sat';
import {
  boDem,
  danhMuc,
  dongChu,
  mucHoanCanhVaNguonKhac,
  mucThongTinHo,
  mucYKienToCongTac,
  nhomPhu,
  phieuCua,
  tienRuns,
  tieuDe,
  tieuMuc,
  type PhieuKhaoSatNguon,
} from './phan-chung';

export const TIEU_DE_PHIEU_THIEN_TAI = 'Phiếu khảo sát hộ gia đình bị thiệt hại do thiên tai, sự cố';

/** Dòng đầu phiếu — mẫu chỉ có hai ô; hồ sơ "Hoả hoạn" để trống cả hai. */
const LINH_VUC: DanhMucLuaChon[] = [
  { value: 'Cứu trợ', label: 'Cứu trợ' },
  { value: 'Nhà bị sập', label: 'Nhà bị sập' },
];

const TINH_TRANG_DAT: DanhMucLuaChon[] = [
  { value: 'Có GCN QSDĐ', label: 'Có Giấy chứng nhận QSDĐ' },
  { value: 'Chưa có GCN QSDĐ', label: 'Chưa có Giấy chứng nhận QSDĐ' },
];

/** Phiếu 1 — Cứu trợ, Nhà bị sập, Hoả hoạn. */
export function buildPhieuThienTai(nguon: PhieuKhaoSatNguon): BienBanModel {
  const { vnn, ho } = nguon;
  const p = phieuCua(vnn);
  const tt = p.thien_tai ?? {};
  const so = boDem(1);

  // Hồ sơ Hoả hoạn chưa tick loại sự cố nào ⇒ tự tick "Hỏa hoạn".
  const loaiSuCo =
    tt.loai_su_co?.length || tt.loai_su_co_khac || vnn.linh_vuc_ho_tro !== 'Hoả hoạn'
      ? tt.loai_su_co
      : ['Hỏa hoạn'];

  return {
    tieuDe: TIEU_DE_PHIEU_THIEN_TAI,
    blocks: [
      tieuDe(['HỘ GIA ĐÌNH BỊ THIỆT HẠI DO THIÊN TAI, SỰ CỐ']),
      luaChon([t('Lĩnh vực hỗ trợ:', { bold: true })], LINH_VUC, vnn.linh_vuc_ho_tro, 'inline'),
      ...mucThongTinHo(nguon, so),
      tieuMuc('II. TÌNH HÌNH THIỆT HẠI'),
      luaChon(`${so()}Loại thiên tai, sự cố:`, danhMuc(PKS_LOAI_SU_CO), loaiSuCo, 'luoi', {
        value: tt.loai_su_co_khac,
      }),
      dongChu(so(), 'Thời gian xảy ra', tt.thoi_gian_xay_ra),
      luaChon(`${so()}Thiệt hại về nhà ở:`, danhMuc(PKS_THIET_HAI_NHA), tt.thiet_hai_nha, 'luoi'),
      dongChu(so(), 'Thiệt hại về tài sản, lương thực, vật dụng thiết yếu', tt.thiet_hai_tai_san),
      dongChu(so(), 'Thiệt hại về cây trồng, vật nuôi, sản xuất', tt.thiet_hai_san_xuat),
      doan([t(`${so()}Ước tính tổng giá trị thiệt hại: `), ...tienRuns(tt.uoc_tinh_thiet_hai, 32)]),
      nhomPhu('Chi tiết nhà ở (ghi khi nhà sập đổ hoặc hư hỏng nặng):'),
      dongChu(so(), 'Kết cấu nhà (loại nhà, tường, mái)', tt.ket_cau_nha),
      doan([
        t(`${so()}Diện tích nhà: `),
        f(soVN(tt.dien_tich_nha), DOTS_SHORT),
        t(' m²; năm xây dựng: '),
        f(tt.nam_xay_dung, DOTS_SHORT),
      ]),
      dongChu(so(), 'Nơi ở tạm hiện nay', tt.noi_o_tam),
      luaChon(`${so()}Tình trạng đất ở:`, TINH_TRANG_DAT, ho?.nhan_khau?.tinh_trang_dat, 'inline'),
      dongChu(so(), 'Khả năng đối ứng của hộ (kinh phí, ngày công)', tt.kha_nang_doi_ung),
      luaChon(`${so()}Nhu cầu cần hỗ trợ:`, danhMuc(PKS_NHU_CAU_THIEN_TAI), tt.nhu_cau, 'luoi', {
        value: tt.nhu_cau_khac,
      }),
      ...mucHoanCanhVaNguonKhac(p.chung, so),
      ...mucYKienToCongTac(nguon, so),
    ],
  };
}
