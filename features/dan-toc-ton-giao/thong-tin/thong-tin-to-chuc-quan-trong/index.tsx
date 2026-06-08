import React from 'react';
import { Star } from 'lucide-react';
import SubmenuPlaceholder from '../../../../components/placeholder/SubmenuPlaceholder';
import { txt } from '../../../../lib/text';

const ThongTinToChucQuanTrongPage: React.FC = () => (
  <SubmenuPlaceholder
    title={txt('page.danTocTonGiaoDashboard.thongTinToChucQuanTrong')}
    icon={Star}
    backTo="/dan-toc-ton-giao"
    backLabel={txt('page.danTocTonGiaoDashboard.backToParent')}
  />
);

export default ThongTinToChucQuanTrongPage;
