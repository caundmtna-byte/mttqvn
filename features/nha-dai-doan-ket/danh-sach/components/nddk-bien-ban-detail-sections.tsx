import React from 'react';
import {
  Calendar,
  ClipboardCheck,
  ClipboardList,
  Coins,
  FileSignature,
  HandCoins,
  Home,
  MapPin,
  Ruler,
  StickyNote,
  UserRound,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import type { NddkBienBan, NddkNguoiThamGia } from '../core/types';
import { useNhaDaiDoanKetFull } from '../hooks/use-nha-dai-doan-ket';
import { isNguoiThamGiaEmpty } from '../utils/bien-ban-json';
import {
  formatNddkNgayDisplay,
  formatNddkSoTienDisplay,
  trimmedNddkDisplay,
} from '../utils/display-format';

interface Props {
  nddkId: string;
}

function nguoiText(p: NddkNguoiThamGia | null | undefined): string | undefined {
  if (!p || isNguoiThamGiaEmpty(p)) return undefined;
  return [p.ho_ten, p.chuc_vu].filter((s) => s.trim()).join(' — ');
}

function nguoiFlat(hoTen: string | null, chucVu: string | null): string | undefined {
  return nguoiText({ ho_ten: hoTen ?? '', chuc_vu: chucVu ?? '' });
}

function coKhaoSat(b: NddkBienBan): boolean {
  return Boolean(
    b.ngay_khao_sat || b.hien_trang_nha || b.hoan_canh_gia_dinh || b.nhu_cau_ho_tro || b.ghi_chu_khao_sat,
  );
}

function coHoanThanh(b: NddkBienBan): boolean {
  return Boolean(
    b.ngay_kiem_tra_hoan_thanh ||
      b.thanh_phan_kiem_tra ||
      b.dien_tich_san != null ||
      b.phan_nen ||
      b.phan_mai ||
      b.phan_khung_tuong ||
      b.tong_gia_tri != null ||
      b.nguon_khac.length > 0,
  );
}

function coBanGiao(b: NddkBienBan): boolean {
  return Boolean(
    b.ngay_ban_giao ||
      b.dia_diem_ban_giao ||
      b.ban_giao_ho_ten ||
      b.lam_chung_ho_ten ||
      b.so_quyet_dinh ||
      b.ngay_quyet_dinh,
  );
}

const Multiline: React.FC<{ value: string | null }> = ({ value }) =>
  trimmedNddkDisplay(value) ? (
    <p className="whitespace-pre-wrap break-words text-body-sm text-foreground">{value}</p>
  ) : null;

/**
 * Dữ liệu 3 biên bản ở màn chi tiết — section nào chưa có gì thì ẩn.
 * Tự tải bản đầy đủ vì `data` của màn chi tiết là dòng của bảng (thiếu cột).
 */
const NddkBienBanDetailSections: React.FC<Props> = ({ nddkId }) => {
  const { data: full } = useNhaDaiDoanKetFull(nddkId);
  const b = full?.bien_ban;
  if (!b) return null;
  const emptyCell = txt('common.emptyCell');
  const tp = b.thanh_phan_kiem_tra;

  return (
    <>
      {coKhaoSat(b) ? (
        <DetailSection
          title={txt('nhaDaiDoanKet.form.sectionKhaoSat')}
          icon={<ClipboardList size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.ngayKhaoSat')}
              icon={<Calendar size={12} />}
              value={formatNddkNgayDisplay(b.ngay_khao_sat) || undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.nhuCauHoTro')}
              icon={<Home size={12} />}
              value={b.nhu_cau_ho_tro ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('nhaDaiDoanKet.bienBan.hienTrangNha')}
              icon={<Home size={12} />}
              value={b.hien_trang_nha ? <Multiline value={b.hien_trang_nha} /> : undefined}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('nhaDaiDoanKet.bienBan.hoanCanhGiaDinh')}
              icon={<Users size={12} />}
              value={b.hoan_canh_gia_dinh ? <Multiline value={b.hoan_canh_gia_dinh} /> : undefined}
              emptyText={emptyCell}
            />
            {b.ghi_chu_khao_sat ? (
              <DetailField
                className={DETAIL_FIELD_SPAN_FULL}
                label={txt('nhaDaiDoanKet.bienBan.ghiChuKhaoSat')}
                icon={<StickyNote size={12} />}
                value={<Multiline value={b.ghi_chu_khao_sat} />}
              />
            ) : null}
          </DetailFieldGrid>
        </DetailSection>
      ) : null}

      {coHoanThanh(b) ? (
        <DetailSection
          title={txt('nhaDaiDoanKet.form.sectionHoanThanh')}
          icon={<ClipboardCheck size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.ngayKiemTra')}
              icon={<Calendar size={12} />}
              value={formatNddkNgayDisplay(b.ngay_kiem_tra_hoan_thanh) || undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.dienTichSan')}
              icon={<Ruler size={12} />}
              value={b.dien_tich_san != null ? String(b.dien_tich_san) : undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.daiDienBcd')}
              icon={<UserRound size={12} />}
              value={nguoiText(tp?.bcd)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.daiDienUbnd')}
              icon={<UserRound size={12} />}
              value={nguoiText(tp?.ubnd)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.daiDienMttq')}
              icon={<UserRound size={12} />}
              value={nguoiText(tp?.mttq)}
              emptyText={emptyCell}
            />
            {(tp?.thon ?? []).map((p, i) => (
              <DetailField
                key={`thon-${i}`}
                label={txt('nhaDaiDoanKet.bienBan.daiDienThonN', { n: String(i + 1) })}
                icon={<UserRound size={12} />}
                value={nguoiText(p)}
                emptyText={emptyCell}
              />
            ))}
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('nhaDaiDoanKet.bienBan.phanNen')}
              icon={<Home size={12} />}
              value={trimmedNddkDisplay(b.phan_nen) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('nhaDaiDoanKet.bienBan.phanMai')}
              icon={<Home size={12} />}
              value={trimmedNddkDisplay(b.phan_mai) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              className={DETAIL_FIELD_SPAN_FULL}
              label={txt('nhaDaiDoanKet.bienBan.phanKhungTuong')}
              icon={<Home size={12} />}
              value={trimmedNddkDisplay(b.phan_khung_tuong) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.tongGiaTri')}
              icon={<Coins size={12} />}
              value={formatNddkSoTienDisplay(b.tong_gia_tri) || undefined}
              emptyText={emptyCell}
            />
            {b.nguon_khac.map((n, i) => (
              <DetailField
                key={`nguon-${i}`}
                label={txt('nhaDaiDoanKet.bienBan.nguonKhacTenN', { n: String(i + 1) })}
                icon={<HandCoins size={12} />}
                value={
                  [n.ten, formatNddkSoTienDisplay(n.so_tien)].filter(Boolean).join(': ') || undefined
                }
                emptyText={emptyCell}
              />
            ))}
          </DetailFieldGrid>
        </DetailSection>
      ) : null}

      {coBanGiao(b) ? (
        <DetailSection
          title={txt('nhaDaiDoanKet.form.sectionBanGiao')}
          icon={<HandCoins size={14} />}
          variant="primary"
        >
          <DetailFieldGrid>
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.ngayBanGiao')}
              icon={<Calendar size={12} />}
              value={formatNddkNgayDisplay(b.ngay_ban_giao) || undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.diaDiemBanGiao')}
              icon={<MapPin size={12} />}
              value={trimmedNddkDisplay(b.dia_diem_ban_giao) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.benGiaoTien')}
              icon={<UserRound size={12} />}
              value={nguoiFlat(b.ban_giao_ho_ten, b.ban_giao_chuc_vu)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.benLamChung')}
              icon={<UserRound size={12} />}
              value={nguoiFlat(b.lam_chung_ho_ten, b.lam_chung_chuc_vu)}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.soQuyetDinh')}
              icon={<FileSignature size={12} />}
              value={trimmedNddkDisplay(b.so_quyet_dinh) ?? undefined}
              emptyText={emptyCell}
            />
            <DetailField
              label={txt('nhaDaiDoanKet.bienBan.ngayQuyetDinh')}
              icon={<Calendar size={12} />}
              value={formatNddkNgayDisplay(b.ngay_quyet_dinh) || undefined}
              emptyText={emptyCell}
            />
          </DetailFieldGrid>
        </DetailSection>
      ) : null}
    </>
  );
};

export default NddkBienBanDetailSections;
