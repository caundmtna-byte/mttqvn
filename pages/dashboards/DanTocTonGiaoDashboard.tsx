import React, { useMemo } from 'react';
import { txt } from '../../lib/text';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  User,
  Star,
  MessageSquareHeart,
} from 'lucide-react';
import ModuleDashboardLayout from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleGroup } from '../../components/dashboard/ModuleDashboardLayout';
import type { ModuleItem } from '../../components/dashboard/SubModuleCard';
import { useAuthStore } from '../../store/useStore';
import { usePermissionGrantStore } from '../../store/usePermissionGrantStore';
import { can } from '../../lib/permissions';
import { appResourceForDashboardNavigatePath } from '../../lib/nav-module-visibility';

const DanTocTonGiaoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const matrixActive = usePermissionGrantStore((s) => s.matrixActive);
  const grantsByModule = usePermissionGrantStore((s) => s.grantsByModule);
  const chucVuCapBac = usePermissionGrantStore((s) => s.chucVuCapBac);

  const groups = useMemo((): ModuleGroup[] => {
    type Draft = Omit<ModuleItem, 'action'> & { path: string };
    const raw: { groupTitle: string; items: Draft[] }[] = [
      {
        groupTitle: txt('page.danTocTonGiaoDashboard.groupThamHoi'),
        items: [
          {
            path: '/dan-toc-ton-giao/tham-hoi/tham-hoi-to-chuc',
            title: txt('page.danTocTonGiaoDashboard.thamHoiToChuc'),
            description: txt('page.danTocTonGiaoDashboard.thamHoiToChucDesc'),
            icon: Building2,
            color: 'bg-blue-500',
          },
          {
            path: '/dan-toc-ton-giao/tham-hoi/tham-hoi-ca-nhan',
            title: txt('page.danTocTonGiaoDashboard.thamHoiCaNhan'),
            description: txt('page.danTocTonGiaoDashboard.thamHoiCaNhanDesc'),
            icon: User,
            color: 'bg-sky-500',
          },
        ],
      },
      {
        groupTitle: txt('page.danTocTonGiaoDashboard.groupThongTin'),
        items: [
          {
            path: '/dan-toc-ton-giao/thong-tin/thong-tin-to-chuc-quan-trong',
            title: txt('page.danTocTonGiaoDashboard.thongTinToChucQuanTrong'),
            description: txt('page.danTocTonGiaoDashboard.thongTinToChucQuanTrongDesc'),
            icon: Star,
            color: 'bg-amber-500',
          },
          {
            path: '/dan-toc-ton-giao/thong-tin/thong-tin-ca-nhan-tieu-bieu',
            title: txt('page.danTocTonGiaoDashboard.thongTinCaNhanTieuBieu'),
            description: txt('page.danTocTonGiaoDashboard.thongTinCaNhanTieuBieuDesc'),
            icon: MessageSquareHeart,
            color: 'bg-rose-500',
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
              action: () => navigate(item.path),
            })
          ),
      }))
      .filter((g) => g.items.length > 0);
  }, [user, matrixActive, grantsByModule, chucVuCapBac, navigate]);

  return <ModuleDashboardLayout groups={groups} />;
};

export default DanTocTonGiaoDashboard;
