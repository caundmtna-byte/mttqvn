import React from 'react';
import {
  Briefcase,
  Cake,
  Calendar,
  GraduationCap,
  HeartHandshake,
  IdCard,
  LandPlot,
  ListChecks,
  UserRound,
  Users,
} from 'lucide-react';
import { txt } from '@/lib/text';
import DetailSection from '@/components/shared/DetailSection';
import DetailField from '@/components/shared/DetailField';
import DetailFieldGrid, { DETAIL_FIELD_SPAN_FULL } from '@/components/shared/DetailFieldGrid';
import { useHoNgheoFull } from '../hooks/use-ho-ngheo';
import { formatHnghNgayDisplay, trimmedHnghDisplay } from '../utils/display-format';

interface Props {
  hoNgheoId: string;
}

/**
 * Nhân khẩu & đời sống của chủ hộ. Tự tải bản đầy đủ: `data` của màn chi tiết
 * thường là dòng của bảng (RPC phân trang), không có các cột này.
 */
const HoNgheoNhanKhauSection: React.FC<Props> = ({ hoNgheoId }) => {
  const { data: full, isLoading } = useHoNgheoFull(hoNgheoId);
  const nk = full?.nhan_khau;
  const emptyCell = isLoading ? txt('hoNgheo.detail.nhanKhauLoading') : txt('common.emptyCell');
  const text = (v: string | null | undefined) => trimmedHnghDisplay(v) ?? emptyCell;
  const num = (v: number | null | undefined) => (v == null ? emptyCell : String(v));

  return (
    <DetailSection title={txt('hoNgheo.detail.sectionNhanKhau')} icon={<UserRound size={14} />}>
      <DetailFieldGrid>
        <DetailField label={txt('hoNgheo.store.gioiTinhCol')} icon={<UserRound size={12} />} value={text(nk?.gioi_tinh)} />
        <DetailField label={txt('hoNgheo.store.namSinhCol')} icon={<Cake size={12} />} value={num(nk?.nam_sinh)} />
        <DetailField
          label={txt('hoNgheo.store.ngayCapCccdCol')}
          icon={<Calendar size={12} />}
          value={formatHnghNgayDisplay(nk?.ngay_cap_cccd) || emptyCell}
        />
        <DetailField label={txt('hoNgheo.store.noiCapCccdCol')} icon={<IdCard size={12} />} value={text(nk?.noi_cap_cccd)} />
        <DetailField
          label={txt('hoNgheo.store.hoTenVoChongCol')}
          icon={<HeartHandshake size={12} />}
          value={text(nk?.ho_ten_vo_chong)}
        />
        <DetailField label={txt('hoNgheo.store.soNhanKhauCol')} icon={<Users size={12} />} value={num(nk?.so_nhan_khau)} />
        <DetailField label={txt('hoNgheo.store.ngheNghiepCol')} icon={<Briefcase size={12} />} value={text(nk?.nghe_nghiep)} />
        <DetailField
          label={txt('hoNgheo.store.trinhDoHocVanCol')}
          icon={<GraduationCap size={12} />}
          value={text(nk?.trinh_do_hoc_van)}
        />
        <DetailField label={txt('hoNgheo.store.viecLamCol')} icon={<Briefcase size={12} />} value={text(nk?.tinh_trang_viec_lam)} />
        <DetailField label={txt('hoNgheo.store.tinhTrangDatCol')} icon={<LandPlot size={12} />} value={text(nk?.tinh_trang_dat)} />
        <DetailField
          className={DETAIL_FIELD_SPAN_FULL}
          label={txt('hoNgheo.store.doiTuongUuTienCol')}
          icon={<ListChecks size={12} />}
          value={text(nk?.doi_tuong_uu_tien)}
        />
      </DetailFieldGrid>
    </DetailSection>
  );
};

export default HoNgheoNhanKhauSection;
