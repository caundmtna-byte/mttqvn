import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarRange } from 'lucide-react';
import { txt } from '@/lib/text';
import DashboardToolbar from '@/components/shared/DashboardToolbar';
import { useAuthStore } from '@/store/useStore';
import { useCan } from '@/hooks/use-can';

const ChuongTrinhNamPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'annualPrograms');
  const didRedirect = useRef(false);

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('chuongTrinhNam.noViewPermission'));
    navigate('/quan-ly-giao-viec', { replace: true });
  }, [user, canView, navigate]);

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
    <div className="flex flex-col h-page relative pb-6">
      <DashboardToolbar onBack={() => navigate('/quan-ly-giao-viec')} />
      <div className="flex-1 min-h-0 flex flex-col mt-1.5 rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col items-center justify-center flex-1 min-h-[40vh] px-6 py-10 text-center gap-3">
          <CalendarRange className="h-14 w-14 text-muted-foreground shrink-0" aria-hidden />
          <h1 className="text-lg font-semibold text-foreground">{txt('page.taskDashboard.yearProgram')}</h1>
          <p className="text-sm text-muted-foreground max-w-md">{txt('page.profile.comingSoonDesc')}</p>
        </div>
      </div>
    </div>
  );
};

export default ChuongTrinhNamPage;
