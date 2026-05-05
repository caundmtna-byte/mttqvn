/**
 * Primitives theo nhóm “view type” ERP — import có chủ đích.
 * Catalog đầy đủ: [`VIEW_TYPE_REGISTRY`](../../lib/view-types/registry.ts), tài liệu: `docs/view-types.md`.
 */

/* —— table —— */
export { default as GenericTable } from '../shared/GenericTable';
export { default as GenericToolbar } from '../shared/GenericToolbar';
export { default as TablePaginationFooter } from '../shared/TablePaginationFooter';
export { default as ColumnManager } from '../shared/ColumnManager';
export { default as ExportDialog } from '../shared/ExportDialog';
export { default as ImportDialog } from '../shared/ImportDialog';

/* —— detail —— */
export { default as GenericDrawer } from '../shared/GenericDrawer';
export { default as DetailSection } from '../shared/DetailSection';
export { default as DetailField } from '../shared/DetailField';
export { default as DetailFieldGrid } from '../shared/DetailFieldGrid';
export { default as DetailToolbar } from '../shared/DetailToolbar';

/* —— form —— */
export { default as FormSection } from '../shared/FormSection';
export { default as FormGrid } from '../shared/FormGrid';
export { FormStepper } from '../shared/FormStepper';
export type { FormStepperProps, FormStepperStep } from '../shared/FormStepper';
export { default as DataField } from '../data-types/DataField';
export { default as RhfDataField } from '../data-types/RhfDataField';

/* —— dashboard —— */
export { default as ModuleDashboardLayout } from '../dashboard/ModuleDashboardLayout';
export { default as SubModuleCard } from '../dashboard/SubModuleCard';

/* —— card_list —— */
export { MobileListCard } from '../shared/MobileListCard';

/* —— master_detail —— */
export { default as GenericSubTableSection } from '../shared/GenericSubTableSection';
export { default as EmbeddedChildDataGrid } from '../shared/EmbeddedChildDataGrid';
export {
  EmbeddedDocumentVersionGrid,
  type DocumentVersionRow,
} from '../shared/EmbeddedDocumentVersionGrid';
export {
  EMBEDDED_CHILD_GRID_DEFAULT_ROW_PX,
  EMBEDDED_CHILD_GRID_DEFAULT_HEAD_PX,
  EMBEDDED_CHILD_GRID_VIRTUAL_THRESHOLD,
} from '../shared/EmbeddedChildDataGrid';

/* —— navigation_shell —— */
export { default as Breadcrumbs } from '../shared/Breadcrumbs';

/* —— security_ui —— */
export { Can } from '../auth/Can';
export type { CanProps } from '../auth/Can';

/* —— feedback_overlay —— */
export { default as EmptyState } from '../shared/EmptyState';
export { default as ConfirmDialog } from '../shared/ConfirmDialog';
