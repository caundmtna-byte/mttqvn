import React, { useState, useRef, useCallback, useMemo } from 'react';
import { txt } from '../../lib/text';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Download, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import { cn, getErrorMessage, getTodayISODate } from '../../lib/utils';
import { chuanHoaKhoaSoKhop } from '../../lib/vietnamese';
import Combobox, { type Option } from '../ui/Combobox';
import { DIALOG_SIZE } from '../../lib/dialog-sizes';

export interface ImportColumn {
  key: string;
  label: string;
  required?: boolean;
}

export interface ImportTemplateSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

export type ImportErrorRow = {
  rowNum: number;
  data: Record<string, unknown>;
  message: string;
};

export type ImportBatchResult = {
  created?: number;
  /** Số bản ghi đã có bị ghi đè (chỉ chế độ `upsert` / `update`). */
  updated?: number;
  /** Số dòng cố ý không ghi (trùng ở chế độ chỉ-thêm-mới, chưa có ở chế độ chỉ-cập-nhật). */
  skipped?: number;
  errors?: string[];
  errorRows?: ImportErrorRow[];
};

/**
 * Chế độ ghi. Mặc định dialog chỉ có `insert` — đúng hành vi cũ của mọi module;
 * module nào muốn ghi đè phải khai báo `writeModes` để người dùng tự chọn.
 */
export type ImportWriteMode = 'insert' | 'upsert' | 'update';

/** Một cột có thể dùng làm khoá nhận diện dòng trùng. */
export interface ImportMatchColumn {
  key: string;
  label: string;
}

export type ImportRunOptions = {
  mode: ImportWriteMode;
  /** Theo đúng thứ tự người dùng thấy: khoá đầu khớp trước, không thấy mới xét khoá sau. */
  matchKeys: string[];
};

/** Kết quả chạy thử: đếm trước khi ghi, để không ai ghi đè trong vô thức. */
export type ImportDryRunResult = {
  willCreate: number;
  willUpdate: number;
  willSkip: number;
  /** Ghi chú thêm (ví dụ "bỏ qua cột Người tạo vì không đủ quyền"). */
  notes?: string[];
};

/** Metadata attached to each parsed row — stripped by import services before insert. */
export const IMPORT_ROW_NUM_KEY = '__import_row_num';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  columns: ImportColumn[];
  /**
   * Tham số thứ hai là tuỳ chọn ghi của lần chạy này. Callback cũ dạng `(data) => …`
   * vẫn dùng được nguyên vẹn — JS cho phép hàm nhận ít tham số hơn.
   */
  onImport: (
    data: Record<string, unknown>[],
    options: ImportRunOptions,
  ) => Promise<ImportBatchResult | void>;
  templateFileName?: string;
  /** Extra reference sheets appended after the main Template sheet in the downloaded file. */
  templateSheets?: ImportTemplateSheet[];
  /** Khai báo để bật khối chọn chế độ ghi. Bỏ trống = chỉ thêm mới như trước. */
  writeModes?: readonly ImportWriteMode[];
  defaultWriteMode?: ImportWriteMode;
  /** Khai báo để bật khối chọn cột tham chiếu. */
  matchColumns?: readonly ImportMatchColumn[];
  defaultMatchKeys?: readonly string[];
  /** Khai báo để bật bước xem trước (đếm sẽ thêm / sẽ đè / bỏ qua) trước khi ghi. */
  onDryRun?: (
    data: Record<string, unknown>[],
    options: ImportRunOptions,
  ) => Promise<ImportDryRunResult>;
}

type Step = 'upload' | 'mapping' | 'preview' | 'result';

const WRITE_MODE_TEXT: Record<ImportWriteMode, { label: string; hint: string }> = {
  insert: { label: 'shared.import.writeModeInsert', hint: 'shared.import.writeModeInsertHint' },
  upsert: { label: 'shared.import.writeModeUpsert', hint: 'shared.import.writeModeUpsertHint' },
  update: { label: 'shared.import.writeModeUpdate', hint: 'shared.import.writeModeUpdateHint' },
};

/** Dòng đã qua kiểm sơ bộ ở dialog, chờ đẩy xuống service. */
type CollectedRows = {
  parsed: Record<string, unknown>[];
  errors: string[];
  errorRows: ImportErrorRow[];
};

type ImportResultState = {
  success: number;
  updated: number;
  skipped: number;
  errors: string[];
  errorRows: ImportErrorRow[];
};

const emptyResult = (): ImportResultState => ({
  success: 0,
  updated: 0,
  skipped: 0,
  errors: [],
  errorRows: [],
});

const ImportDialog: React.FC<ImportDialogProps> = ({
  open, onClose, columns, onImport, templateFileName = 'template', templateSheets,
  writeModes, defaultWriteMode, matchColumns, defaultMatchKeys, onDryRun,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResultState | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const availableModes = useMemo<readonly ImportWriteMode[]>(
    () => (writeModes && writeModes.length > 0 ? writeModes : ['insert']),
    [writeModes],
  );
  const [writeMode, setWriteMode] = useState<ImportWriteMode>(
    () => defaultWriteMode ?? (writeModes && writeModes[0]) ?? 'insert',
  );
  const [matchKeys, setMatchKeys] = useState<string[]>(
    () => [...(defaultMatchKeys ?? matchColumns?.map((c) => c.key) ?? [])],
  );
  const [dryRun, setDryRun] = useState<ImportDryRunResult | null>(null);
  const [pendingRows, setPendingRows] = useState<CollectedRows | null>(null);
  const [optionError, setOptionError] = useState<string | null>(null);

  const runOptions = useMemo<ImportRunOptions>(
    () => ({ mode: writeMode, matchKeys }),
    [writeMode, matchKeys],
  );
  /** Chỉ chế độ có ghi đè mới cần khoá nhận diện; thêm mới thuần thì không. */
  const needsMatchKeys = writeMode !== 'insert';

  const mappingSelectOptions: Option[] = useMemo(
    () => [
      { value: '', label: txt('shared.import.skipColumn') },
      ...sheetHeaders.map((h) => ({ value: h, label: h })),
    ],
    [sheetHeaders],
  );

  const reset = () => {
    setStep('upload');
    setFile(null);
    setSheetHeaders([]);
    setSheetData([]);
    setMapping({});
    setImporting(false);
    setResult(null);
    setDryRun(null);
    setPendingRows(null);
    setOptionError(null);
    setWriteMode(defaultWriteMode ?? availableModes[0]);
    setMatchKeys([...(defaultMatchKeys ?? matchColumns?.map((c) => c.key) ?? [])]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const buildOriginalRowData = useCallback(
    (row: unknown[]): Record<string, unknown> => {
      const data: Record<string, unknown> = {};
      sheetHeaders.forEach((h, i) => {
        data[h] = row[i] ?? '';
      });
      return data;
    },
    [sheetHeaders],
  );

  const parseFile = useCallback(async (f: File) => {
    setFile(f);
    try {
      const mod = await import('xlsx');
      const XLSX = mod.default ?? mod;
      const buffer = await f.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });

      if (json.length < 2) {
        setResult({ ...emptyResult(), errors: [txt('shared.import.noDataOrHeader')] });
        setStep('result');
        return;
      }

      const headers = (json[0] as string[]).map(h => String(h || '').trim());
      const data = json
        .slice(1)
        .filter((row) =>
          (row as unknown[]).some((cell) => cell !== null && cell !== undefined && cell !== ''),
        );
      setSheetHeaders(headers);
      setSheetData(data as unknown[][]);

      // Auto-detect mapping — so khớp sau khi BỎ DẤU: file gõ "Ngay dang" vẫn
      // phải khớp cột "Ngày đăng", nếu không người dùng phải chọn tay từng cột.
      const autoMap: Record<string, string> = {};
      const normHeaders = headers.map((h) => ({ raw: h, norm: chuanHoaKhoaSoKhop(h) }));
      columns.forEach(col => {
        const target = chuanHoaKhoaSoKhop(col.label);
        if (!target) return;
        const match =
          normHeaders.find((h) => h.norm === target) ??
          normHeaders.find((h) => h.norm !== '' && (h.norm.includes(target) || target.includes(h.norm)));
        if (match) autoMap[col.key] = match.raw;
      });
      setMapping(autoMap);
      setStep('mapping');
    } catch {
      setResult({ ...emptyResult(), errors: [txt('shared.import.cannotReadFile')] });
      setStep('result');
    }
  }, [columns]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) parseFile(f);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) parseFile(f);
  };

  /** Gom dòng hợp lệ + lỗi sơ bộ. Dùng chung cho bước xem trước và bước ghi. */
  const collectRows = (): CollectedRows => {
    const errors: string[] = [];
    const errorRows: ImportErrorRow[] = [];
    const parsed: Record<string, unknown>[] = [];

    sheetData.forEach((row, rowIdx) => {
      const rowNum = rowIdx + 2;
      const originalData = buildOriginalRowData(row);
      const record: Record<string, unknown> = {};
      let hasError = false;

      columns.forEach(col => {
        const headerName = mapping[col.key];
        if (!headerName) return;
        const colIdx = sheetHeaders.indexOf(headerName);
        if (colIdx === -1) return;
        const value = row[colIdx];

        if (col.required && (value === null || value === undefined || value === '')) {
          const errMsg = txt('shared.import.rowEmptyField', { row: rowNum, column: col.label });
          errors.push(errMsg);
          errorRows.push({ rowNum, data: originalData, message: errMsg });
          hasError = true;
          return;
        }
        record[col.key] = value ?? '';
      });

      if (!hasError) {
        parsed.push({ ...record, [IMPORT_ROW_NUM_KEY]: rowNum });
      }
    });

    return { parsed, errors, errorRows };
  };

  /** Kiểm các lựa chọn của bước map trước khi động vào dữ liệu. */
  const validateOptions = (): string | null => {
    const unmapped = columns.filter(c => c.required && !mapping[c.key]);
    if (unmapped.length > 0) {
      return txt('shared.import.missingRequiredColumns', {
        columns: unmapped.map(c => c.label).join(', '),
      });
    }
    if (needsMatchKeys) {
      if (matchKeys.length === 0) return txt('shared.import.matchRequired');
      // Khoá tham chiếu mà không có trong file thì mọi dòng đều "không trùng" —
      // chế độ ghi đè sẽ âm thầm biến thành thêm mới hàng loạt.
      const missing = matchKeys.filter((k) => !mapping[k]);
      if (missing.length > 0) {
        return txt('shared.import.matchNotMapped', {
          columns: missing
            .map((k) => matchColumns?.find((c) => c.key === k)?.label ?? k)
            .join(', '),
        });
      }
    }
    return null;
  };

  const runImport = async (collected: CollectedRows) => {
    setImporting(true);
    try {
      let successCount = collected.parsed.length;
      let updatedCount = 0;
      let skippedCount = 0;
      let mergedErrors = collected.errors;
      let mergedErrorRows = collected.errorRows;

      if (collected.parsed.length > 0) {
        const importResult = await onImport(collected.parsed, runOptions);
        if (importResult) {
          successCount = importResult.created ?? collected.parsed.length;
          updatedCount = importResult.updated ?? 0;
          skippedCount = importResult.skipped ?? 0;
          if (importResult.errors?.length) {
            mergedErrors = [...mergedErrors, ...importResult.errors];
          }
          if (importResult.errorRows?.length) {
            mergedErrorRows = [...mergedErrorRows, ...importResult.errorRows];
          }
        }
      }

      setResult({
        success: successCount,
        updated: updatedCount,
        skipped: skippedCount,
        errors: mergedErrors.slice(0, 10),
        errorRows: mergedErrorRows,
      });
    } catch (err: unknown) {
      setResult({
        ...emptyResult(),
        errors: [getErrorMessage(err) || txt('shared.import.importError')],
        errorRows: collected.errorRows,
      });
    }
    setStep('result');
    setImporting(false);
  };

  /** Bấm nút chính ở bước map: có `onDryRun` thì xem trước, không thì ghi luôn. */
  const handleContinue = async () => {
    const optionProblem = validateOptions();
    if (optionProblem) {
      setOptionError(optionProblem);
      return;
    }
    setOptionError(null);
    const collected = collectRows();

    if (!onDryRun) {
      await runImport(collected);
      return;
    }

    setImporting(true);
    try {
      const preview = await onDryRun(collected.parsed, runOptions);
      setPendingRows(collected);
      setDryRun(preview);
      setStep('preview');
    } catch (err: unknown) {
      setOptionError(getErrorMessage(err) || txt('shared.import.dryRunFailed'));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    const mod = await import('xlsx');
    const XLSX = mod.default ?? mod;
    const ws = XLSX.utils.aoa_to_sheet([columns.map(c => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    if (templateSheets) {
      for (const sheet of templateSheets) {
        const wsRef = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
        XLSX.utils.book_append_sheet(wb, wsRef, sheet.name);
      }
    }
    XLSX.writeFile(wb, `${templateFileName}.xlsx`);
  };

  const downloadErrorRows = async () => {
    if (!result || result.errorRows.length === 0) return;
    const mod = await import('xlsx');
    const XLSX = mod.default ?? mod;
    const headers = [...sheetHeaders, txt('shared.import.errorColumnLabel')];
    const rows = result.errorRows.map((er) => [
      ...sheetHeaders.map((h) => {
        const colKey = Object.entries(mapping).find(([, v]) => v === h)?.[0];
        const val = colKey != null ? er.data[colKey] : er.data[h];
        return val != null && val !== '' ? String(val) : '';
      }),
      er.message,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lỗi');
    XLSX.writeFile(wb, `loi-import_${templateFileName}_${getTodayISODate()}.xlsx`);
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={handleClose}
        className="fixed inset-0 z-[60] bg-black/20"
      />
      {/* Dialog */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 30 }}
          className={cn("w-full bg-card rounded-2xl shadow-2xl border border-border pointer-events-auto flex flex-col max-h-[85vh]", DIALOG_SIZE.LARGE)}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Upload size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{txt('shared.import.title')}</h3>
                <p className="text-xs text-muted-foreground">{file ? file.name : txt('shared.import.subtitle')}</p>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <AnimatePresence mode="wait">
              {step === 'upload' && (
                <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => fileInputRef.current?.click()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    className={cn(
                      "border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors",
                      dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"
                    )}
                  >
                    <FileSpreadsheet size={40} className="mx-auto text-primary/40 mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">{txt('shared.import.dropHere')}</p>
                    <p className="text-xs text-muted-foreground mb-4">{txt('shared.import.orClickToSelect')}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                  <div className="mt-4 flex justify-center">
                    <button onClick={downloadTemplate} className="text-xs text-primary hover:underline flex items-center gap-1.5">
                      <Download size={13} /> {txt('shared.import.downloadTemplate')}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 'mapping' && (
                <motion.div key="mapping" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      {txt('shared.import.rowsRead', { count: sheetData.length })}
                    </p>
                  </div>

                  {availableModes.length > 1 && (
                    <div className="border border-border rounded-xl p-3 space-y-3">
                      <p className="text-xs font-medium text-foreground">{txt('shared.import.writeModeTitle')}</p>
                      <div className="space-y-2">
                        {availableModes.map((mode) => (
                          <div key={mode}>
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="radio"
                                name="import-write-mode"
                                className="accent-[hsl(var(--primary))]"
                                checked={writeMode === mode}
                                onChange={() => {
                                  setWriteMode(mode);
                                  setOptionError(null);
                                }}
                              />
                              <span className="text-xs font-medium text-foreground">
                                {txt(WRITE_MODE_TEXT[mode].label)}
                              </span>
                            </label>
                            <p className="text-[11px] text-muted-foreground pl-6">
                              {txt(WRITE_MODE_TEXT[mode].hint)}
                            </p>
                          </div>
                        ))}
                      </div>

                      {needsMatchKeys && matchColumns && matchColumns.length > 0 && (
                        <div className="pt-2 border-t border-border/60 space-y-2">
                          <p className="text-xs font-medium text-foreground">{txt('shared.import.matchTitle')}</p>
                          <div className="flex flex-wrap gap-3">
                            {matchColumns.map((col) => (
                              <label key={col.key} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  className="accent-[hsl(var(--primary))]"
                                  checked={matchKeys.includes(col.key)}
                                  onChange={(e) => {
                                    setOptionError(null);
                                    setMatchKeys((prev) =>
                                      e.target.checked
                                        ? matchColumns
                                            .map((c) => c.key)
                                            .filter((k) => k === col.key || prev.includes(k))
                                        : prev.filter((k) => k !== col.key),
                                    );
                                  }}
                                />
                                <span className="text-xs text-foreground">{col.label}</span>
                              </label>
                            ))}
                          </div>
                          <p className="text-[11px] text-muted-foreground">{txt('shared.import.matchHint')}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {optionError && (
                    <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-2">
                      {optionError}
                    </p>
                  )}

                  {/* Mapping table */}
                  <div className="border border-border rounded-xl overflow-x-auto">
                    <table
                      className="w-full text-xs"
                      style={{
                        minWidth: Math.max(480, columns.length * 160),
                        width: '100%',
                      }}
                    >
                      <thead>
                        <tr className="bg-muted/30 border-b border-border">
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">{txt('shared.import.systemColumn')}</th>
                          <th className="px-2 py-2 text-center w-8"><ArrowRight size={12} className="mx-auto text-muted-foreground/50" /></th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">{txt('shared.import.fileColumn')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50 [&>tr:last-child>td]:border-b [&>tr:last-child>td]:border-border/50">
                        {columns.map(col => (
                          <tr key={col.key} className="hover:bg-muted/20">
                            <td className="px-3 py-2">
                              <span className="font-medium text-foreground">{col.label}</span>
                              {col.required && <span className="text-destructive ml-1">*</span>}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <ArrowRight size={11} className="mx-auto text-muted-foreground/30" />
                            </td>
                            <td className="px-3 py-2 min-w-[8rem]">
                              <Combobox
                                options={mappingSelectOptions}
                                value={mapping[col.key] ?? ''}
                                onChange={(v) =>
                                  setMapping((prev) => ({
                                    ...prev,
                                    [col.key]: v === '' || v === null || v === undefined ? '' : String(v),
                                  }))
                                }
                                searchable={sheetHeaders.length > 8}
                                clearable={false}
                                dropdownInPortal
                                placeholder={txt('shared.import.skipColumn')}
                                className="w-full"
                                triggerClassName={cn(
                                  'h-7 min-h-7 text-xs py-0',
                                  mapping[col.key]
                                    ? 'border-primary/30 text-foreground'
                                    : 'border-border text-muted-foreground',
                                )}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Preview */}
                  {sheetData.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">{txt('shared.import.preview')}</p>
                      <div className="border border-border rounded-lg overflow-x-auto">
                        <table
                          className="w-full text-xs"
                          style={{
                            minWidth: Math.max(360, sheetHeaders.length * 96),
                            width: '100%',
                          }}
                        >
                          <thead>
                            <tr className="bg-muted/20">
                              {sheetHeaders.map((h, i) => (
                                <th key={i} className="px-2 py-1.5 text-left font-medium text-muted-foreground whitespace-nowrap border-b border-border">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sheetData.slice(0, 5).map((row, ri) => (
                              <tr key={ri} className="border-b border-border/30">
                                {sheetHeaders.map((_, ci) => (
                                  <td key={ci} className="px-2 py-1.5 text-foreground whitespace-nowrap max-w-[150px] truncate">
                                    {row[ci] != null && row[ci] !== '' ? (
                                      String(row[ci] as string | number | boolean)
                                    ) : (
                                      <span className="text-muted-foreground/40">--</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {step === 'preview' && dryRun && (
                <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <p className="text-xs font-medium text-foreground">{txt('shared.import.previewTitle')}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        [txt('shared.import.previewCreate'), dryRun.willCreate, 'text-primary'],
                        [txt('shared.import.previewUpdate'), dryRun.willUpdate, 'text-amber-600 dark:text-amber-400'],
                        [txt('shared.import.previewSkip'), dryRun.willSkip, 'text-muted-foreground'],
                      ] as const
                    ).map(([label, value, color]) => (
                      <div key={label} className="border border-border rounded-xl p-3 text-center">
                        <p className={cn('text-lg font-semibold tabular-nums', color)}>{value}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                  {dryRun.notes && dryRun.notes.length > 0 && (
                    <div className="text-left bg-muted/30 border border-border rounded-lg p-3 space-y-1">
                      {dryRun.notes.map((note, i) => (
                        <p key={i} className="text-xs text-muted-foreground">{note}</p>
                      ))}
                    </div>
                  )}
                  {pendingRows && pendingRows.errors.length > 0 && (
                    <div className="text-left bg-destructive/5 border border-destructive/20 rounded-lg p-3 max-h-[140px] overflow-y-auto custom-scrollbar">
                      {pendingRows.errors.slice(0, 10).map((err, i) => (
                        <p key={i} className="text-xs text-destructive py-0.5">{err}</p>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {step === 'result' && result && (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                  {result.success > 0 || result.updated > 0 ? (
                    <div className="space-y-3">
                      <CheckCircle2 size={48} className="mx-auto text-primary" />
                      <p className="text-sm font-semibold text-foreground">{txt('shared.import.success')}</p>
                      <div className="space-y-0.5">
                        <p className="text-xs text-muted-foreground">
                          {txt('shared.import.resultCreated', { count: result.success })}
                        </p>
                        {result.updated > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {txt('shared.import.resultUpdated', { count: result.updated })}
                          </p>
                        )}
                        {result.skipped > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {txt('shared.import.resultSkipped', { count: result.skipped })}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <AlertCircle size={48} className="mx-auto text-destructive" />
                      <p className="text-sm font-semibold text-foreground">{txt('shared.import.error')}</p>
                    </div>
                  )}
                  {result.errors.length > 0 && (
                    <div className="mt-4 text-left bg-destructive/5 border border-destructive/20 rounded-lg p-3 max-h-[150px] overflow-y-auto custom-scrollbar">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs text-destructive py-0.5">{err}</p>
                      ))}
                    </div>
                  )}
                  {result.errorRows.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void downloadErrorRows()}
                      className="text-xs text-destructive hover:underline flex items-center gap-1.5 mt-3 mx-auto"
                    >
                      <Download size={13} />
                      {txt('shared.import.downloadErrors', { count: result.errorRows.length })}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border flex items-center justify-between shrink-0">
            <Button variant="outline" onClick={handleClose} className="text-xs h-8">
              {step === 'result' ? txt('common.close') : txt('common.cancel')}
            </Button>
            <div className="flex gap-2">
              {step === 'mapping' && (
                <>
                  <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }} className="text-xs h-8">
                    {txt('common.selectFile')}
                  </Button>
                  <Button
                    onClick={() => void handleContinue()}
                    disabled={importing}
                    className="bg-primary text-white text-xs h-8 px-4"
                  >
                    {importing
                      ? txt('common.processing')
                      : onDryRun
                        ? txt('shared.import.continueLabel')
                        : txt('shared.import.importRows', { count: sheetData.length })}
                  </Button>
                </>
              )}
              {step === 'preview' && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => { setStep('mapping'); setDryRun(null); }}
                    disabled={importing}
                    className="text-xs h-8"
                  >
                    {txt('common.back')}
                  </Button>
                  <Button
                    onClick={() => pendingRows && void runImport(pendingRows)}
                    disabled={importing || !pendingRows}
                    className="bg-primary text-white text-xs h-8 px-4"
                  >
                    {importing ? txt('shared.import.previewChecking') : txt('shared.import.previewConfirm')}
                  </Button>
                </>
              )}
              {step === 'result' && result && (result.success > 0 || result.updated > 0) && (
                <Button onClick={handleClose} className="bg-primary text-white text-xs h-8 px-4">
                  {txt('common.finish')}
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default ImportDialog;
