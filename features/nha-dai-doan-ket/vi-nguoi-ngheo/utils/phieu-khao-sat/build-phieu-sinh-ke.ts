import {
  DOTS_MEDIUM,
  DOTS_SHORT,
  doan,
  f,
  luaChon,
  soVN,
  t,
  type BienBanModel,
} from '@/lib/bien-ban/bien-ban-model';
import { PKS_MO_HINH } from '../../core/phieu-khao-sat';
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

export const TIEU_DE_PHIEU_SINH_KE = 'Phiếu khảo sát hộ gia đình đề nghị hỗ trợ mô hình sinh kế';

/** Phiếu 3 — Mô hình sinh kế. Mẫu không có dòng "Lĩnh vực hỗ trợ". */
export function buildPhieuSinhKe(nguon: PhieuKhaoSatNguon): BienBanModel {
  const p = phieuCua(nguon.vnn);
  const sk = p.sinh_ke ?? {};
  const so = boDem(1);

  return {
    tieuDe: TIEU_DE_PHIEU_SINH_KE,
    blocks: [
      tieuDe(['HỘ GIA ĐÌNH ĐỀ NGHỊ HỖ TRỢ MÔ HÌNH SINH KẾ']),
      ...mucThongTinHo(nguon, so),
      tieuMuc('II. ĐIỀU KIỆN SẢN XUẤT VÀ NHU CẦU'),
      doan([
        t(`${so()}Số lao động trong hộ: `),
        f(sk.so_lao_dong, DOTS_SHORT),
        t('   Nguồn thu nhập chính: '),
        f(sk.nguon_thu_nhap_chinh, DOTS_MEDIUM),
      ]),
      doan([
        t(`${so()}Diện tích đất sản xuất: `),
        f(soVN(sk.dien_tich_dat_sx), DOTS_SHORT),
        t(' m²; chuồng trại/mặt bằng: '),
        f(sk.chuong_trai, DOTS_MEDIUM),
      ]),
      dongChu(so(), 'Kinh nghiệm sản xuất, kinh doanh', sk.kinh_nghiem),
      luaChon(`${so()}Mô hình đề nghị hỗ trợ:`, danhMuc(PKS_MO_HINH), sk.mo_hinh, 'luoi', {
        value: sk.mo_hinh_khac,
      }),
      dongChu(so(), 'Quy mô, số lượng đề nghị', sk.quy_mo),
      dongChu(so(), 'Vốn, công lao động đối ứng của hộ', sk.von_doi_ung),
      dongChu(so(), 'Hiệu quả dự kiến', sk.hieu_qua_du_kien),
      dongChu(so(), 'Người theo dõi, hướng dẫn kỹ thuật', sk.nguoi_huong_dan),
      ...mucHoanCanhVaNguonKhac(p.chung, so),
      ...mucYKienToCongTac(nguon, so),
    ],
  };
}
