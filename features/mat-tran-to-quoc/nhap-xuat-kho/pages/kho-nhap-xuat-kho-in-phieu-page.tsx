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
import DocumentListPreviewLayout, {
  type DocumentListDownloadFormat,
} from '@/components/shared/DocumentListPreviewLayout';
import KhoNhapXuatKhoInPhieuDocument, {
  NHAP_XUAT_KHO_IN_PHIEU_PRINT_ROOT_ID,
} from '../components/kho-nhap-xuat-kho-in-phieu-document';
import { useNhapXuatKhoDetail } from '../hooks/use-kho-nhap-xuat-kho';
import { buildNhapXuatKhoPhieuDocumentModel } from '../utils/build-nhap-xuat-kho-phieu-document';
import { downloadNhapXuatKhoPhieuDocx } from '../utils/download-nhap-xuat-kho-phieu-docx';
import { downloadNhapXuatKhoPhieuPdf } from '../utils/download-nhap-xuat-kho-phieu-pdf';
import { downloadNhapXuatKhoPhieuXlsx } from '../utils/download-nhap-xuat-kho-phieu-xlsx';
import { printNhapXuatKhoPhieuDocument } from '../utils/print-nhap-xuat-kho-phieu';

const LIST_PATH = '/an-sinh-xa-hoi/kho-cuu-tro/nhap-xuat-kho';
const PREVIEW_PREFIX = 'nhap-xuat-kho-phieu-preview';

const KhoNhapXuatKhoInPhieuPage: React.FC = () => {
  const { phieuId: phieuIdParam } = useParams<{ phieuId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranReliefStockTransactions');
  const didRedirect = useRef(false);
  const pdfBusy = useRef(false);

  const phieuId = String(phieuIdParam ?? '').trim();
  const { data: phieu, isLoading, isError } = useNhapXuatKhoDetail(phieuId || null);

  const { data: company } = useQuery({
    queryKey: queryKeys.thongTinToChuc.singleton,
    queryFn: getThongTinToChuc,
    ...masterDataQueryOptions,
  });

  useEffect(() => {
    if (!user || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranNhapXuatKho.noViewPermission'));
    navigate(LIST_PATH, { replace: true });
  }, [user, canView, navigate]);

  useEffect(() => {
    if (!phieuId || isLoading) return;
    if (!isError && phieu === null) {
      toast.error(txt('matTranNhapXuatKho.service.notFound'));
      navigate(LIST_PATH, { replace: true });
    }
  }, [phieuId, isLoading, isError, phieu, navigate]);

  const docModel = useMemo(
    () => (phieu ? buildNhapXuatKhoPhieuDocumentModel(phieu, company) : null),
    [phieu, company],
  );

  const fileBase = useMemo(() => {
    const slug = phieu?.so_phieu?.trim().replace(/\s+/g, '-').slice(0, 40);
    return slug
      ? `${txt('matTranNhapXuatKho.printPreview.fileName')}-${slug}`
      : txt('matTranNhapXuatKho.printPreview.fileName');
  }, [phieu?.so_phieu]);

  const handleBack = useCallback(() => {
    if (phieuId) {
      navigate(`${LIST_PATH}?open=${encodeURIComponent(phieuId)}`);
    } else {
      navigate(LIST_PATH);
    }
  }, [navigate, phieuId]);

  const handlePrint = useCallback(() => {
    const el = document.getElementById(NHAP_XUAT_KHO_IN_PHIEU_PRINT_ROOT_ID);
    if (!el) {
      toast.error(txt('common.error'));
      return;
    }
    const title = phieu?.so_phieu ?? txt('matTranNhapXuatKho.printPreview.documentTitle');
    const ok = printNhapXuatKhoPhieuDocument(el, title);
    if (!ok) toast.error(txt('matTranNhapXuatKho.printPreview.printPopupBlocked'));
  }, [phieu?.so_phieu]);

  const handleDownload = useCallback(
    async (format: DocumentListDownloadFormat) => {
      if (!docModel) return;

      try {
        if (format === 'pdf') {
          if (pdfBusy.current) return;
          pdfBusy.current = true;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const el = document.getElementById(NHAP_XUAT_KHO_IN_PHIEU_PRINT_ROOT_ID);
          if (!el) {
            toast.error(txt('common.error'));
            return;
          }
          await downloadNhapXuatKhoPhieuPdf(el, fileBase);
        } else if (format === 'docx') {
          await downloadNhapXuatKhoPhieuDocx(docModel, fileBase);
        } else {
          await downloadNhapXuatKhoPhieuXlsx(docModel, fileBase);
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

  if (isLoading || !phieu || !docModel) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]" aria-busy="true">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <DocumentListPreviewLayout
      previewClassPrefix={PREVIEW_PREFIX}
      pageTitle={txt('matTranNhapXuatKho.printPreview.pageTitle')}
      onBack={handleBack}
      onPrint={handlePrint}
      onDownload={handleDownload}
      downloadDisabled={false}
    >
      <KhoNhapXuatKhoInPhieuDocument model={docModel} />
    </DocumentListPreviewLayout>
  );
};

export default KhoNhapXuatKhoInPhieuPage;
