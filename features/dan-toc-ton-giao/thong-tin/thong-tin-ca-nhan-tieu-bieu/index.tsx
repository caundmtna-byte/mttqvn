import React from 'react';
import { MessageSquareHeart } from 'lucide-react';
import SubmenuPlaceholder from '../../../../components/placeholder/SubmenuPlaceholder';
import { txt } from '../../../../lib/text';

const ThongTinCaNhanTieuBieuPage: React.FC = () => (
  <SubmenuPlaceholder
    title={txt('page.danTocTonGiaoDashboard.thongTinCaNhanTieuBieu')}
    icon={MessageSquareHeart}
    backTo="/dan-toc-ton-giao"
    backLabel={txt('page.danTocTonGiaoDashboard.backToParent')}
  />
);

export default ThongTinCaNhanTieuBieuPage;
