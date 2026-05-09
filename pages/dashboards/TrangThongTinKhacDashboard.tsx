import React, { useMemo } from 'react';
import { Newspaper, MessageCircle, MonitorSmartphone, FileStack } from 'lucide-react';
import { txt } from '../../lib/text';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleGroup } from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleItem } from '../../components/dashboard/SubModuleCard';
import { useAuthStore } from '../../store/useStore';
import { usePermissionGrantStore } from '../../store/usePermissionGrantStore';
import { can } from '../../lib/permissions';
import { appResourceForDashboardNavigatePath } from '../../lib/nav-module-visibility';

const MTTQ_PORTAL_URL = 'http://mattrannghean.org.vn/cms/portal/folder/home';
const ZALO_OA_URL = 'https://oa.zalo.me/home';
const MAT_TRAN_SO_URL = 'https://app.mattranso.vn/';
const QUAN_LY_VAN_BAN_URL = 'https://dhtn.mattran.vn/app-view/';

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

const TrangThongTinKhacDashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  const groups = useMemo((): ModuleGroup[] => {
    type Draft = Omit<ModuleItem, 'action'> & { path: string; externalUrl: string };
    const raw: { groupTitle: string; items: Draft[] }[] = [
      {
        groupTitle: txt('page.externalLinksDashboard.groupMain'),
        items: [
          {
            path: '/trang-thong-tin-khac/tin-tuc-mttq',
            externalUrl: MTTQ_PORTAL_URL,
            title: txt('page.externalLinksDashboard.mttqNews'),
            description: txt('page.externalLinksDashboard.mttqNewsDesc'),
            icon: Newspaper,
            color: 'bg-teal-500',
          },
          {
            path: '/trang-thong-tin-khac/zalo-oa',
            externalUrl: ZALO_OA_URL,
            title: txt('page.externalLinksDashboard.zaloOa'),
            description: txt('page.externalLinksDashboard.zaloOaDesc'),
            icon: MessageCircle,
            color: 'bg-indigo-500',
          },
          {
            path: '/trang-thong-tin-khac/mat-tran-so',
            externalUrl: MAT_TRAN_SO_URL,
            title: txt('page.externalLinksDashboard.matTranSo'),
            description: txt('page.externalLinksDashboard.matTranSoDesc'),
            icon: MonitorSmartphone,
            color: 'bg-cyan-600',
          },
          {
            path: '/trang-thong-tin-khac/quan-ly-van-ban',
            externalUrl: QUAN_LY_VAN_BAN_URL,
            title: txt('page.externalLinksDashboard.quanLyVanBan'),
            description: txt('page.externalLinksDashboard.quanLyVanBanDesc'),
            icon: FileStack,
            color: 'bg-slate-600',
          },
        ],
      },
    ];

    return raw
      .map((g) => ({
        groupTitle: g.groupTitle,
        items: g.items
          .filter((item) => {
            const res = appResourceForDashboardNavigatePath(item.path);
            if (!user || res == null) return true;
            return can(user, 'view', res);
          })
          .map(
            (item): ModuleItem => ({
              title: item.title,
              description: item.description,
              icon: item.icon,
              color: item.color,
              moduleId: item.path,
              action: () => openExternal(item.externalUrl),
            }),
          ),
      }))
      .filter((g) => g.items.length > 0);
  }, [user, matrixActive, grantsByModule, chucVuCapBac]);

  return <ModuleDashboardLayout groups={groups} />;
};

export default TrangThongTinKhacDashboard;
