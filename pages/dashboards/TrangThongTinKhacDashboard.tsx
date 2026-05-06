import React from 'react';
import { Newspaper, MessageCircle } from 'lucide-react';
import { txt } from '../../lib/text';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';

const MTTQ_PORTAL_URL = 'http://mattrannghean.org.vn/cms/portal/folder/home';
const ZALO_OA_URL = 'https://oa.zalo.me/home';

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

const TrangThongTinKhacDashboard: React.FC = () => {
  const groups = [
    {
      groupTitle: txt('page.externalLinksDashboard.groupMain'),
      items: [
        {
          title: txt('page.externalLinksDashboard.mttqNews'),
          description: txt('page.externalLinksDashboard.mttqNewsDesc'),
          icon: Newspaper,
          color: 'bg-teal-500',
          action: () => openExternal(MTTQ_PORTAL_URL),
        },
        {
          title: txt('page.externalLinksDashboard.zaloOa'),
          description: txt('page.externalLinksDashboard.zaloOaDesc'),
          icon: MessageCircle,
          color: 'bg-indigo-500',
          action: () => openExternal(ZALO_OA_URL),
        },
      ],
    },
  ];

  return <ModuleDashboardLayout groups={groups} />;
};

export default TrangThongTinKhacDashboard;
