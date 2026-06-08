import React from 'react';
import { useLocation } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import SubmenuPlaceholder from '../../components/placeholder/SubmenuPlaceholder';
import { txt } from '../../lib/text';

/** Đường dẫn con → key tiêu đề trong `lib/text/ui.ts` */
const PATH_TO_TITLE_KEY: Record<string, string> = {
  '/phan-bien-xa-hoi/thuc-hien-phan-bien-xa-hoi': 'page.phanBienXaHoiDashboard.thucHien',
  '/phan-bien-xa-hoi/thiet-lap-danh-muc': 'page.phanBienXaHoiDashboard.thietLapDanhMuc',
  '/phan-bien-xa-hoi/thong-ke-phan-bien-xa-hoi': 'page.phanBienXaHoiDashboard.thongKe',
};

const PhanBienXaHoiModulePlaceholder: React.FC = () => {
  const { pathname } = useLocation();
  const titleKey = PATH_TO_TITLE_KEY[pathname];
  const title = titleKey ? txt(titleKey) : pathname;

  return (
    <SubmenuPlaceholder
      title={title}
      icon={Megaphone}
      backTo="/phan-bien-xa-hoi"
      backLabel={txt('page.phanBienXaHoiDashboard.backToParent')}
    />
  );
};

export default PhanBienXaHoiModulePlaceholder;
