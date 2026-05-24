import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { useCan } from '@/hooks/use-can';
import { useAuthStore } from '@/store/useStore';
import { getThongTinToChuc } from '@/features/he-thong/thong-tin-to-chuc/services/thong-tin-to-chuc-service';
import { useMttqCanBoList } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo';
import DocumentListPreviewLayout, {
  type DocumentListDownloadFormat,
} from '@/components/shared/DocumentListPreviewLayout';
import MttqTapHuanInDanhSachDocument, {
  TAP_HUAN_IN_DANH_SACH_PRINT_ROOT_ID,
} from '../components/mttq-tap-huan-in-danh-sach-document';
import { useMttqLopTapHuanDetail } from '../hooks/use-mttq-tap-huan';
import { useMttqLopTapHuanViewer } from '../hooks/use-mttq-tap-huan-viewer';
import { buildTapHuanInDanhSachDocumentModel } from '../utils/build-tap-huan-in-danh-sach-document';
import { downloadTapHuanListDocx } from '../utils/download-tap-huan-list-docx';
import { downloadTapHuanListPdf } from '../utils/download-tap-huan-list-pdf';
import { downloadTapHuanListXlsx } from '../utils/download-tap-huan-list-xlsx';
import { printTapHuanInDanhSachDocument } from '../utils/print-tap-huan-in-danh-sach';

const LIST_PATH = '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-tap-huan';
const PREVIEW_PREFIX = 'mttq-tap-huan-danh-sach-preview';

const MttqLopTapHuanInDanhSachPage: React.FC = () => {
  const { lopId: lopIdParam } = useParams<{ lopId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranTrainingList');
  const didRedirect = useRef(false);
  const pdfBusy = useRef(false);

  const lopId = String(lopIdParam ?? '').trim();
  const { data: lop, isLoading, isError } = useMttqLopTapHuanDetail(lopId || null);
  const viewer = useMttqLopTapHuanViewer();
  const canViewCanBo = useCan('view', 'matTranOfficerList');
  const { data: canBoList = [] } = useMttqCanBoList({ enabled: canViewCanBo });

  const { data: company } = useQuery({
    queryKey: queryKeys.thongTinToChuc.singleton,
    queryFn: getThongTinToChuc,
    ...masterDataQueryOptions,
  });

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranTapHuan.noViewPermission'));
    navigate(LIST_PATH, { replace: true });
  }, [user, canView, navigate]);

  useEffect(() => {
    if (!lopId || isLoading) return;
    if (!isError && lop === null) {
      toast.error(txt('matTranTapHuan.service.notFound'));
      navigate(LIST_PATH, { replace: true });
    }
  }, [lopId, isLoading, isError, lop, navigate]);

  const canBoMap = useMemo(() => {
    const m = new Map<string, (typeof canBoList)[number]>();
    for (const c of canBoList) m.set(String(c.id), c);
    return m;
  }, [canBoList]);

  const docModel = useMemo(
    () => (lop ? buildTapHuanInDanhSachDocumentModel(lop, company, viewer, canBoMap) : null),
    [lop, company, viewer, canBoMap],
  );

  const fileBase = useMemo(() => {
    const slug = lop?.ten_lop_tap_huan?.trim().replace(/\s+/g, '-').slice(0, 40);
    return slug
      ? `${txt('matTranTapHuan.printPreview.fileName')}-${slug}`
      : txt('matTranTapHuan.printPreview.fileName');
  }, [lop?.ten_lop_tap_huan]);

  const handleBack = useCallback(() => {
    if (lopId) {
      navigate(`${LIST_PATH}?open=${encodeURIComponent(lopId)}`);
    } else {
      navigate(LIST_PATH);
    }
  }, [navigate, lopId]);

  const handlePrint = useCallback(() => {
    const el = document.getElementById(TAP_HUAN_IN_DANH_SACH_PRINT_ROOT_ID);
    if (!el) {
      toast.error(txt('common.error'));
      return;
    }
    const ok = printTapHuanInDanhSachDocument(el, txt('matTranTapHuan.printPreview.documentTitle'));
    if (!ok) toast.error(txt('matTranTapHuan.printPreview.printPopupBlocked'));
  }, []);

  const handleDownload = useCallback(
    async (format: DocumentListDownloadFormat) => {
      if (!docModel) return;

      try {
        if (format === 'pdf') {
          if (pdfBusy.current) return;
          pdfBusy.current = true;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const el = document.getElementById(TAP_HUAN_IN_DANH_SACH_PRINT_ROOT_ID);
          if (!el) {
            toast.error(txt('common.error'));
            return;
          }
          await downloadTapHuanListPdf(el, fileBase);
        } else if (format === 'docx') {
          await downloadTapHuanListDocx(docModel, fileBase);
        } else {
          await downloadTapHuanListXlsx(docModel, fileBase);
        }
      } catch {
        toast.error(txt('common.error'));
      } finally {
        pdfBusy.current = false;
      }
    },
    [docModel, fileBase],
  );

  if (!canView) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isLoading || !lop || !docModel) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DocumentListPreviewLayout
      previewClassPrefix={PREVIEW_PREFIX}
      onBack={handleBack}
      onPrint={handlePrint}
      onDownload={handleDownload}
      downloadDisabled={false}
    >
      <MttqTapHuanInDanhSachDocument model={docModel} />
    </DocumentListPreviewLayout>
  );
};

export default MttqLopTapHuanInDanhSachPage;
