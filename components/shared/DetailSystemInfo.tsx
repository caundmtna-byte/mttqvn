import React from 'react';
import { CalendarClock, CalendarPlus, Clock, User, UserCog } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatDisplayDateTimeShort } from '@/lib/display-format';
import DetailSection from './DetailSection';
import DetailFieldGrid from './DetailFieldGrid';
import DetailField from './DetailField';

interface Props {
  /** Họ tên (hoặc tên tài khoản) người tạo — `null` khi bản ghi cũ chưa lưu. */
  nguoiTao: string | null | undefined;
  tgTao: string | null | undefined;
  nguoiCapNhat: string | null | undefined;
  tgCapNhat: string | null | undefined;
}

/**
 * Mục "Thông tin hệ thống" ở màn chi tiết — đủ 4 trường: người tạo, thời gian tạo,
 * người cập nhật, thời gian cập nhật. Hai cột người do trigger máy chủ gán
 * (`fn_gan_id_nguoi_tao`, `fn_gan_nguoi_cap_nhat`).
 */
const DetailSystemInfo: React.FC<Props> = ({ nguoiTao, tgTao, nguoiCapNhat, tgCapNhat }) => {
  const empty = txt('common.emptyCell');
  const thoiGian = (v: string | null | undefined) => {
    const s = formatDisplayDateTimeShort(v);
    return s ? <span className="tabular-nums">{s}</span> : undefined;
  };
  return (
    <DetailSection title={txt('shared.systemInfo.title')} icon={<Clock size={14} />} variant="primary">
      <DetailFieldGrid>
        <DetailField label={txt('shared.systemInfo.nguoiTao')} icon={<User size={12} />} value={nguoiTao || undefined} emptyText={empty} />
        <DetailField label={txt('shared.systemInfo.tgTao')} icon={<CalendarPlus size={12} />} value={thoiGian(tgTao)} emptyText={empty} />
        <DetailField label={txt('shared.systemInfo.nguoiCapNhat')} icon={<UserCog size={12} />} value={nguoiCapNhat || undefined} emptyText={empty} />
        <DetailField label={txt('shared.systemInfo.tgCapNhat')} icon={<CalendarClock size={12} />} value={thoiGian(tgCapNhat)} emptyText={empty} />
      </DetailFieldGrid>
    </DetailSection>
  );
};

export default DetailSystemInfo;
