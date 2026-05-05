import React from 'react';
import { txt } from '../../../lib/text';
import { useNavigate, useLocation } from 'react-router-dom';
import { getParentPath } from '../../../components/shared/Breadcrumbs';
import { ArrowLeft } from 'lucide-react';
import { useUIStore } from '../../../store/useStore';
import { toast } from 'sonner';
import CompanyInfoForm from './components/thong-tin-cong-ty-form';
import type { CompanyFormValues } from './core/types';

const CompanyInfoPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { companyInfo, setCompanyInfo } = useUIStore();

  const handleSubmit = async (data: CompanyFormValues & { appLogo: string | null }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    setCompanyInfo({
      appName: data.appName,
      appDescription: data.appDescription ?? '',
      appLogo: data.appLogo,
      companyName: data.companyName,
      taxId: data.taxId,
      address: data.address ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      website: data.website ?? '',
    });
    toast.success(txt('company.saveSuccess'));
  };

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

      <CompanyInfoForm
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

export default CompanyInfoPage;
