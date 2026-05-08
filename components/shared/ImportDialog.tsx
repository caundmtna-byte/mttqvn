import React, { useState, useRef, useCallback, useMemo } from 'react';
import { txt } from '../../lib/text';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Download, ArrowRight } from 'lucide-react';
import Button from '../ui/Button';
import { cn, getErrorMessage } from '../../lib/utils';
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

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  columns: ImportColumn[];
  onImport: (data: Record<string, unknown>[]) => Promise<void>;
  templateFileName?: string;
  /** Extra reference sheets appended after the main Template sheet in the downloaded file. */
  templateSheets?: ImportTemplateSheet[];
}

type Step = 'upload' | 'mapping' | 'result';

const ImportDialog: React.FC<ImportDialogProps> = ({
  open, onClose, columns, onImport, templateFileName = 'template', templateSheets,
}) => {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sheetHeaders, setSheetHeaders] = useState<string[]>([]);
  const [sheetData, setSheetData] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[] } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  };

  const handleClose = () => {
    reset();
    onClose();
  };

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
        setResult({ success: 0, errors: [txt('shared.import.noDataOrHeader')] });
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

      // Auto-detect mapping
      const autoMap: Record<string, string> = {};
      columns.forEach(col => {
        const match = headers.find(h =>
          h.toLowerCase() === col.label.toLowerCase() ||
          h.toLowerCase().includes(col.label.toLowerCase()) ||
          col.label.toLowerCase().includes(h.toLowerCase())
        );
        if (match) autoMap[col.key] = match;
      });
      setMapping(autoMap);
      setStep('mapping');
    } catch {
      setResult({ success: 0, errors: [txt('shared.import.cannotReadFile')] });
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

  const handleImport = async () => {
    setImporting(true);
    const errors: string[] = [];
    const parsed: Record<string, unknown>[] = [];

    // Validate required columns are mapped
    const unmapped = columns.filter(c => c.required && !mapping[c.key]);
    if (unmapped.length > 0) {
      setResult({ success: 0, errors: [txt('shared.import.missingRequiredColumns', { columns: unmapped.map(c => c.label).join(', ') })] });
      setStep('result');
      setImporting(false);
      return;
    }

    sheetData.forEach((row, rowIdx) => {
      const record: Record<string, unknown> = {};
      let hasError = false;

      columns.forEach(col => {
        const headerName = mapping[col.key];
        if (!headerName) return;
        const colIdx = sheetHeaders.indexOf(headerName);
        if (colIdx === -1) return;
        const value = row[colIdx];

        if (col.required && (value === null || value === undefined || value === '')) {
          errors.push(txt('shared.import.rowEmptyField', { row: rowIdx + 2, column: col.label }));
          hasError = true;
          return;
        }
        record[col.key] = value ?? '';
      });

      if (!hasError) parsed.push(record);
    });

    try {
      if (parsed.length > 0) await onImport(parsed);
      setResult({ success: parsed.length, errors: errors.slice(0, 10) });
    } catch (err: unknown) {
      setResult({ success: 0, errors: [getErrorMessage(err) || txt('shared.import.importError')] });
    }
    setStep('result');
    setImporting(false);
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

              {step === 'result' && result && (
                <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
                  {result.success > 0 ? (
                    <div className="space-y-3">
                      <CheckCircle2 size={48} className="mx-auto text-primary" />
                      <p className="text-sm font-semibold text-foreground">{txt('shared.import.success')}</p>
                      <p className="text-xs text-muted-foreground">{txt('shared.import.successCount', { count: result.success })}</p>
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
                    onClick={handleImport}
                    disabled={importing}
                    className="bg-primary text-white text-xs h-8 px-4"
                  >
                    {importing ? txt('common.processing') : txt('shared.import.importRows', { count: sheetData.length })}
                  </Button>
                </>
              )}
              {step === 'result' && result && result.success > 0 && (
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
