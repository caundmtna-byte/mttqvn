import {
  DOTS_MEDIUM,
  DOTS_SHORT,
  doan,
  f,
  luaChon,
  ngayGach,
  soVN,
  t,
  type BienBanModel,
} from '@/lib/bien-ban/bien-ban-model';
import {
  PKS_HOAN_CANH_HOC_SINH,
  PKS_KET_QUA_HOC_TAP,
  PKS_NHU_CAU_HOC_SINH,
} from '../../core/phieu-khao-sat';
import {
  boDem,
  danhMuc,
  dongChu,
  mucHoanCanhVaNguonKhac,
  mucThongTinHo,
  mucYKienToCongTac,
  phieuCua,
  tieuDe,
  tieuMuc,
  type PhieuKhaoSatNguon,
} from './phan-chung';

export const TIEU_DE_PHIEU_HOC_SINH = 'Phiếu khảo sát học sinh có hoàn cảnh khó khăn đề nghị hỗ trợ';

/** Phiếu 4 — Học sinh nghèo. */
export function buildPhieuHocSinh(nguon: PhieuKhaoSatNguon): BienBanModel {
  const p = phieuCua(nguon.vnn);
  const hs = p.hoc_sinh ?? {};
  const so = boDem(1);

  return {
    tieuDe: TIEU_DE_PHIEU_HOC_SINH,
    blocks: [
      tieuDe(['HỌC SINH CÓ HOÀN CẢNH KHÓ KHĂN ĐỀ NGHỊ HỖ TRỢ']),
      ...mucThongTinHo(nguon, so, 'Họ tên chủ hộ (cha/mẹ/người giám hộ)'),
      tieuMuc('II. THÔNG TIN HỌC SINH'),
      doan([
        t(`${so()}Họ tên học sinh: `),
        f(hs.ho_ten, DOTS_MEDIUM),
        t('   Giới tính: '),
        f(hs.gioi_tinh, DOTS_SHORT),
      ]),
      doan([
        t(`${so()}Ngày sinh: `),
        f(ngayGach(hs.ngay_sinh), DOTS_SHORT),
        t('   Lớp: '),
        f(hs.lop, 10),
        t('   Trường: '),
        f(hs.truong, DOTS_MEDIUM),
      ]),
      dongChu(so(), 'Quan hệ với chủ hộ', hs.quan_he_chu_ho),
      luaChon(
        `${so()}Kết quả học tập năm học trước:`,
        danhMuc(PKS_KET_QUA_HOC_TAP),
        hs.ket_qua_hoc_tap,
        'inline',
      ),
      luaChon(`${so()}Hoàn cảnh của học sinh:`, danhMuc(PKS_HOAN_CANH_HOC_SINH), hs.hoan_canh, 'luoi', {
        value: hs.hoan_canh_khac,
      }),
      doan([
        t(`${so()}Khoảng cách từ nhà đến trường: `),
        f(soVN(hs.khoang_cach_km), DOTS_SHORT),
        t(' km; phương tiện đi học: '),
        f(hs.phuong_tien, DOTS_SHORT),
      ]),
      luaChon(`${so()}Nhu cầu cần hỗ trợ:`, danhMuc(PKS_NHU_CAU_HOC_SINH), hs.nhu_cau, 'luoi', {
        value: hs.nhu_cau_khac,
      }),
      ...mucHoanCanhVaNguonKhac(p.chung, so),
      ...mucYKienToCongTac(nguon, so),
    ],
  };
}
