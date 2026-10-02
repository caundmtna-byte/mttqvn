import {
  DOTS_MEDIUM,
  DOTS_SHORT,
  doan,
  f,
  luaChon,
  ngayGach,
  t,
  type BienBanModel,
  type DanhMucLuaChon,
} from '@/lib/bien-ban/bien-ban-model';
import {
  PKS_CO_KHONG,
  PKS_GIAY_TO,
  PKS_NGUYEN_NHAN_MAT,
  PKS_NHU_CAU_BENH_TAT,
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

export const TIEU_DE_PHIEU_BENH_TAT =
  'Phiếu khảo sát hộ gia đình có thành viên ốm đau, bệnh hiểm nghèo hoặc qua đời';

const LINH_VUC: DanhMucLuaChon[] = [
  { value: 'Chữa bệnh', label: 'Chữa bệnh' },
  { value: 'Người chết', label: 'Thăm hỏi gia đình có người qua đời' },
];

/** Mục "Trường hợp" suy ra từ lĩnh vực — không có ô nhập riêng. */
const TRUONG_HOP: DanhMucLuaChon[] = [
  { value: 'Chữa bệnh', label: 'Ốm đau, bệnh hiểm nghèo' },
  { value: 'Người chết', label: 'Qua đời' },
];

/** Phiếu 2 — Chữa bệnh, Người chết. */
export function buildPhieuBenhTat(nguon: PhieuKhaoSatNguon): BienBanModel {
  const { vnn } = nguon;
  const p = phieuCua(vnn);
  const bt = p.benh_tat ?? {};
  const so = boDem(1);

  return {
    tieuDe: TIEU_DE_PHIEU_BENH_TAT,
    blocks: [
      tieuDe(['HỘ GIA ĐÌNH CÓ THÀNH VIÊN ỐM ĐAU, BỆNH HIỂM NGHÈO', 'HOẶC QUA ĐỜI']),
      luaChon([t('Lĩnh vực hỗ trợ:', { bold: true })], LINH_VUC, vnn.linh_vuc_ho_tro, 'inline'),
      ...mucThongTinHo(nguon, so),
      tieuMuc('II. THÔNG TIN THÀNH VIÊN ĐƯỢC KHẢO SÁT'),
      luaChon(`${so()}Trường hợp:`, TRUONG_HOP, vnn.linh_vuc_ho_tro, 'inline'),
      doan([
        t(`${so()}Họ tên: `),
        f(bt.ho_ten, DOTS_MEDIUM),
        t('   Năm sinh: '),
        f(bt.nam_sinh, DOTS_SHORT),
      ]),
      dongChu(so(), 'Quan hệ với chủ hộ', bt.quan_he_chu_ho),
      nhomPhu('Trường hợp ốm đau, bệnh hiểm nghèo:'),
      dongChu(so(), 'Bệnh/chẩn đoán', bt.chan_doan),
      dongChu(so(), 'Cơ sở khám, chữa bệnh đang điều trị', bt.co_so_dieu_tri),
      doan([
        t(`${so()}Thời gian điều trị: từ ngày `),
        f(ngayGach(bt.dieu_tri_tu), DOTS_SHORT),
        t(' đến ngày '),
        f(ngayGach(bt.dieu_tri_den), DOTS_SHORT),
      ]),
      luaChon(`${so()}Thẻ bảo hiểm y tế:`, danhMuc(PKS_CO_KHONG), bt.co_bhyt, 'inline'),
      doan([
        t(`${so()}Chi phí đã chi trả: `),
        ...tienRuns(bt.chi_phi_da_tra),
        t('; dự kiến: '),
        ...tienRuns(bt.chi_phi_du_kien),
      ]),
      nhomPhu('Trường hợp qua đời:'),
      doan([
        t(`${so()}Ngày mất: `),
        f(ngayGach(bt.ngay_mat), DOTS_SHORT),
        t('   Nơi mất: '),
        f(bt.noi_mat, DOTS_MEDIUM),
      ]),
      luaChon(`${so()}Nguyên nhân:`, danhMuc(PKS_NGUYEN_NHAN_MAT), bt.nguyen_nhan, 'inline', {
        value: bt.nguyen_nhan_khac,
      }),
      dongChu(
        so(),
        'Người phụ thuộc còn lại (con nhỏ, người già, người khuyết tật...)',
        bt.nguoi_phu_thuoc,
      ),
      nhomPhu('Chung:'),
      luaChon(`${so()}Giấy tờ kèm theo:`, danhMuc(PKS_GIAY_TO), bt.giay_to, 'luoi', {
        value: bt.giay_to_khac,
      }),
      luaChon(`${so()}Nhu cầu cần hỗ trợ:`, danhMuc(PKS_NHU_CAU_BENH_TAT), bt.nhu_cau, 'luoi', {
        value: bt.nhu_cau_khac,
      }),
      ...mucHoanCanhVaNguonKhac(p.chung, so),
      ...mucYKienToCongTac(nguon, so),
    ],
  };
}
