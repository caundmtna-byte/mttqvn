import React, { useState } from 'react';
import { txt } from '../../../../lib/text';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  Save, Building2, MapPin, Phone, Mail, Globe, Image as ImageIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import SingleImageInput from '../../../../components/ui/SingleImageInput';
import { companySchema } from '../core/schema';
import type { CompanyFormValues } from '../core/types';
import { useCan } from '@/hooks/use-can';
import { validateHttpLogoUrl, LOGO_PUBLIC_ID } from '@/lib/cloudinary/upload-logo';
import { CLOUDINARY_FOLDERS } from '@/lib/cloudinary/upload-image';

export interface ThongTinToChucFormProps {
  initialValues: CompanyFormValues & { appLogo?: string | null };
  onSubmit: (data: CompanyFormValues & { appLogo: string | null }) => void;
}

const ThongTinToChucForm: React.FC<ThongTinToChucFormProps> = ({ initialValues, onSubmit }) => {
  const canEdit = useCan('edit', 'company');
  const initialLogo = initialValues.appLogo ?? null;
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogo);
  const [logoUrlInput, setLogoUrlInput] = useState(
    initialLogo?.startsWith('http') ? initialLogo : '',
  );

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      appName: initialValues.appName,
      appDescription: initialValues.appDescription ?? '',
      companyName: initialValues.companyName,
      address: initialValues.address ?? '',
      phone: initialValues.phone ?? '',
      email: initialValues.email ?? '',
      website: initialValues.website ?? '',
    },
  });

  const applyLogoUrl = () => {
    const trimmed = logoUrlInput.trim();
    if (!trimmed) {
      setLogoPreview(null);
      return;
    }
    const urlError = validateHttpLogoUrl(trimmed);
    if (urlError) {
      toast.error(urlError);
      return;
    }
    setLogoPreview(trimmed);
  };

  const onFormSubmit = async (data: CompanyFormValues) => {
    if (!canEdit) return;
    let appLogo = logoPreview;
    const trimmedUrl = logoUrlInput.trim();
    if (trimmedUrl) {
      const urlError = validateHttpLogoUrl(trimmedUrl);
      if (urlError) {
        toast.error(urlError);
        return;
      }
      appLogo = trimmedUrl;
    }
    await onSubmit({ ...data, appLogo });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="min-w-0">
      <fieldset disabled={!canEdit} className="grid grid-cols-1 md:grid-cols-3 gap-6 border-0 p-0 m-0 min-w-0 disabled:opacity-80">
      <div className="md:col-span-1 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-5 rounded-xl border border-border shadow-sm"
        >
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-primary" /> {txt('company.brandSection')}
          </h3>

          <div className="space-y-4">
            <SingleImageInput
              value={logoPreview}
              onChange={(v) => {
                setLogoPreview(v);
                if (v) setLogoUrlInput('');
              }}
              cloudinaryFolder={CLOUDINARY_FOLDERS.branding}
              cloudinaryPublicId={LOGO_PUBLIC_ID}
              shape="rounded"
              aspectRatio="1/1"
              placeholder={txt('company.upload')}
              hint={txt('company.imageHint')}
              maxSizeMB={2}
              disabled={!canEdit}
            />

            <div className="space-y-1">
              <Input
                label={txt('company.logoUrl')}
                placeholder={txt('company.logoUrlPlaceholder')}
                icon={<Globe className="w-4 h-4 text-muted-foreground" />}
                value={logoUrlInput}
                onChange={(e) => setLogoUrlInput(e.target.value)}
                onBlur={applyLogoUrl}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    applyLogoUrl();
                  }
                }}
              />
              <p className="text-xs text-muted-foreground italic">{txt('company.logoUrlHint')}</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="space-y-1">
                <Input
                  label={txt('company.appName')}
                  placeholder={txt('company.appNamePlaceholder')}
                  {...register('appName')}
                  error={errors.appName?.message}
                />
                <p className="text-xs text-muted-foreground italic">{txt('company.appNameHint')}</p>
              </div>
              <div className="space-y-1">
                <Input
                  label={txt('company.appDescription')}
                  placeholder={txt('company.appDescPlaceholder')}
                  {...register('appDescription')}
                  error={errors.appDescription?.message}
                />
                <p className="text-xs text-muted-foreground italic">{txt('company.appDescHint')}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="md:col-span-2 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-5 rounded-xl border border-border shadow-sm"
        >
          <h3 className="font-semibold text-foreground mb-6 flex items-center gap-2 border-b border-border pb-3">
            <Building2 className="w-4 h-4 text-muted-foreground" /> {txt('company.legalSection')}
          </h3>

          <div className="grid gap-5">
            <div className="grid md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <Input
                  label={txt('company.companyName')}
                  placeholder={txt('company.companyNamePlaceholder')}
                  icon={<Building2 className="w-4 h-4 text-muted-foreground" />}
                  {...register('companyName')}
                  error={errors.companyName?.message}
                />
              </div>
              <Input
                label={txt('company.phone')}
                placeholder={txt('company.phonePlaceholder')}
                icon={<Phone className="w-4 h-4 text-muted-foreground" />}
                {...register('phone')}
                error={errors.phone?.message}
              />
              <Input
                label={txt('company.email')}
                placeholder={txt('company.emailPlaceholder')}
                icon={<Mail className="w-4 h-4 text-muted-foreground" />}
                {...register('email')}
                error={errors.email?.message}
              />
              <Input
                label={txt('company.website')}
                placeholder={txt('company.websitePlaceholder')}
                icon={<Globe className="w-4 h-4 text-muted-foreground" />}
                {...register('website')}
                error={errors.website?.message}
              />
              <div className="md:col-span-2">
                <Input
                  label={txt('company.address')}
                  placeholder={txt('company.addressPlaceholder')}
                  icon={<MapPin className="w-4 h-4 text-muted-foreground" />}
                  {...register('address')}
                  error={errors.address?.message}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-end pt-2"
        >
          {canEdit && (
          <Button type="submit" size="lg" className="w-full md:w-auto shadow-lg shadow-primary/20" isLoading={isSubmitting}>
            <Save className="w-4 h-4 mr-2" /> {txt('company.saveButton')}
          </Button>
          )}
        </motion.div>
      </div>
      </fieldset>
    </form>
  );
};

export default ThongTinToChucForm;
