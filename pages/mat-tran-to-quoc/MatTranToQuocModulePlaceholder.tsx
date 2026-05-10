import React from 'react';
import { useLocation } from 'react-router-dom';
import { Flag } from 'lucide-react';
import SubmenuPlaceholder from '../../components/placeholder/SubmenuPlaceholder';
import { txt } from '../../lib/text';

/** Đường dẫn con → key tiêu đề trong `lib/text/ui.ts` */
const PATH_TO_TITLE_KEY: Record<string, string> = {
  '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan': 'page.matTranDashboard.trainingList',
  '/mat-tran-to-quoc/uy-vien-uy-ban/nhiem-ky': 'page.matTranDashboard.term',
  '/mat-tran-to-quoc/uy-vien-uy-ban/ky-hop': 'page.matTranDashboard.session',
  '/mat-tran-to-quoc/uy-vien-uy-ban/danh-sach-uy-vien': 'page.matTranDashboard.committeeMembers',
  '/mat-tran-to-quoc/kho-cuu-tro/dot-cuu-tro': 'page.matTranDashboard.reliefCampaign',
  '/mat-tran-to-quoc/kho-cuu-tro/hang-hoa': 'page.matTranDashboard.reliefGoods',
  '/mat-tran-to-quoc/kho-cuu-tro/nhap-xuat-kho': 'page.matTranDashboard.reliefStockTransactions',
  '/mat-tran-to-quoc/kho-cuu-tro/ton-kho': 'page.matTranDashboard.reliefInventory',
  '/mat-tran-to-quoc/kho-cuu-tro/danh-sach-kho': 'page.matTranDashboard.reliefWarehouseList',
  '/mat-tran-to-quoc/kho-cuu-tro/don-vi-ho-tro': 'page.matTranDashboard.reliefSupportUnits',
};

const MatTranToQuocModulePlaceholder: React.FC = () => {
  const { pathname } = useLocation();
  const titleKey = PATH_TO_TITLE_KEY[pathname];
  const title = titleKey ? txt(titleKey) : pathname;

  return (
    <SubmenuPlaceholder
      title={title}
      icon={Flag}
      backTo="/mat-tran-to-quoc"
      backLabel={txt('page.matTranDashboard.backToParent')}
    />
  );
};

export default MatTranToQuocModulePlaceholder;
