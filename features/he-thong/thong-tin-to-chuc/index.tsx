import React, { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { txt } from '../../../lib/text';
import { useNavigate, useLocation } from 'react-router-dom';
import { getParentPath } from '../../../components/shared/Breadcrumbs';
import { ArrowLeft } from 'lucide-react';
import { useAuthStore, useUIStore } from '../../../store/useStore';
import { toast } from 'sonner';
import { useCan } from '@/hooks/use-can';
import ThongTinToChucForm from './components/thong-tin-to-chuc-form';
import type { CompanyFormValues } from './core/types';
import { saveThongTinToChuc } from './services/thong-tin-to-chuc-service';
import { isSupabase } from '@/lib/data/config';
import { queryKeys } from '@/lib/query-keys';

const ThongTinToChucPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'company');
  const navigate = useNavigate();
  const location = useLocation();
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('company.noViewPermission'));
    navigate('/he-thong', { replace: true });
  }, [user, canView, navigate]);

  const { companyInfo, setCompanyInfo } = useUIStore();
  const queryClient = useQueryClient();

  const handleSubmit = async (data: CompanyFormValues & { appLogo: string | null }) => {
    try {
      const saved = await saveThongTinToChuc(data);
      setCompanyInfo(saved);
      if (isSupabase()) {
        queryClient.setQueryData(queryKeys.thongTinToChuc.singleton, saved);
      }
      toast.success(txt('company.saveSuccess'));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Lỗi lưu');
    }
  };

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

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            const p = getParentPath(location.pathname, txt);
            navigate(p ?? '/he-thong');
          }}
          aria-label={txt('nav.back')}
          className="shrink-0 h-8 px-2.5 flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted transition-all active:scale-[0.98] mt-0.5"
        >
          <ArrowLeft size={15} className="stroke-[2.5px]" />
          <span className="text-xs font-medium hidden sm:inline">{txt('common.back')}</span>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{txt('company.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{txt('company.description')}</p>
        </div>
      </div>

      <ThongTinToChucForm
        initialValues={{
          ...companyInfo,
          appDescription: companyInfo.appDescription ?? '',
          address: companyInfo.address ?? '',
          phone: companyInfo.phone ?? '',
          email: companyInfo.email ?? '',
          website: companyInfo.website ?? '',
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default ThongTinToChucPage;
