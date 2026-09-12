import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { txt } from '@/lib/text';
import { queryKeys } from '@/lib/query-keys';
import { masterDataQueryOptions } from '@/lib/supabase/query-config';
import { useCan } from '@/hooks/use-can';
import { useAuthStore } from '@/store/useStore';
import { usePermissionGrantStore } from '@/store/usePermissionGrantStore';
import { getThongTinToChuc } from '@/features/he-thong/thong-tin-to-chuc/services/thong-tin-to-chuc-service';
import DocumentListPreviewLayout, {
  type DocumentListDownloadFormat,
} from '@/components/shared/DocumentListPreviewLayout';
import VanBanHanhChinhDocument from '../components/van-ban-hanh-chinh-document';
import { TANG_LUONG_LIST_PATH } from '../core/constants';
import { useMttqTangLuongDetail } from '../hooks/use-mttq-tang-luong';
import { canViewTangLuongRow, useMttqTangLuongViewer } from '../hooks/use-mttq-tang-luong-viewer';
import { buildTangLuongQuyetDinhDocumentModel } from '../utils/build-tang-luong-quyet-dinh-document';
import { downloadVanBanDocx } from '../utils/download-van-ban-docx';
import { downloadVanBanPdf } from '../utils/download-van-ban-pdf';
import { downloadVanBanXlsx } from '../utils/download-van-ban-xlsx';
import { printVanBanDocument } from '../utils/print-van-ban';

const PREVIEW_PREFIX = 'mttq-van-ban-preview';
const PRINT_ROOT_ID = 'tang-luong-quyet-dinh-print-root';

/** Bỏ dấu + gạch nối để ghép vào tên file tải về. */
function slugTen(ten: string): string {
  return ten
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9-]/g, '')
    .slice(0, 40);
}

const MttqTangLuongInQuyetDinhPage: React.FC = () => {
  const { tangLuongId: idParam } = useParams<{ tangLuongId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranSalaryIncreaseList');
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);
  const pdfBusy = useRef(false);

  const id = String(idParam ?? '').trim();
  const { data: row, isLoading, isError } = useMttqTangLuongDetail(id || null);
  const viewer = useMttqTangLuongViewer();

  const { data: company } = useQuery({
    queryKey: queryKeys.thongTinToChuc.singleton,
    queryFn: getThongTinToChuc,
    ...masterDataQueryOptions,
  });

  useEffect(() => {
    if (!user || permissionsLoading || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranTangLuong.noViewPermission'));
    navigate(TANG_LUONG_LIST_PATH, { replace: true });
  }, [user, permissionsLoading, canView, navigate]);

  useEffect(() => {
    if (!id || isLoading) return;
    if (!isError && row === null) {
      toast.error(txt('matTranTangLuong.printPreview.notFound'));
      navigate(TANG_LUONG_LIST_PATH, { replace: true });
    }
  }, [id, isLoading, isError, row, navigate]);

  // Phạm vi dòng: bản ghi ngoài phạm vi xem thì không được mở bản in.
  useEffect(() => {
    if (!row || permissionsLoading || didRedirect.current) return;
    if (canViewTangLuongRow(viewer, row)) return;
    didRedirect.current = true;
    toast.error(txt('matTranTangLuong.noViewPermission'));
    navigate(TANG_LUONG_LIST_PATH, { replace: true });
  }, [row, viewer, permissionsLoading, navigate]);

  const docModel = useMemo(
    () => (row ? buildTangLuongQuyetDinhDocumentModel(row, { company }) : null),
    [row, company],
  );

  const fileBase = useMemo(() => {
    const base = txt('matTranTangLuong.printPreview.fileName');
    const slug = docModel ? slugTen(docModel.tenCanBo) : '';
    return slug ? `${base}-${slug}` : base;
  }, [docModel]);

  const handleBack = useCallback(() => {
    navigate(id ? `${TANG_LUONG_LIST_PATH}?open=${encodeURIComponent(id)}` : TANG_LUONG_LIST_PATH);
  }, [navigate, id]);

  const handlePrint = useCallback(() => {
    const el = document.getElementById(PRINT_ROOT_ID);
    if (!el) {
      toast.error(txt('common.error'));
      return;
    }
    const ok = printVanBanDocument(el, txt('matTranTangLuong.printPreview.pageTitle'));
    if (!ok) toast.error(txt('matTranTangLuong.printPreview.printPopupBlocked'));
  }, []);

  const handleDownload = useCallback(
    async (format: DocumentListDownloadFormat) => {
      if (!docModel) return;
      try {
        if (format === 'pdf') {
          if (pdfBusy.current) return;
          pdfBusy.current = true;
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          const el = document.getElementById(PRINT_ROOT_ID);
          if (!el) {
            toast.error(txt('common.error'));
            return;
          }
          await downloadVanBanPdf(el, fileBase);
        } else if (format === 'docx') {
          await downloadVanBanDocx(docModel, fileBase);
        } else {
          downloadVanBanXlsx(docModel, fileBase);
        }
      } catch {
        toast.error(txt('common.error'));
      } finally {
        pdfBusy.current = false;
      }
    },
    [docModel, fileBase],
  );

  if (!canView || isLoading || !row || !docModel) {
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
      <VanBanHanhChinhDocument model={docModel} rootId={PRINT_ROOT_ID} />
    </DocumentListPreviewLayout>
  );
};

export default MttqTangLuongInQuyetDinhPage;
