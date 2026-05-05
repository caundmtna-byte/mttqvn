
import React, { useState, useEffect } from 'react';
import { txt } from '../../../../lib/text';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Save, Check, Star, Briefcase, Minus } from 'lucide-react';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import { roleSchema, RoleFormValues } from '../core/schema';
import { PositionPermission, ModulePermission, ActionType } from '../core/types';
import { SYSTEM_MODULES_CONFIG, getModuleName } from '../services/phan-quyen-service';
import { useCreateRole } from '../hooks/use-phan-quyen';
import GenericDrawer, { DRAWER_WIDTH_FORM } from '../../../../components/shared/GenericDrawer';

interface Props {
  initialData?: PositionPermission | null;
  onClose: () => void;
}

const RoleForm: React.FC<Props> = ({ initialData, onClose }) => {
  const isEdit = !!initialData;

  // Tập hợp tất cả các cột hành động có thể xuất hiện trong hệ thống
  const ALL_ACTION_COLUMNS: {id: ActionType, label: string, isSpecial?: boolean}[] = [
    { id: 'view', label: txt('permission.form.view') },
    { id: 'create', label: txt('permission.form.add') },
    { id: 'update', label: txt('permission.form.edit') },
    { id: 'delete', label: txt('permission.form.delete') },
    { id: 'approve', label: txt('permission.form.approve'), isSpecial: true },
    { id: 'export', label: txt('permission.form.export') },
    { id: 'import', label: txt('permission.form.import') },
  ];
  const createMutation = useCreateRole(onClose);
  
  const [permissions, setPermissions] = useState<ModulePermission[]>(
      SYSTEM_MODULES_CONFIG.map(m => ({ module_id: m.id, module_name: getModuleName(m.id), actions: [] }))
  );

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { ma_vai_tro: '', ten_vai_tro: '', mo_ta: '', trang_thai: 'Đang hoạt động' }
  });

  useEffect(() => {
    if (initialData) {
      reset({
        ma_vai_tro: initialData.ma_chuc_vu,
        ten_vai_tro: initialData.ten_chuc_vu,
        mo_ta: initialData.mo_ta || '',
        trang_thai: initialData.trang_thai,
      });
      queueMicrotask(() => setPermissions(initialData.quyen_han));
    }
  }, [initialData, reset]);

  const toggleAction = (moduleId: string, action: ActionType) => {
      setPermissions(prev => prev.map(p => {
          if (p.module_id === moduleId) {
              const hasAction = p.actions.includes(action);
              return {
                  ...p,
                  actions: hasAction ? p.actions.filter(a => a !== action) : [...p.actions, action]
              };
          }
          return p;
      }));
  };

  const toggleFullModule = (moduleId: string) => {
      const config = SYSTEM_MODULES_CONFIG.find(m => m.id === moduleId);
      if (!config) return;

      setPermissions(prev => prev.map(p => {
          if (p.module_id === moduleId) {
              const isFull = p.actions.length === config.allowedActions.length;
              return {
                  ...p,
                  actions: isFull ? [] : [...config.allowedActions]
              };
          }
          return p;
      }));
  };

  const onSubmit = (data: RoleFormValues) => {
    createMutation.mutate({ data, permissions });
  };

  const renderFooter = (
      <>
          <Button variant="outline" size="lg" onClick={onClose} className="flex-1 border-border h-11 sm:h-12">{txt('common.cancelAction')}</Button>
          <Button type="submit" form="role-form" isLoading={createMutation.isPending} size="lg" className="flex-[2] bg-primary text-white shadow-lg h-11 sm:h-12">
            <Save className="mr-2 h-4 w-4" /> {isEdit ? txt('permission.form.update') : txt('permission.form.create')}
          </Button>
      </>
  );

  return (
    <GenericDrawer
        title={isEdit ? txt('permission.form.editTitle') : txt('permission.form.createTitle')}
        subtitle={txt('permission.form.subtitle')}
        icon={<Briefcase size={20} />}
        onClose={onClose}
        footer={renderFooter}
        maxWidthClass={DRAWER_WIDTH_FORM}
    >
          <form id="role-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
             <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm space-y-4">
                <h4 className="text-xs font-medium text-muted-foreground border-b border-border pb-2">{txt('permission.form.infoSection')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label={txt('permission.form.codeLabel')} placeholder={txt('permission.form.codePlaceholder')} {...register('ma_vai_tro')} error={errors.ma_vai_tro?.message} />
                    <Input label={txt('permission.form.nameLabel')} placeholder={txt('permission.form.namePlaceholder')} {...register('ten_vai_tro')} error={errors.ten_vai_tro?.message} />
                </div>
             </div>

             <div className="bg-card p-4 sm:p-5 rounded-xl border border-border shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                        <h4 className="text-sm font-semibold text-foreground">{txt('permission.form.matrixTitle')}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{txt('permission.form.matrixHint')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                            <span className="w-2.5 h-2.5 rounded bg-primary"></span> {txt('permission.form.legendAction')}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                            <span className="w-2.5 h-2.5 rounded bg-amber-500"></span> {txt('permission.form.legendApproval')}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto -mx-5 sm:mx-0">
                    <table className="w-full text-sm border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-muted/50">
                                <th className="py-3 text-left font-medium text-xs text-muted-foreground px-4 rounded-tl-xl border-b border-border">{txt('permission.form.moduleHeader')}</th>
                                {ALL_ACTION_COLUMNS.map(a => (
                                    <th key={a.id} className="py-3 text-center font-medium text-xs text-muted-foreground border-b border-border">{a.label}</th>
                                ))}
                                <th className="py-3 text-center font-medium text-xs text-muted-foreground px-4 rounded-tr-xl border-b border-border">{txt('permission.form.all')}</th>
                            </tr>
                        </thead>
                            <tbody className="divide-y divide-border/50 [&>tr:last-child>td]:border-b [&>tr:last-child>td]:border-border/50">
                            {SYSTEM_MODULES_CONFIG.map((moduleConfig) => {
                                const userPerm = permissions.find(p => p.module_id === moduleConfig.id);
                                const isFull = userPerm?.actions.length === moduleConfig.allowedActions.length && moduleConfig.allowedActions.length > 0;
                                
                                return (
                                    <tr key={moduleConfig.id} className="hover:bg-muted/50 transition-colors group">
                                        <td className="py-4 px-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground text-xs group-hover:text-primary transition-colors">{txt(moduleConfig.nameKey)}</span>
                                                <span className="text-xs text-muted-foreground font-mono">{moduleConfig.id}</span>
                                            </div>
                                        </td>
                                        {ALL_ACTION_COLUMNS.map(col => {
                                            const isAllowed = moduleConfig.allowedActions.includes(col.id);
                                            const isChecked = userPerm?.actions.includes(col.id);
                                            
                                            if (!isAllowed) {
                                                return (
                                                    <td key={col.id} className="py-4 text-center">
                                                        <div className="flex justify-center text-muted-foreground/70">
                                                            <Minus size={14} />
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            return (
                                                <td key={col.id} className="py-4 text-center px-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleAction(moduleConfig.id, col.id)}
                                                        className={`w-6 h-6 mx-auto rounded-md border flex items-center justify-center transition-all ${
                                                            isChecked 
                                                            ? col.isSpecial ? 'bg-amber-500 border-amber-500 text-white shadow-sm ring-2 ring-amber-100' : 'bg-primary border-primary text-white shadow-sm' 
                                                            : 'bg-card border-border text-muted-foreground/70 hover:border-primary/50 hover:text-primary/50'
                                                        }`}
                                                    >
                                                        {isChecked ? (
                                                            col.isSpecial ? <Star size={10} fill="white" /> : <Check size={12} strokeWidth={4} />
                                                        ) : (
                                                            <div className="w-1 h-1 rounded-full bg-current opacity-30"></div>
                                                        )}
                                                    </button>
                                                </td>
                                            )
                                        })}
                                        <td className="py-4 text-center px-4">
                                            <button
                                                type="button"
                                                onClick={() => toggleFullModule(moduleConfig.id)}
                                                className={`text-xs px-2 py-1 rounded-full font-medium transition-all border ${
                                                    isFull 
                                                    ? 'bg-foreground border-foreground text-background' 
                                                    : 'bg-card border-border text-muted-foreground hover:border-border/80 hover:text-foreground'
                                                }`}
                                            >
                                                {isFull ? 'All' : 'Set'}
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
             </div>
          </form>
    </GenericDrawer>
  );
};

export default RoleForm;
