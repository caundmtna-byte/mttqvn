import React from 'react';
import { User } from 'lucide-react';
import SubmenuPlaceholder from '../../../../components/placeholder/SubmenuPlaceholder';
import { txt } from '../../../../lib/text';

const ThamHoiCaNhanPage: React.FC = () => (
  <SubmenuPlaceholder
    title={txt('page.danTocTonGiaoDashboard.thamHoiCaNhan')}
    icon={User}
    backTo="/dan-toc-ton-giao"
    backLabel={txt('page.danTocTonGiaoDashboard.backToParent')}
  />
);

export default ThamHoiCaNhanPage;
