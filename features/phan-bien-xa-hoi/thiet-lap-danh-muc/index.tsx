import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import TabGroup from '@/components/ui/TabGroup';
import PageTabRow from '@/components/shared/PageTabRow';
import { PbxhThietLapListPanel } from './components/pbxh-thiet-lap-list-panel';
import { usePbxhThietLapAll } from './hooks/use-pbxh-thiet-lap';
import { PBXH_THIET_LAP_LOAI, PBXH_LOAI_TAB_LABEL_KEY, type PbxhThietLapLoai } from './core/types';
import { usePbxhThietLapStore } from './store/usePbxhThietLapStore';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { useCan } from '@/hooks/use-can';
import { useTabSearchParam } from '@/hooks/use-tab-search-param';

const ThietLapDanhMucPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'phanBienThietLapDanhMuc');
  // Chờ ma trận quyền tải xong mới quyết định chuyển hướng — nếu không, sau mỗi
  // lần F5 người dùng bị đá ra ngoài trong lúc quyền chưa về.
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || permissionsLoading || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('pbxhThietLap.noViewPermission'));
    navigate('/phan-bien-xa-hoi', { replace: true });
  }, [user, permissionsLoading, canView, navigate]);

  const [activeLoai, setActiveLoai] = useTabSearchParam(PBXH_THIET_LAP_LOAI, 'doi_tuong');
  const { data: allRowsRaw, isLoading, isError, refetch } = usePbxhThietLapAll({ enabled: canView });
  const store = usePbxhThietLapStore();

  const allRows = Array.isArray(allRowsRaw) ? allRowsRaw : [];
  const items = useMemo(() => allRows.filter((r) => r.loai === activeLoai), [allRows, activeLoai]);

  const { resetState } = store;

  useEffect(() => {
    resetState();
  }, [activeLoai, resetState]);

  const tabs = useMemo(
    () =>
      PBXH_THIET_LAP_LOAI.map((id) => ({
        id,
        label: txt(PBXH_LOAI_TAB_LABEL_KEY[id]),
      })),
    [],
  );

  const goBack = () => navigate('/phan-bien-xa-hoi');

  if (!canView) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[40vh] px-4"
        aria-busy="true"
        aria-label={txt('common.loading')}
      >
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const tabsSlot = (
    <TabGroup
      tabs={tabs}
      activeTab={activeLoai}
      onChange={(id) => setActiveLoai(id as PbxhThietLapLoai)}
      className="shrink-0"
    />
  );

  return (
    <div className="flex flex-col h-page relative">
      <PageTabRow>{tabsSlot}</PageTabRow>
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden relative z-0">
        <PbxhThietLapListPanel
          loai={activeLoai}
          items={items}
          isLoading={isLoading}
          isError={isError}
          onRetry={() => void refetch()}
          store={store}
          onPageBack={goBack}
        />
      </div>
    </div>
  );
};

export default ThietLapDanhMucPage;
