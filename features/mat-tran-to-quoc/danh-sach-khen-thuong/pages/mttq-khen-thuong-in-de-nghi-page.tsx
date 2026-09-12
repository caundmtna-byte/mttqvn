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
import { useMttqCanBoList } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/hooks/use-mttq-can-bo';
import DocumentListPreviewLayout, {
  type DocumentListDownloadFormat,
} from '@/components/shared/DocumentListPreviewLayout';
import VanBanHanhChinhDocument from '../components/van-ban-hanh-chinh-document';
import { useMttqKhenThuongDetail } from '../hooks/use-mttq-khen-thuong';
import { useMttqKhenThuongViewer, canViewKhenThuongRow } from '../hooks/use-mttq-khen-thuong-viewer';
import { buildKhenThuongDeNghiDocumentModel } from '../utils/build-khen-thuong-de-nghi-document';
import { downloadVanBanDocx } from '../utils/download-van-ban-docx';
import { downloadVanBanPdf } from '../utils/download-van-ban-pdf';
import { downloadVanBanXlsx } from '../utils/download-van-ban-xlsx';
import { printVanBanDocument } from '../utils/print-van-ban';

const KHEN_THUONG_LIST_PATH = '/mat-tran-to-quoc/tap-huan-khen-thuong/danh-sach-khen-thuong';
const PREVIEW_PREFIX = 'mttq-van-ban-preview';
const PRINT_ROOT_ID = 'khen-thuong-de-nghi-print-root';

const MttqKhenThuongInDeNghiPage: React.FC = () => {
  const { khenThuongId: idParam } = useParams<{ khenThuongId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canView = useCan('view', 'matTranRewardList');
  // Chờ ma trận quyền tải xong mới quyết định chuyển hướng — nếu không, sau mỗi
  // lần F5 người dùng bị đá ra ngoài trong lúc quyền chưa về.
  const permissionsLoading = usePermissionGrantStore((s) => s.matrixLoading);
  const didRedirect = useRef(false);
  const pdfBusy = useRef(false);

  const id = String(idParam ?? '').trim();
  const { data: kt, isLoading, isError } = useMttqKhenThuongDetail(id || null);
  const viewer = useMttqKhenThuongViewer();
  const canViewCanBo = useCan('view', 'matTranOfficerList');
  const { data: canBoList = [] } = useMttqCanBoList({ enabled: canViewCanBo });

  const { data: company } = useQuery({
    queryKey: queryKeys.thongTinToChuc.singleton,
    queryFn: getThongTinToChuc,
    ...masterDataQueryOptions,
  });

  useEffect(() => {
    if (!user || permissionsLoading || canView || didRedirect.current) return;
    didRedirect.current = true;
    toast.error(txt('matTranKhenThuong.noViewPermission'));
    navigate(KHEN_THUONG_LIST_PATH, { replace: true });
  }, [user, permissionsLoading, canView, navigate]);

  useEffect(() => {
    if (!id || isLoading) return;
    if (!isError && kt === null) {
      toast.error(txt('matTranKhenThuong.printPreview.notFound'));
      navigate(KHEN_THUONG_LIST_PATH, { replace: true });
    }
  }, [id, isLoading, isError, kt, navigate]);

  // Phạm vi dòng: quyết định ngoài phạm vi xem thì không được mở bản in.
  useEffect(() => {
    if (!kt || permissionsLoading || didRedirect.current) return;
    if (canViewKhenThuongRow(viewer, kt)) return;
    didRedirect.current = true;
    toast.error(txt('matTranKhenThuong.noViewPermission'));
    navigate(KHEN_THUONG_LIST_PATH, { replace: true });
  }, [kt, viewer, permissionsLoading, navigate]);

  const canBoMap = useMemo(() => {
    const m = new Map<string, (typeof canBoList)[number]>();
    for (const c of canBoList) m.set(String(c.id), c);
    return m;
  }, [canBoList]);

  const docModel = useMemo(
    () =>
      kt ? buildKhenThuongDeNghiDocumentModel(kt, { company, viewer, canBoMap }) : null,
    [kt, company, viewer, canBoMap],
  );

  const fileBase = txt('matTranKhenThuong.printPreview.fileNameDeNghi');

  const handleBack = useCallback(() => {
    navigate(id ? `${KHEN_THUONG_LIST_PATH}?open=${encodeURIComponent(id)}` : KHEN_THUONG_LIST_PATH);
  }, [navigate, id]);

  const handlePrint = useCallback(() => {
    const el = document.getElementById(PRINT_ROOT_ID);
    if (!el) {
      toast.error(txt('common.error'));
      return;
    }
    const ok = printVanBanDocument(el, txt('matTranKhenThuong.printPreview.pageTitleDeNghi'));
    if (!ok) toast.error(txt('matTranKhenThuong.printPreview.printPopupBlocked'));
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

  if (!canView || isLoading || !kt || !docModel) {
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
      {docModel.canhBaoSoQd ? (
        <p className="van-ban-doc__canh-bao print:hidden">
          {txt('matTranKhenThuong.printPreview.canhBaoSoQd')}
        </p>
      ) : null}
      <VanBanHanhChinhDocument model={docModel} rootId={PRINT_ROOT_ID} />
    </DocumentListPreviewLayout>
  );
};

export default MttqKhenThuongInDeNghiPage;
