import React from 'react';
import { Building2 } from 'lucide-react';
import SubmenuPlaceholder from '../../../../components/placeholder/SubmenuPlaceholder';
import { txt } from '../../../../lib/text';

const ThamHoiToChucPage: React.FC = () => (
  <SubmenuPlaceholder
    title={txt('page.danTocTonGiaoDashboard.thamHoiToChuc')}
    icon={Building2}
    backTo="/dan-toc-ton-giao"
    backLabel={txt('page.danTocTonGiaoDashboard.backToParent')}
  />
);

export default ThamHoiToChucPage;
